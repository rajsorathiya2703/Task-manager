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

async function seedTeamMemberGroup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  const employeeModulePermissions = [
    { module: 'tasks', create: true, read: true, update: true, delete: true, scope: 'own' },
    { module: 'projects', create: true, read: true, update: true, delete: false, scope: 'own' },
    { module: 'teams', create: true, read: true, update: true, delete: false, scope: 'team' },
    { module: 'employees', create: false, read: true, update: false, delete: false, scope: 'own' },
    { module: 'dayoff', create: true, read: true, update: true, delete: true, scope: 'own' },
    { module: 'reports', create: false, read: true, update: false, delete: false, scope: 'own' },
    { module: 'settings', create: false, read: false, update: false, delete: false, scope: 'own' },
    { module: 'users', create: false, read: false, update: false, delete: false, scope: 'own' },
    { module: 'user-groups', create: false, read: false, update: false, delete: false, scope: 'own' },
  ];

  const employeePermissions = [
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
    'projects:create', 'projects:read', 'projects:update',
    'teams:create', 'teams:read', 'teams:update',
    'employees:read', 'employees:view',
    'dayoff:create', 'dayoff:read', 'dayoff:update', 'dayoff:delete',
    'reports:read', 'reports:view',
  ];

  const employeeOperationPermissions = [
    // Tasks: time tracking (start/stop timer), comments (add, edit, delete), assignment (assign back)
    { module: 'tasks', operation: 'tasks.core', read: true, write: true, update: true, delete: true },
    { module: 'tasks', operation: 'tasks.comments', read: true, write: true, update: true, delete: true },
    { module: 'tasks', operation: 'tasks.attachments', read: true, write: true, update: true, delete: true },
    { module: 'tasks', operation: 'tasks.time_tracking', read: true, write: true, update: true, delete: true },
    { module: 'tasks', operation: 'tasks.assignment', read: true, write: true, update: true, delete: true },
    // Projects
    { module: 'projects', operation: 'projects.core', read: true, write: true, update: true, delete: false },
    { module: 'projects', operation: 'projects.milestones', read: true, write: true, update: true, delete: false },
    { module: 'projects', operation: 'projects.team', read: true, write: true, update: true, delete: false },
    { module: 'projects', operation: 'projects.documents', read: true, write: true, update: true, delete: false },
    // Employees
    { module: 'employees', operation: 'employees.directory', read: true, write: false, update: false, delete: false },
    { module: 'employees', operation: 'employees.profile', read: true, write: false, update: false, delete: false },
    { module: 'employees', operation: 'employees.compensation', read: false, write: false, update: false, delete: false },
    { module: 'employees', operation: 'employees.status', read: true, write: false, update: false, delete: false },
    // Teams
    { module: 'teams', operation: 'teams.core', read: true, write: true, update: true, delete: false },
    { module: 'teams', operation: 'teams.members', read: true, write: true, update: true, delete: false },
    { module: 'teams', operation: 'teams.leads', read: true, write: true, update: true, delete: false },
    // Day Off
    { module: 'dayoff', operation: 'dayoff.requests', read: true, write: true, update: true, delete: true },
    { module: 'dayoff', operation: 'dayoff.calendar', read: true, write: false, update: false, delete: false },
    { module: 'dayoff', operation: 'dayoff.approvals', read: false, write: false, update: false, delete: false },
    { module: 'dayoff', operation: 'dayoff.policies', read: false, write: false, update: false, delete: false },
    // Reports
    { module: 'reports', operation: 'reports.view', read: true, write: false, update: false, delete: false },
    { module: 'reports', operation: 'reports.export', read: false, write: false, update: false, delete: false },
    { module: 'reports', operation: 'reports.timesheets', read: true, write: false, update: false, delete: false },
    // Users & User-groups (Strictly no access)
    { module: 'users', operation: 'users.manage', read: false, write: false, update: false, delete: false },
    { module: 'users', operation: 'users.core', read: false, write: false, update: false, delete: false },
    { module: 'user-groups', operation: 'user-groups.manage', read: false, write: false, update: false, delete: false },
    { module: 'user-groups', operation: 'user-groups.core', read: false, write: false, update: false, delete: false },
    // Settings
    { module: 'settings', operation: 'settings.users', read: false, write: false, update: false, delete: false },
    { module: 'settings', operation: 'settings.user_groups', read: false, write: false, update: false, delete: false },
    { module: 'settings', operation: 'settings.system', read: false, write: false, update: false, delete: false },
  ];

  const employeeFieldPermissions = [
    { model: 'employees', field: 'baseSalary', read: false, write: false, update: false, delete: false },
    { model: 'employees', field: 'currency', read: false, write: false, update: false, delete: false },
    { model: 'employees', field: 'payFrequency', read: false, write: false, update: false, delete: false },
    { model: 'employees', field: 'bankAccountNumber', read: false, write: false, update: false, delete: false },
    { model: 'employees', field: 'bankRoutingNumber', read: false, write: false, update: false, delete: false },
    { model: 'employees', field: 'taxId', read: false, write: false, update: false, delete: false },
  ];

  const col = mongoose.connection.collection('usergroups');
  const existing = await col.findOne({ name: { $regex: /^team member$/i } });

  if (existing) {
    console.log('Team Member group already exists with ID:', existing._id);
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          permissions: employeePermissions,
          modulePermissions: employeeModulePermissions,
          operationPermissions: employeeOperationPermissions,
          fieldPermissions: employeeFieldPermissions,
        }
      }
    );
    console.log('Updated Team Member group permissions successfully.');
  } else {
    const res = await col.insertOne({
      name: 'Team Member',
      description: 'Team member group with access to start/stop assigned task timers, manage task comments, assign back tasks, and standard employee permissions',
      color: '#10b981',
      members: [],
      permissions: employeePermissions,
      modulePermissions: employeeModulePermissions,
      operationPermissions: employeeOperationPermissions,
      fieldPermissions: employeeFieldPermissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created Team Member group with ID:', res.insertedId);
  }

  const allGroups = await col.find({}, { projection: { name: 1, color: 1 } }).toArray();
  console.log('Current user groups in DB:');
  allGroups.forEach(g => console.log(`- ${g.name} (${g.color || 'no color'})`));

  await mongoose.disconnect();
}

seedTeamMemberGroup().catch((err) => {
  console.error('Error seeding Team Member group:', err);
  process.exit(1);
});
