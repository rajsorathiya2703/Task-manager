export type ModuleKey =
  | 'tasks'
  | 'projects'
  | 'employees'
  | 'teams'
  | 'dayoff'
  | 'reports'
  | 'settings'
  | 'users'
  | 'user-groups';

export type ActionKey = 'create' | 'read' | 'update' | 'delete';

export type ScopeKey = 'own' | 'team' | 'all';

export type OperationActionKey = 'read' | 'write' | 'update' | 'delete';

export type PermissionsStatus = 'loading' | 'ready' | 'error';

export interface ActionPerms {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface FieldPerms {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

export interface EffectivePermissionsResponse {
  groups: string[];
  permissions: string[];
  modulePermissions: Record<string, ActionPerms>;
  moduleScopes: Record<string, ScopeKey>;
  operationPermissions: Record<string, ActionPerms>;
  fieldPermissions: Record<string, Record<string, FieldPerms>>;
  version: string;
}

export interface PermissionsContextType {
  status: PermissionsStatus;
  isReady: boolean;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  groups: string[];
  modulePermissions: Record<string, ActionPerms>;
  moduleScopes: Record<string, ScopeKey>;
  operationPermissions: Record<string, ActionPerms>;
  fieldPermissions: Record<string, Record<string, FieldPerms>>;
  version: string;
  refreshPermissions: (opts?: { silent?: boolean }) => Promise<void>;
  can: (module: ModuleKey | string, action: ActionKey) => boolean;
  canOperation: (operation: string, action: ActionKey | 'write') => boolean;
  canField: (model: string, field: string, action: ActionKey | 'write') => boolean;
  scopeOf: (module: ModuleKey | string) => ScopeKey;
  isFieldEditable: (model: string, field: string) => boolean;
  showAccessDenied: (message?: string, title?: string) => void;
  closeAccessDenied: () => void;
}
