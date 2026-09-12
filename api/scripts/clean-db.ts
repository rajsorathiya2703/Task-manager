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

async function cleanFullDatabase() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  console.log(`Connected to database: "${db.databaseName}"`);
  console.log('--- Cleaning full database (all collections) ---');

  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.log('No collections found in database.');
  } else {
    for (const col of collections) {
      const collectionName = col.name;
      const countBefore = await db.collection(collectionName).countDocuments();
      const result = await db.collection(collectionName).deleteMany({});
      console.log(
        `Collection "${collectionName}": Deleted ${result.deletedCount} documents (previously had ${countBefore}).`
      );
    }
  }

  console.log('Database cleanup completed successfully!');
  await mongoose.disconnect();
}

cleanFullDatabase().catch((err) => {
  console.error('Error cleaning database:', err);
  process.exit(1);
});
