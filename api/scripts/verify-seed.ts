import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

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

async function verify() {
  await mongoose.connect(uri);
  const rolesCollection = mongoose.connection.collection('roles');
  const policyCollection = mongoose.connection.collection('policy_documents');
  const usersCollection = mongoose.connection.collection('users');

  const roleCount = await rolesCollection.countDocuments();
  console.log(`db.roles.countDocuments() = ${roleCount}`);

  const roles = await rolesCollection.find({}).sort({ priority: -1 }).toArray();
  for (const r of roles) {
    console.log(`  Role: ${r.name.padEnd(15)} (slug: ${r.slug}, priority: ${r.priority}) members: ${r.members?.length ?? 0}`);
  }

  const sysAdmin = await rolesCollection.findOne({ slug: 'system-admin' });
  console.log('\nSystem Admin members:');
  console.log(sysAdmin?.members);

  const adminUsers = await usersCollection.find({ is_system_admin: { $ne: false } }).toArray();
  console.log('\nUsers with is_system_admin !== false:');
  for (const u of adminUsers) {
    console.log(`  User: ${u._id} (email: ${u.email || u.name}, is_system_admin: ${u.is_system_admin})`);
  }

  const policyCount = await policyCollection.countDocuments();
  console.log(`\ndb.policy_documents.countDocuments() = ${policyCount}`);
  const latestPolicy = await policyCollection.findOne({}, { sort: { version: -1 } });
  console.log(`  Latest policy version: ${latestPolicy?.version}, hash: ${latestPolicy?.hash?.slice(0, 16)}..., roles: ${latestPolicy?.roles?.length}`);

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
