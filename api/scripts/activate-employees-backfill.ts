import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';
import { escapeRegExp } from '../src/common/utils/escape-regexp';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore DNS override errors
}

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx !== -1) {
        const key = trimmed.slice(0, equalsIdx).trim();
        const value = trimmed.slice(equalsIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

async function runBackfill() {
  loadEnv();

  const isExecute = process.argv.includes('--execute');
  const isDryRun = !isExecute || process.argv.includes('--dry-run');

  console.log('='.repeat(70));
  console.log(`EMPLOYEE MEMBERSHIP ACTIVATION BACKFILL (BUG-02)`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no database changes)' : 'EXECUTE (live updates)'}`);
  console.log('='.repeat(70));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const employeesCol = db.collection('employees');
  const usersCol = db.collection('users');
  const membershipsCol = db.collection('memberships');
  const rolesCol = db.collection('roles');

  const employees = await employeesCol
    .find({ email: { $exists: true, $ne: null } })
    .toArray();

  console.log(`Found ${employees.length} employee records with email.\n`);

  let scanned = 0;
  let matchingUsersFound = 0;
  let unlinkedCount = 0;
  let missingMembershipCount = 0;
  let activatedCount = 0;

  for (const emp of employees) {
    scanned++;
    const emailStr = String(emp.email).trim();
    if (!emailStr) continue;

    const emailRe = new RegExp(`^${escapeRegExp(emailStr)}$`, 'i');
    const user = await usersCol.findOne({ email: emailRe });

    if (!user) {
      continue;
    }
    matchingUsersFound++;

    const isUnlinked = !emp.userId;
    const isLinkedToDifferentUser = emp.userId && String(emp.userId) !== String(user._id);

    if (isLinkedToDifferentUser) {
      console.log(
        `[SKIP] Employee ${emp._id} (${emailStr}) already linked to different user ${emp.userId} (user._id: ${user._id})`,
      );
      continue;
    }

    const membership = await membershipsCol.findOne({
      companyId: emp.companyId,
      userId: user._id,
    });

    const needsActivation = isUnlinked || !membership;

    if (isUnlinked) unlinkedCount++;
    if (!membership) missingMembershipCount++;

    if (!needsActivation) {
      continue;
    }

    if (isDryRun) {
      console.log(
        `[DRY-RUN] Would activate Employee ${emp._id} (${emailStr}) in company ${emp.companyId}: ` +
          `link userId=${user._id}, ensure active Membership + default employee role.`,
      );
    } else {
      // 1. Link employee userId if unlinked
      if (isUnlinked) {
        await employeesCol.updateOne(
          { _id: emp._id },
          { $set: { userId: user._id } },
        );
      }

      // 2. Resolve default employee role in this company
      let defaultRoleId: Types.ObjectId | undefined;
      const roleDoc = await rolesCol.findOne({
        $or: [{ companyId: emp.companyId }, { companyId: null }, { companyId: { $exists: false } }],
        slug: 'employee',
        isActive: true,
      });

      if (roleDoc) {
        defaultRoleId = roleDoc._id as Types.ObjectId;
        await rolesCol.updateOne(
          { _id: roleDoc._id },
          { $addToSet: { members: user._id } },
        );
      }

      const roleIdsToAdd = defaultRoleId ? [defaultRoleId] : [];

      // 3. Upsert / update membership
      if (membership) {
        await membershipsCol.updateOne(
          { _id: membership._id },
          {
            $set: {
              employeeId: emp._id,
              status: 'active',
            },
            ...(defaultRoleId ? { $addToSet: { roleIds: defaultRoleId } } : {}),
          },
        );
      } else {
        await membershipsCol.insertOne({
          companyId: emp.companyId,
          userId: user._id,
          employeeId: emp._id,
          roleIds: roleIdsToAdd,
          isCompanyOwner: false,
          isSystemAdmin: false,
          status: 'active',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 4. Update user.is_employee
      await usersCol.updateOne(
        { _id: user._id },
        { $set: { is_employee: true } },
      );

      console.log(
        `[ACTIVATED] Employee ${emp._id} (${emailStr}) in company ${emp.companyId} for user ${user._id}.`,
      );
    }

    activatedCount++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY`);
  console.log(`  Employees scanned:             ${scanned}`);
  console.log(`  Matching users found:          ${matchingUsersFound}`);
  console.log(`  Unlinked employee records:     ${unlinkedCount}`);
  console.log(`  Missing company memberships:   ${missingMembershipCount}`);
  console.log(
    `  Total ${isDryRun ? 'eligible for activation' : 'successfully activated'}: ${activatedCount}`,
  );
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

runBackfill().catch((err) => {
  console.error('Backfill script failed:', err);
  process.exit(1);
});
