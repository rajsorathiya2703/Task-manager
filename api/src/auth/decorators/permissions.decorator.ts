import { SetMetadata } from '@nestjs/common';
import type { ModuleKey } from '../../permissions/permission-catalog';

export interface PermissionRequirement {
  /** Must be a key from PERMISSION_CATALOG. */
  module: ModuleKey;
  action: 'create' | 'read' | 'update' | 'delete';
  /** Model name for field-level checks (e.g. 'tasks', 'employees'). Defaults to module. */
  model?: string;
  /** Operation key for operation-level checks (e.g. 'tasks.comments', 'dayoff.approvals'). */
  operation?: string;
}

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export const RequirePermission = (requirement: PermissionRequirement) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, requirement);
