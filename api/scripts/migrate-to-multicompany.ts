import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';

// Fallback DNS for resolving MongoDB Atlas SRV records
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if unable to override DNS servers
}

// Schemas
import { Company, CompanySchema } from '../src/companies/schemas/company.schema';
import { Membership, MembershipSchema } from '../src/companies/schemas/membership.schema';
import { Employee, EmployeeSchema } from '../src/employees/schemas/employee.schema';
import { Task, TaskSchema } from '../src/tasks/schemas/task.schema';
import { Project, ProjectSchema } from '../src/projects/schemas/project.schema';
import { Team, TeamSchema } from '../src/teams/schemas/team.schema';
import { LeaveType, LeaveTypeSchema } from '../src/day-off/schemas/leave-type.schema';
import { LeaveApplication, LeaveApplicationSchema } from '../src/day-off/schemas/leave-application.schema';
import { LeaveBalance, LeaveBalanceSchema } from '../src/day-off/schemas/leave-balance.schema';
import { DayOffSettings, DayOffSettingsSchema } from '../src/day-off/schemas/day-off-settings.schema';
import { Notification, NotificationSchema } from '../src/day-off/schemas/notification.schema';
import { User, UserSchema } from '../src/users/schemas/user.schema';
import { generateSecretCode, hashSecretCode } from '../src/companies/secret-code.util';

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
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
}

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  const prefix = `${flag}=`;
  const matching = process.argv.find((arg) => arg.startsWith(prefix));
  if (matching) {
    return matching.slice(prefix.length);
  }
  return undefined;
}

interface CollectionMigrationReport {
  collection: string;
  totalBefore: number;
  missingCompanyIdBefore: number;
  updated: number;
  missingCompanyIdAfter: number;
}

async function runMigration() {
  loadEnv();

  const isDryRun = process.argv.includes('--dry-run');

  const defaultCompanyName =
    getCliArg('--company-name') || process.env.DEFAULT_COMPANY_NAME || 'Default Company';

  const defaultOwnerEmail =
    getCliArg('--owner-email') || process.env.DEFAULT_OWNER_EMAIL;

  console.log('========================================================================');
  console.log('       MULTI-COMPANY (MULTI-TENANT) DATABASE MIGRATION SCRIPT           ');
  console.log('========================================================================');
  if (isDryRun) {
    console.log('⚠️  MODE: DRY-RUN (Simulation only — NO changes will be written to DB)');
  } else {
    console.log('⚡ MODE: LIVE EXECUTION (Changes WILL be applied to database)');
  }
  console.log(`Default Company Name : "${defaultCompanyName}"`);
  console.log(`Default Owner Email : "${defaultOwnerEmail || '(not set)'}"`);
  console.log('========================================================================\n');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables or .env file.');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }
  console.log(`Connected to database: "${db.databaseName}"\n`);

  // Models
  const CompanyModel = mongoose.models.Company || mongoose.model<Company>('Company', CompanySchema);
  const MembershipModel = mongoose.models.Membership || mongoose.model<Membership>('Membership', MembershipSchema);
  const EmployeeModel = mongoose.models.Employee || mongoose.model<Employee>('Employee', EmployeeSchema);
  const TaskModel = mongoose.models.Task || mongoose.model<Task>('Task', TaskSchema);
  const ProjectModel = mongoose.models.Project || mongoose.model<Project>('Project', ProjectSchema);
  const TeamModel = mongoose.models.Team || mongoose.model<Team>('Team', TeamSchema);
  const LeaveTypeModel = mongoose.models.LeaveType || mongoose.model<LeaveType>('LeaveType', LeaveTypeSchema);
  const LeaveApplicationModel = mongoose.models.LeaveApplication || mongoose.model<LeaveApplication>('LeaveApplication', LeaveApplicationSchema);
  const LeaveBalanceModel = mongoose.models.LeaveBalance || mongoose.model<LeaveBalance>('LeaveBalance', LeaveBalanceSchema);
  const DayOffSettingsModel = mongoose.models.DayOffSettings || mongoose.model<DayOffSettings>('DayOffSettings', DayOffSettingsSchema);
  const NotificationModel = mongoose.models.Notification || mongoose.model<Notification>('Notification', NotificationSchema);
  const UserModel = mongoose.models.User || mongoose.model<User>('User', UserSchema);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Find or Create 'default' Company
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Step 1: Locating or creating default company ("default")...');

  const cleanOwnerEmail = (defaultOwnerEmail || '').trim().toLowerCase();
  if (!cleanOwnerEmail) {
    throw new Error(
      'DEFAULT_OWNER_EMAIL environment variable is required (or pass --owner-email <email>). It must match an existing user in the database.'
    );
  }

  const ownerUser = await UserModel.findOne({
    email: { $regex: new RegExp(`^${cleanOwnerEmail}$`, 'i') },
  });

  if (!ownerUser) {
    throw new Error(
      `DEFAULT_OWNER_EMAIL "${cleanOwnerEmail}" does not match any existing user in the database. Please verify the email and try again.`
    );
  }

  console.log(`✓ Verified owner user: "${ownerUser.name || cleanOwnerEmail}" (${cleanOwnerEmail}, ID: ${ownerUser._id})`);

  let defaultCompany = await CompanyModel.findOne({ slug: 'default' }).select('+secretCodeHash');
  let defaultCompanyId: mongoose.Types.ObjectId;

  if (defaultCompany) {
    defaultCompanyId = defaultCompany._id as mongoose.Types.ObjectId;
    console.log(`✓ Existing default company found: "${defaultCompany.name}" (ID: ${defaultCompanyId})`);
  } else {
    defaultCompanyId = new mongoose.Types.ObjectId();
    const plainSecretCode = generateSecretCode();
    const secretCodeHash = await hashSecretCode(plainSecretCode);

    if (isDryRun) {
      console.log(`[DRY-RUN] Would create default company with:`);
      console.log(`   Name        : "${defaultCompanyName}"`);
      console.log(`   Slug        : "default"`);
      console.log(`   Owner ID    : ${ownerUser._id}`);
      console.log(`   Secret Code : ${plainSecretCode} (simulated)`);
    } else {
      defaultCompany = await CompanyModel.create({
        _id: defaultCompanyId,
        name: defaultCompanyName,
        slug: 'default',
        secretCodeHash,
        ownerUserId: ownerUser._id,
        status: 'active',
        settings: {
          requireCodeOnEveryLogin: false,
        },
      });

      console.log(`\n========================================================================`);
      console.log(`  DEFAULT COMPANY CREATED SUCCESSFULLY:`);
      console.log(`  Name        : ${defaultCompany.name}`);
      console.log(`  Slug        : default`);
      console.log(`  Company ID  : ${defaultCompanyId}`);
      console.log(`  SECRET CODE : ${plainSecretCode}`);
      console.log(`  IMPORTANT   : STORE THIS SECRET CODE SECURELY. IT IS STORED AS A`);
      console.log(`                BCRYPT HASH AND CANNOT BE VIEWED AGAIN.`);
      console.log(`========================================================================\n`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Backfill companyId on Docs Missing It
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nStep 2: Backfilling companyId on collections missing it...');

  const targetCollections: Array<{ name: string; model: mongoose.Model<any> }> = [
    { name: 'tasks', model: TaskModel },
    { name: 'projects', model: ProjectModel },
    { name: 'teams', model: TeamModel },
    { name: 'employees', model: EmployeeModel },
    { name: 'leavetypes', model: LeaveTypeModel },
    { name: 'leaveapplications', model: LeaveApplicationModel },
    { name: 'leavebalances', model: LeaveBalanceModel },
    { name: 'dayoffsettings', model: DayOffSettingsModel },
    { name: 'notifications', model: NotificationModel },
  ];

  const migrationReports: CollectionMigrationReport[] = [];

  for (const target of targetCollections) {
    const rawCollection = target.model.collection;
    const totalBefore = await rawCollection.countDocuments({});
    const missingBefore = await rawCollection.countDocuments({ companyId: { $exists: false } });

    let updatedCount = 0;
    if (!isDryRun && missingBefore > 0) {
      const updateResult = await rawCollection.updateMany(
        { companyId: { $exists: false } },
        { $set: { companyId: defaultCompanyId } }
      );
      updatedCount = updateResult.modifiedCount;
    } else if (isDryRun) {
      updatedCount = missingBefore;
    }

    const missingAfter = isDryRun
      ? 0
      : await rawCollection.countDocuments({ companyId: { $exists: false } });

    migrationReports.push({
      collection: target.name,
      totalBefore,
      missingCompanyIdBefore: missingBefore,
      updated: updatedCount,
      missingCompanyIdAfter: missingAfter,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Create Memberships for Qualifying Users
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nStep 3: Creating memberships in default company for qualifying users...');

  const allUsers = await UserModel.find({});
  let membershipsCreated = 0;
  let membershipsExisting = 0;
  let employeesLinked = 0;

  for (const user of allUsers) {
    const userObjectId = user._id as mongoose.Types.ObjectId;

    // Check if user has an Employee record by userId or email
    let employee = await EmployeeModel.findOne({ userId: userObjectId });
    if (!employee && user.email) {
      employee = await EmployeeModel.findOne({
        email: { $regex: new RegExp(`^${user.email.trim()}$`, 'i') },
      });
    }

    const isEmployeeFlag = Boolean((user as any).is_employee);
    const hasEmployeeRecord = Boolean(employee);
    const isOwner = userObjectId.equals(ownerUser._id as mongoose.Types.ObjectId);

    if (hasEmployeeRecord || isEmployeeFlag || isOwner) {
      const existingMembership = await MembershipModel.findOne({
        userId: userObjectId,
        companyId: defaultCompanyId,
      });

      if (existingMembership) {
        membershipsExisting++;
        if (!isDryRun) {
          let modified = false;
          if (isOwner && !existingMembership.isCompanyOwner) {
            existingMembership.isCompanyOwner = true;
            modified = true;
          }
          if (employee && !existingMembership.employeeId) {
            existingMembership.employeeId = employee._id as mongoose.Types.ObjectId;
            modified = true;
          }
          if (modified) {
            await existingMembership.save();
          }
        }
      } else {
        membershipsCreated++;
        if (isDryRun) {
          console.log(`[DRY-RUN] Would create membership for User: ${user.email || user.name || user._id} (Owner: ${isOwner}, SysAdmin: ${Boolean((user as any).is_system_admin)}, EmployeeId: ${employee?._id || 'none'})`);
        } else {
          await MembershipModel.create({
            userId: userObjectId,
            companyId: defaultCompanyId,
            employeeId: employee?._id,
            roleIds: [],
            isCompanyOwner: isOwner,
            isSystemAdmin: Boolean((user as any).is_system_admin),
            status: 'active',
            joinedAt: new Date(),
          });
        }
      }

      // Link employee.userId if matched by email and not yet set
      if (employee && !employee.userId && !isDryRun) {
        employee.userId = userObjectId;
        await employee.save();
        employeesLinked++;
      }
    }
  }

  console.log(`✓ Memberships check complete: ${membershipsExisting} existing, ${membershipsCreated} ${isDryRun ? 'would be created' : 'created'}.`);
  if (employeesLinked > 0) {
    console.log(`✓ Linked ${employeesLinked} employee record(s) with corresponding user account IDs.`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Indexes Verification & Update
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nStep 4: Managing indexes and dropping legacy unique constraints...');

  const employeeIndexes = await EmployeeModel.collection.indexes();
  const legacyEmailIndex = employeeIndexes.find((idx) => idx.name === 'email_1');

  if (legacyEmailIndex) {
    if (isDryRun) {
      console.log(`[DRY-RUN] Found legacy global unique index 'email_1' on employees collection. Would drop it.`);
    } else {
      console.log(`Dropping legacy global unique index 'email_1' on employees collection...`);
      await EmployeeModel.collection.dropIndex('email_1');
      console.log(`✓ Successfully dropped legacy index 'email_1'.`);
    }
  } else {
    console.log(`✓ Legacy unique index 'email_1' is not present on employees collection.`);
  }

  if (isDryRun) {
    console.log(`[DRY-RUN] Would ensure compound tenant indexes exist on all models (syncIndexes).`);
  } else {
    console.log(`Synchronizing compound tenant indexes across affected models...`);
    const modelsToSync: Array<{ name: string; model: mongoose.Model<any> }> = [
      { name: 'Company', model: CompanyModel },
      { name: 'Membership', model: MembershipModel },
      { name: 'Employee', model: EmployeeModel },
      { name: 'Task', model: TaskModel },
      { name: 'Project', model: ProjectModel },
      { name: 'Team', model: TeamModel },
      { name: 'LeaveType', model: LeaveTypeModel },
      { name: 'LeaveBalance', model: LeaveBalanceModel },
      { name: 'LeaveApplication', model: LeaveApplicationModel },
      { name: 'DayOffSettings', model: DayOffSettingsModel },
      { name: 'Notification', model: NotificationModel },
    ];

    for (const m of modelsToSync) {
      try {
        await m.model.syncIndexes();
        console.log(`✓ Indexes synchronized for ${m.name}`);
      } catch (err: any) {
        console.warn(`⚠️ Warning: syncIndexes on ${m.name} encountered:`, err.message);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Migration Summary & Orphan Integrity Checks
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n========================================================================');
  console.log('                     MIGRATION SUMMARY PER COLLECTION                   ');
  console.log('========================================================================');
  console.table(
    migrationReports.map((r) => ({
      Collection: r.collection,
      'Total Docs': r.totalBefore,
      'Missing companyId (Before)': r.missingCompanyIdBefore,
      [isDryRun ? 'Would Update' : 'Updated']: r.updated,
      'Missing companyId (After)': r.missingCompanyIdAfter,
    }))
  );

  console.log('\n--- Checking Data Integrity & Orphan References ---');
  const orphanWarnings: string[] = [];

  // Check 1: Tasks referencing missing projects
  const allProjectIds = new Set(
    (await ProjectModel.find({}).select('_id').lean()).map((p) => p._id.toString())
  );
  const tasksWithProjects = await TaskModel.find({ projectId: { $exists: true, $ne: null } })
    .select('title projectId')
    .lean();

  for (const t of tasksWithProjects) {
    if (t.projectId && !allProjectIds.has(t.projectId.toString())) {
      orphanWarnings.push(
        `Task "${t.title || 'Untitled'}" (${t._id}) references non-existent project ${t.projectId}`
      );
    }
  }

  // Check 2: Tasks referencing missing assignees
  const allEmployeeIds = new Set(
    (await EmployeeModel.find({}).select('_id').lean()).map((e) => e._id.toString())
  );
  const tasksWithAssignees = await TaskModel.find({ assignee: { $exists: true, $ne: null } })
    .select('title assignee')
    .lean();

  for (const t of tasksWithAssignees) {
    if (t.assignee && !allEmployeeIds.has(t.assignee.toString())) {
      orphanWarnings.push(
        `Task "${t.title || 'Untitled'}" (${t._id}) references non-existent assignee ${t.assignee}`
      );
    }
  }

  // Check 3: Teams referencing missing members or teamLead
  const allTeams = await TeamModel.find({}).select('name members teamLead').lean();
  for (const tm of allTeams) {
    if (tm.teamLead && !allEmployeeIds.has(tm.teamLead.toString())) {
      orphanWarnings.push(
        `Team "${tm.name}" (${tm._id}) references non-existent teamLead ${tm.teamLead}`
      );
    }
    if (Array.isArray(tm.members)) {
      for (const memId of tm.members) {
        if (memId && !allEmployeeIds.has(memId.toString())) {
          orphanWarnings.push(
            `Team "${tm.name}" (${tm._id}) member ${memId} does not exist in employees collection`
          );
        }
      }
    }
  }

  // Check 4: Leave applications referencing missing employees or leave types
  const allLeaveTypeIds = new Set(
    (await LeaveTypeModel.find({}).select('_id').lean()).map((lt) => lt._id.toString())
  );
  const allLeaveApps = await LeaveApplicationModel.find({}).select('reason employeeId leaveTypeId').lean();
  for (const la of allLeaveApps) {
    if (la.employeeId && !allEmployeeIds.has(la.employeeId.toString())) {
      orphanWarnings.push(
        `LeaveApplication "${la.reason}" (${la._id}) references non-existent employee ${la.employeeId}`
      );
    }
    if (la.leaveTypeId && !allLeaveTypeIds.has(la.leaveTypeId.toString())) {
      orphanWarnings.push(
        `LeaveApplication "${la.reason}" (${la._id}) references non-existent leaveType ${la.leaveTypeId}`
      );
    }
  }

  // Check 5: Employees referencing missing users
  const allUserIds = new Set(
    (await UserModel.find({}).select('_id').lean()).map((u) => u._id.toString())
  );
  const employeesWithUserId = await EmployeeModel.find({ userId: { $exists: true, $ne: null } })
    .select('fullName userId')
    .lean();

  for (const emp of employeesWithUserId) {
    if (emp.userId && !allUserIds.has(emp.userId.toString())) {
      const name = `${emp.fullName?.firstName || ''} ${emp.fullName?.lastName || ''}`.trim();
      orphanWarnings.push(
        `Employee "${name}" (${emp._id}) references non-existent userId ${emp.userId}`
      );
    }
  }

  if (orphanWarnings.length === 0) {
    console.log('✓ No orphan references detected across tasks, projects, teams, leave, or employees.');
  } else {
    console.warn(`\n⚠️  Found ${orphanWarnings.length} orphan references:`);
    orphanWarnings.slice(0, 50).forEach((w) => console.warn(`   - ${w}`));
    if (orphanWarnings.length > 50) {
      console.warn(`   ... and ${orphanWarnings.length - 50} additional warnings omitted.`);
    }
  }

  console.log('\n========================================================================');
  if (isDryRun) {
    console.log('✓ DRY-RUN COMPLETED SUCCESSFULLY — NO DATABASE WRITES PERFORMED.');
  } else {
    console.log('✓ MIGRATION COMPLETED SUCCESSFULLY.');
  }
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  mongoose.disconnect().finally(() => process.exit(1));
});
