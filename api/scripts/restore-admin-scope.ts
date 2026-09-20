import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

// Fallback DNS for resolving MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if unable to override DNS servers
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

async function restoreAdminScope() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established.');
    }

    const collection = db.collection('usergroups');
    const adminGroup = await collection.findOne({ name: { $regex: /^administrators$/i } });

    if (!adminGroup) {
      console.log('No "Administrators" group found in database.');
      return;
    }

    console.log(`Found "Administrators" group (${adminGroup._id}). Checking module scopes...`);

    const modulePermissions = adminGroup.modulePermissions || [];
    let updatedCount = 0;

    const updatedModulePermissions = modulePermissions.map((mp: any) => {
      if (mp.scope !== 'all') {
        updatedCount++;
        return { ...mp, scope: 'all' };
      }
      return mp;
    });

    if (updatedCount > 0) {
      await collection.updateOne(
        { _id: adminGroup._id },
        { $set: { modulePermissions: updatedModulePermissions } },
      );
      console.log(`Successfully updated ${updatedCount} modules to scope: 'all' for Administrators group.`);
    } else {
      console.log('All modules in Administrators group already have scope: "all". No update needed.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  restoreAdminScope()
    .then(() => {
      console.log('Restore script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error running restore-admin-scope:', err);
      process.exit(1);
    });
}

export { restoreAdminScope };
