import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { buildDefaultRoles } from '../src/access/access.seed';
import { compile, CompiledPolicyDocument } from '../src/access/policy.compiler';
import { MODULE_CATALOG } from '../src/access/catalog';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const envPath = path.resolve(__dirname, '../.env');
const content = fs.readFileSync(envPath, 'utf8');
let uri = '';
for (const line of content.split(/\r?\n/)) {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.replace('MONGODB_URI=', '').trim();
  }
}

async function repairCompanyRoles() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const companies = await db.collection('companies').find({}).toArray();
  console.log(`Starting company roles audit and repair across ${companies.length} companies...\n`);

  for (const c of companies) {
    const compId = c._id;
    const roles = await db.collection('roles').find({ companyId: compId }).toArray();
    const policyDocs = await db.collection('policy_documents').find({ companyId: compId }).toArray();

    const hasBrokenRoles = roles.length === 0 || roles.some((r) => !r.moduleGrants || r.moduleGrants.length === 0);
    const hasMissingPolicy = policyDocs.length === 0;

    if (!hasBrokenRoles && !hasMissingPolicy) {
      console.log(`[SKIPPED] "${c.name}" (${c.slug}) is already healthy (${roles.length} roles, ${policyDocs.length} policy docs). No changes made.`);
      continue;
    }

    console.log(`[HEALING] "${c.name}" (${c.slug}) - Roles: ${roles.length}, BrokenGrants: ${hasBrokenRoles}, PolicyDocs: ${policyDocs.length}`);

    // Find owner membership
    const ownerMembership = await db.collection('memberships').findOne({
      companyId: compId,
      isCompanyOwner: true,
    });

    const adminUserIds = ownerMembership ? [ownerMembership.userId] : [];

    // Delete existing broken skeleton roles for this company
    await db.collection('roles').deleteMany({ companyId: compId });

    // Build the official 5 default roles with full MODULE_CATALOG grants
    const rolesToInsert = buildDefaultRoles(adminUserIds).map((r) => ({
      ...r,
      companyId: compId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertResult = await db.collection('roles').insertMany(rolesToInsert);
    const insertedRoles = await db.collection('roles').find({ companyId: compId }).toArray();

    const sysAdminRole = insertedRoles.find((r) => r.slug === 'system-admin');
    const employeeRole = insertedRoles.find((r) => r.slug === 'employee');

    // Update owner membership
    if (ownerMembership && sysAdminRole) {
      await db.collection('memberships').updateOne(
        { _id: ownerMembership._id },
        { $set: { roleIds: [sysAdminRole._id] } },
      );
    }

    // Update non-owner members to employee role if they have no role
    if (employeeRole) {
      await db.collection('memberships').updateMany(
        {
          companyId: compId,
          isCompanyOwner: { $ne: true },
          $or: [{ roleIds: { $size: 0 } }, { roleIds: { $exists: false } }],
        },
        { $set: { roleIds: [employeeRole._id] } },
      );
    }

    // Compile and persist policy document
    const latestDoc = await db.collection('policy_documents')
      .findOne({ companyId: compId }, { sort: { version: -1 } });
    const prevVersion = latestDoc?.version ?? 0;

    const compiled = compile(insertedRoles as any, MODULE_CATALOG, prevVersion);

    await db.collection('policy_documents').insertOne({
      ...compiled,
      companyId: compId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`  -> Successfully repaired "${c.name}"! Created 5 default roles with 12 module grants and compiled policy doc v${compiled.version}.\n`);
  }

  console.log('Company roles audit and repair complete.');
  await mongoose.disconnect();
  process.exit(0);
}

repairCompanyRoles().catch((err) => {
  console.error('Repair failed:', err);
  process.exit(1);
});
