import { SetMetadata } from '@nestjs/common';

export interface PermissionRequirement {
  module: string; // 'tasks' | 'projects' | 'employees' | 'teams' | 'reports' | 'settings' | 'users' | 'user-groups'
  action: 'create' | 'read' | 'update' | 'delete';
  model?: string; // e.g. 'tasks', 'projects', 'employees', 'teams'
}

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export const RequirePermission = (requirement: PermissionRequirement) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, requirement);
