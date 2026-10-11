import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

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

async function runMigration() {
  loadEnv();

  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(70));
  console.log(`EMPLOYEE INDEX MIGRATION (BUG-09): {email} -> {companyId, email}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no database changes)' : 'EXECUTE (live index migration)'}`);
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

  console.log('\n--- Step 1: Checking for duplicate (companyId, email) pairs ---');

  const duplicateGroups = await employeesCol
    .aggregate([
      {
        $match: {
          companyId: { $exists: true, $ne: null },
          email: { $exists: true, $ne: null, $type: 'string' },
        },
      },
      {
        $project: {
          companyId: 1,
          emailLower: { $toLower: '$email' },
          fullName: 1,
          status: 1,
        },
      },
      {
        $group: {
          _id: { companyId: '$companyId', email: '$emailLower' },
          count: { $sum: 1 },
          docs: {
            $push: {
              _id: '$_id',
              fullName: '$fullName',
              status: '$status',
            },
          },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  if (duplicateGroups.length > 0) {
    console.error(`\n[ABORT] Found ${duplicateGroups.length} duplicate (companyId, email) pair(s)!`);
    console.error('Cannot create unique index until duplicates are resolved manually:\n');
    for (const group of duplicateGroups) {
      console.error(
        `  Company: ${group._id.companyId} | Email: ${group._id.email} | Count: ${group.count}`,
      );
      for (const d of group.docs) {
        console.error(`    - Doc ID: ${d._id}, Status: ${d.status}, Name:`, d.fullName);
      }
    }
    console.error('\nNo indexes were modified or dropped. Please resolve duplicates before re-running.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('No duplicate (companyId, email) pairs found. Safe to proceed.\n');

  console.log('--- Step 2: Ensuring compound unique index { companyId: 1, email: 1 } ---');
  const existingIndexes = await employeesCol.indexes();
  console.log('Current indexes on employees collection:');
  for (const idx of existingIndexes) {
    console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
  }

  const hasCompoundIndex = existingIndexes.some(
    (idx) =>
      idx.key &&
      idx.key.companyId === 1 &&
      idx.key.email === 1 &&
      idx.unique === true,
  );

  if (hasCompoundIndex) {
    console.log('\nCompound unique index { companyId: 1, email: 1 } already exists.');
  } else if (isDryRun) {
    console.log('\n[DRY-RUN] Would create compound unique index: { companyId: 1, email: 1 }');
  } else {
    console.log('\nCreating compound unique index: { companyId: 1, email: 1 }...');
    const createdIndexName = await employeesCol.createIndex(
      { companyId: 1, email: 1 },
      {
        name: 'companyId_1_email_1',
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
      },
    );
    console.log(`Successfully created index: ${createdIndexName}`);
  }

  console.log('\n--- Step 3: Dropping legacy global unique index email_1 ---');
  const legacyEmailIndex = existingIndexes.find((idx) => idx.name === 'email_1');

  if (!legacyEmailIndex) {
    console.log('Legacy unique index "email_1" does not exist (already dropped).');
  } else if (isDryRun) {
    console.log('[DRY-RUN] Would drop legacy unique index: email_1');
  } else {
    console.log('Dropping legacy index "email_1"...');
    await employeesCol.dropIndex('email_1');
    console.log('Successfully dropped legacy unique index "email_1".');
  }

  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION SUMMARY');
  console.log(`  Duplicate pairs detected:       0`);
  console.log(`  Compound index {companyId, email}: ${hasCompoundIndex || !isDryRun ? 'ACTIVE' : 'READY TO CREATE'}`);
  console.log(`  Legacy index email_1:           ${legacyEmailIndex && !isDryRun ? 'DROPPED' : legacyEmailIndex ? 'PRESENT (to drop)' : 'NOT PRESENT'}`);
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
