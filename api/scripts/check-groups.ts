import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

try {
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

async function run() {
  console.log('Connecting to:', uri.split('@')[1] || 'db');
  await mongoose.connect(uri);
  const groups = await mongoose.connection.collection('usergroups').find({}).toArray();
  console.log('Found groups count:', groups.length);
  for (const g of groups) {
    console.log('Group:', g.name, 'Members:', (g.members || []).length);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
