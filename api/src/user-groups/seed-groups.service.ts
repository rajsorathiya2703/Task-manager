import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserGroup } from './schemas/user-group.schema';
import { MODULE_KEYS } from '../permissions/permission-catalog';

/**
 * Seeds the two default user groups on application startup:
 *
 * 1. **Administrators** — full CRUD on every module, scope 'all'.
 * 2. **Employee** — baseline permissions (tasks/projects CRUD own-scope,
 *    employees read-only, reports read-only, dayoff apply own-scope).
 *
 * Idempotent: does nothing if the groups already exist (matched by name).
 */
@Injectable()
export class SeedGroupsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedGroupsService.name);

  constructor(
    @InjectModel(UserGroup.name) private userGroupModel: Model<UserGroup>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdministrators();
    await this.seedEmployee();
  }

  private async seedAdministrators() {
    const existing = await this.userGroupModel.findOne({ name: 'Administrators' }).exec();
    if (existing) {
      this.logger.log('Administrators group already exists — skipping seed.');
      return;
    }

    const modulePermissions = MODULE_KEYS.map((mod) => ({
      module: mod,
      create: true,
      read: true,
      update: true,
      delete: true,
      scope: 'all',
    }));

    await this.userGroupModel.create({
      name: 'Administrators',
      description: 'Full access to all modules with global scope.',
      color: '#dc2626',
      members: [],
      permissions: [],
      modulePermissions,
      operationPermissions: [],
      fieldPermissions: [],
    });

    this.logger.log('Seeded "Administrators" user group.');
  }

  private async seedEmployee() {
    const existing = await this.userGroupModel.findOne({ name: 'Employee' }).exec();
    if (existing) {
      this.logger.log('Employee group already exists — skipping seed.');
      return;
    }

    const modulePermissions = [
      { module: 'tasks', create: true, read: true, update: true, delete: true, scope: 'own' },
      { module: 'projects', create: true, read: true, update: true, delete: true, scope: 'own' },
      { module: 'employees', create: false, read: true, update: false, delete: false, scope: 'own' },
      { module: 'teams', create: false, read: true, update: false, delete: false, scope: 'own' },
      { module: 'dayoff', create: true, read: true, update: false, delete: false, scope: 'own' },
      { module: 'reports', create: false, read: true, update: false, delete: false, scope: 'own' },
    ];

    // Dayoff: allow applying, deny approvals and policy management
    const operationPermissions = [
      { module: 'dayoff', operation: 'dayoff.apply', read: true, write: true, update: true, delete: false },
      { module: 'dayoff', operation: 'dayoff.approvals', read: false, write: false, update: false, delete: false },
      { module: 'dayoff', operation: 'dayoff.policies', read: false, write: false, update: false, delete: false },
    ];

    // Sensitive employee fields: deny read/write
    const fieldPermissions = [
      { model: 'employees', field: 'baseSalary', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'bankAccountNumber', read: false, write: false, update: false, delete: false },
      { model: 'employees', field: 'taxId', read: false, write: false, update: false, delete: false },
    ];

    await this.userGroupModel.create({
      name: 'Employee',
      description: 'Default group for all new users. Basic task and project access.',
      color: '#6366f1',
      members: [],
      permissions: [],
      modulePermissions,
      operationPermissions,
      fieldPermissions,
    });

    this.logger.log('Seeded "Employee" user group.');
  }
}
