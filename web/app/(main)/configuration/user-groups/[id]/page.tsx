"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, Save, Check, X, Loader2,
  Users, Shield, ArrowLeft, Trash2, Sliders,
  Eye, Edit3, PlusCircle, Trash, CheckSquare, Layers,
  FolderKanban, UserCheck, CalendarOff, BarChart3, Settings,
  Search, History, ChevronLeft, ChevronRight, Info, ExternalLink,
  Lock, Unlock, AlertTriangle
} from "lucide-react";
import { useSidebar } from "../../../../../src/components/layout/SidebarContext";
import {
  fetchUserGroupById,
  fetchUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  fetchUsers,
  fetchPermissionsCatalog,
  fetchGroupAuditLogs,
  fetchUserEffectivePermissions,
} from "../../../../../src/lib/api";
import { RecordNavigator } from "../../../../../src/components/common/RecordNavigator";
import Link from "next/link";

const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

export const ICON_MAP: Record<string, any> = {
  CheckSquare,
  FolderKanban,
  UserCheck,
  Users,
  CalendarOff,
  BarChart3,
  Settings,
  Shield,
  Layers,
};

export const getModuleIcon = (icon: any) => {
  if (!icon) return Layers;
  if (typeof icon === "string") {
    return ICON_MAP[icon] || Layers;
  }
  return icon;
};

export interface ModuleDef {
  key: string;
  label: string;
  desc: string;
  icon: any;
}

const DEFAULT_MODULE_DEFS: ModuleDef[] = [
  { key: "tasks", label: "Tasks Management", desc: "Create, assign, track, and complete tasks", icon: CheckSquare },
  { key: "projects", label: "Projects Management", desc: "Organize project timelines, teams, and milestones", icon: FolderKanban },
  { key: "employees", label: "Employees & HR", desc: "Manage employee profiles, contact info, and compensation", icon: UserCheck },
  { key: "teams", label: "Teams Management", desc: "Create teams, assign team leads, and coordinate members", icon: Users },
  { key: "dayoff", label: "Time Off & Leaves", desc: "Manage leave policies, approvals, calendar, and applications", icon: CalendarOff },
  { key: "reports", label: "Reports & Analytics", desc: "Access business reports, timeline summaries, and dashboards", icon: BarChart3 },
  { key: "users", label: "Users Management", desc: "Manage user logins, authentication, and accounts", icon: UserCheck },
  { key: "user-groups", label: "User Groups & Roles", desc: "Configure access groups and permission policies", icon: Users },
  { key: "settings", label: "System Administration", desc: "Configure global preferences and settings", icon: Settings },
];
export const MODULE_DEFS = DEFAULT_MODULE_DEFS;

export interface OperationDef {
  key: string;
  module: string;
  label: string;
  desc: string;
  category: string;
}

const DEFAULT_OPERATION_DEFS: OperationDef[] = [
  // Tasks Operations
  { key: "tasks.core", module: "tasks", label: "Task Records", desc: "Create, view, update, and delete core task items", category: "Records" },
  { key: "tasks.comments", module: "tasks", label: "Comments & Discussions", desc: "Post, view, edit, and delete discussion comments on tasks", category: "Collaboration" },
  { key: "tasks.attachments", module: "tasks", label: "Attachments & Files", desc: "Upload, preview, download, and delete task document attachments", category: "Resources" },
  { key: "tasks.time_tracking", module: "tasks", label: "Time Tracking & Timers", desc: "Start/stop task timers and log billable work hours", category: "Execution" },
  { key: "tasks.assignment", module: "tasks", label: "Task Assignment & Members", desc: "Assign employees, change assignees, and invite members", category: "Workflow" },

  // Projects Operations
  { key: "projects.core", module: "projects", label: "Project Records", desc: "Create, view, modify, and delete projects", category: "Records" },
  { key: "projects.milestones", module: "projects", label: "Milestones & Timelines", desc: "Configure project start dates, target deadlines, and status", category: "Planning" },
  { key: "projects.team", module: "projects", label: "Team Allocation", desc: "Assign teams and project leaders to projects", category: "Resources" },
  { key: "projects.documents", module: "projects", label: "Project Files & Notes", desc: "Manage project documentation, assets, and discussion notes", category: "Collaboration" },

  // Employees Operations
  { key: "employees.directory", module: "employees", label: "Employee Directory", desc: "Access the employee roster and search employee profiles", category: "Directory" },
  { key: "employees.profile", module: "employees", label: "Profile Information", desc: "Manage personal details, contact numbers, and addresses", category: "Personal" },
  { key: "employees.compensation", module: "employees", label: "Compensation & Payroll", desc: "View and edit confidential salaries, bank info, and tax IDs", category: "Payroll" },
  { key: "employees.status", module: "employees", label: "Employment Lifecycle", desc: "Manage job roles, departments, active status, and termination", category: "Employment" },

  // Teams Operations
  { key: "teams.core", module: "teams", label: "Team Profiles", desc: "Create, view, edit, and delete teams", category: "Records" },
  { key: "teams.members", module: "teams", label: "Team Members", desc: "Add, remove, and manage members within teams", category: "Membership" },
  { key: "teams.leads", module: "teams", label: "Team Leadership", desc: "Assign and reassign designated team leads", category: "Leadership" },

  // Time Off / Leaves Operations
  { key: "dayoff.requests", module: "dayoff", label: "Leave Requests", desc: "Submit, view, edit, and cancel employee time off requests", category: "Requests" },
  { key: "dayoff.approvals", module: "dayoff", label: "Leave Approvals", desc: "Review, approve, or reject employee leave applications", category: "Approvals" },
  { key: "dayoff.policies", module: "dayoff", label: "Leave Policies & Types", desc: "Create, configure quotas, paid rules, and allocate balances", category: "Policies" },
  { key: "dayoff.calendar", module: "dayoff", label: "Leave Calendar & Balances", desc: "View the team holiday calendar and available day-off balances", category: "Calendar" },

  // Reports Operations
  { key: "reports.view", module: "reports", label: "Analytics & Dashboards", desc: "View visual performance metrics, velocity charts, and summaries", category: "Analytics" },
  { key: "reports.export", module: "reports", label: "Data Export", desc: "Export records and reports to CSV, Excel, or PDF", category: "Export" },
  { key: "reports.timesheets", module: "reports", label: "Timesheet Logs", desc: "Audit employee work logs, tracked timers, and project hours", category: "Auditing" },

  // Users Operations
  { key: "users.manage", module: "users", label: "User Accounts", desc: "Create, view, update, and manage user login credentials", category: "Security" },
  { key: "users.core", module: "users", label: "User Records", desc: "Core user account operations", category: "Security" },

  // User Groups Operations
  { key: "user-groups.manage", module: "user-groups", label: "User Groups & Roles", desc: "Create and configure access groups and permission policies", category: "Access Control" },
  { key: "user-groups.core", module: "user-groups", label: "Group Records", desc: "Core user group operations", category: "Access Control" },

  // System Administration Operations
  { key: "settings.users", module: "settings", label: "User Accounts (Legacy)", desc: "Create, view, update, and manage user login credentials", category: "Security" },
  { key: "settings.user_groups", module: "settings", label: "User Groups & Roles (Legacy)", desc: "Create and configure access groups and permission policies", category: "Access Control" },
  { key: "settings.system", module: "settings", label: "System Preferences", desc: "Modify system-wide configurations, branding, and integrations", category: "Administration" },
];
export const OPERATION_DEFS = DEFAULT_OPERATION_DEFS;

interface ModelFieldDef {
  key: string;
  label: string;
  category?: string;
  sensitive?: boolean;
}

const DEFAULT_MODEL_FIELDS: Record<string, { label: string; fields: ModelFieldDef[] }> = {
  tasks: {
    label: "Tasks",
    fields: [
      { key: "title", label: "Title", category: "Core Info" },
      { key: "description", label: "Description", category: "Core Info" },
      { key: "status", label: "Status (To Do, In Progress, Done)", category: "Progress" },
      { key: "priority", label: "Priority (Low, Medium, High, Urgent)", category: "Progress" },
      { key: "assignee", label: "Assignee (Employee)", category: "Assignment" },
      { key: "dueDate", label: "Due Date", category: "Timeline" },
      { key: "startDate", label: "Start Date", category: "Timeline" },
      { key: "estimatedHours", label: "Estimated Hours", category: "Timeline" },
      { key: "tags", label: "Tags & Categories", category: "Metadata" },
      { key: "projectId", label: "Project Linkage", category: "Assignment" },
      { key: "resources", label: "File Attachments & Links", category: "Resources" },
      { key: "comments", label: "Comments & Discussions", category: "Activity" },
    ],
  },
  projects: {
    label: "Projects",
    fields: [
      { key: "name", label: "Project Name", category: "Core Info" },
      { key: "description", label: "Description", category: "Core Info" },
      { key: "status", label: "Project Status", category: "Progress" },
      { key: "priority", label: "Priority Level", category: "Progress" },
      { key: "teamId", label: "Assigned Team", category: "Assignment" },
      { key: "startDate", label: "Start Date", category: "Timeline" },
      { key: "dueDate", label: "Target Due Date", category: "Timeline" },
      { key: "color", label: "Color Theme", category: "Appearance" },
      { key: "comments", label: "Project Comments", category: "Activity" },
    ],
  },
  employees: {
    label: "Employees",
    fields: [
      { key: "fullName", label: "Full Name (First, Middle, Last)", category: "Personal" },
      { key: "email", label: "Email Address", category: "Contact" },
      { key: "role", label: "Job Role / Title", category: "Employment" },
      { key: "department", label: "Department", category: "Employment" },
      { key: "status", label: "Status (Active, On Leave, Terminated)", category: "Employment" },
      { key: "personalNumber", label: "Personal Mobile Number", category: "Contact" },
      { key: "houseContactNumber", label: "Home / Emergency Phone", category: "Contact" },
      { key: "address", label: "Residential Address", category: "Personal" },
      { key: "joiningDate", label: "Joining Date", category: "Employment" },
      { key: "baseSalary", label: "Base Salary Amount", category: "Payroll (Confidential)", sensitive: true },
      { key: "currency", label: "Salary Currency", category: "Payroll (Confidential)", sensitive: true },
      { key: "payFrequency", label: "Pay Frequency", category: "Payroll (Confidential)", sensitive: true },
      { key: "bankAccountNumber", label: "Bank Account Number", category: "Payroll (Confidential)", sensitive: true },
      { key: "bankRoutingNumber", label: "Bank Routing / IFSC", category: "Payroll (Confidential)", sensitive: true },
      { key: "taxId", label: "Tax ID / SSN", category: "Payroll (Confidential)", sensitive: true },
    ],
  },
  teams: {
    label: "Teams",
    fields: [
      { key: "name", label: "Team Name", category: "Core Info" },
      { key: "description", label: "Description", category: "Core Info" },
      { key: "teamLead", label: "Team Lead Assignment", category: "Leadership" },
      { key: "members", label: "Team Members", category: "Membership" },
      { key: "comments", label: "Team Discussion Comments", category: "Activity" },
    ],
  },
};
export const MODEL_FIELDS = DEFAULT_MODEL_FIELDS;

type ActionPermState = {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

type OperationPermState = {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
};

type FieldPermState = {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
};

export default function UserGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { isOpen, toggleSidebar } = useSidebar();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"modules" | "operations" | "fields" | "members" | "history">("modules");

  // ── Phase 19: Audit Trail state ──
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");

  // ── Phase 19: Effective-Access Preview modal state ──
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [previewUser, setPreviewUser] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Dynamic Catalog State
  const [catalogModules, setCatalogModules] = useState<ModuleDef[]>(DEFAULT_MODULE_DEFS);
  const [catalogOperations, setCatalogOperations] = useState<OperationDef[]>(DEFAULT_OPERATION_DEFS);
  const [catalogModels, setCatalogModels] = useState<Record<string, { label: string; fields: ModelFieldDef[] }>>(DEFAULT_MODEL_FIELDS);

  // Module-Level CRUD Permissions: moduleKey -> { create, read, update, delete }
  const [modulePerms, setModulePerms] = useState<Record<string, ActionPermState>>({});

  // Module-Level Scope: moduleKey -> 'own' | 'team' | 'all'
  const [moduleScopes, setModuleScopes] = useState<Record<string, "own" | "team" | "all">>({});

  // Operation-Level CRUD Permissions: operationKey -> { read, write, update, delete }
  const [operationPerms, setOperationPerms] = useState<Record<string, OperationPermState>>({});
  const [opModuleFilter, setOpModuleFilter] = useState<string>("all");
  const [opSearchQuery, setOpSearchQuery] = useState<string>("");

  // Field-Level Permissions State: model -> field -> { read, write, update, delete }
  const [fieldPerms, setFieldPerms] = useState<Record<string, Record<string, FieldPermState>>>({});
  const [activeModelTab, setActiveModelTab] = useState<string>("tasks");

  const [originalData, setOriginalData] = useState<any>(null);

  // Helper to initialize default permissions for all modules
  const getDefaultModulePerms = (modules: ModuleDef[] = catalogModules) => {
    const initial: Record<string, ActionPermState> = {};
    for (const mod of modules) {
      initial[mod.key] = {
        create: true,
        read: true,
        update: true,
        delete: true,
      };
    }
    return initial;
  };

  // Helper to initialize default scopes for all modules
  const getDefaultModuleScopes = (modules: ModuleDef[] = catalogModules) => {
    const initial: Record<string, "own" | "team" | "all"> = {};
    for (const mod of modules) {
      initial[mod.key] = "own";
    }
    return initial;
  };

  // Helper to initialize default permissions for all operations
  const getDefaultOperationPerms = (operations: OperationDef[] = catalogOperations) => {
    const initial: Record<string, OperationPermState> = {};
    for (const op of operations) {
      initial[op.key] = {
        read: true,
        write: true,
        update: true,
        delete: true,
      };
    }
    return initial;
  };

  // Helper to initialize default permissions for all models/fields
  const getDefaultFieldPerms = (models: Record<string, { label: string; fields: ModelFieldDef[] }> = catalogModels) => {
    const initial: Record<string, Record<string, FieldPermState>> = {};
    for (const [modelKey, modelDef] of Object.entries(models)) {
      initial[modelKey] = {};
      for (const field of modelDef.fields) {
        initial[modelKey][field.key] = {
          read: true,
          write: true,
          update: true,
          delete: true,
        };
      }
    }
    return initial;
  };

  const handleSetModuleScope = (moduleKey: string, scope: "own" | "team" | "all") => {
    setModuleScopes((prev) => ({
      ...prev,
      [moduleKey]: scope,
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const users = await fetchUsers();
        setAvailableUsers(users || []);

        let loadedModules: ModuleDef[] = DEFAULT_MODULE_DEFS;
        let loadedOperations: OperationDef[] = DEFAULT_OPERATION_DEFS;
        let loadedModels: Record<string, { label: string; fields: ModelFieldDef[] }> = DEFAULT_MODEL_FIELDS;

        try {
          const catalog = await fetchPermissionsCatalog();
          if (catalog) {
            if (catalog.modules && Array.isArray(catalog.modules) && catalog.modules.length > 0) {
              loadedModules = catalog.modules.map((m: any) => ({
                key: m.key,
                label: m.label,
                desc: m.desc || m.description || "",
                icon: getModuleIcon(m.icon),
              }));
            }
            if (catalog.operations && Array.isArray(catalog.operations) && catalog.operations.length > 0) {
              loadedOperations = catalog.operations.map((op: any) => ({
                key: op.key,
                module: op.module,
                label: op.label,
                desc: op.desc || op.description || "",
                category: op.category || "General",
              }));
            }
            if (catalog.models && typeof catalog.models === "object" && Object.keys(catalog.models).length > 0) {
              loadedModels = catalog.models;
            }
          }
        } catch (catalogErr) {
          console.warn("Failed to load permissions catalog from API, using defaults", catalogErr);
        }

        setCatalogModules(loadedModules);
        setCatalogOperations(loadedOperations);
        setCatalogModels(loadedModels);

        const initialModulePerms = getDefaultModulePerms(loadedModules);
        const initialModuleScopes = getDefaultModuleScopes(loadedModules);
        const initialOperationPerms = getDefaultOperationPerms(loadedOperations);
        const initialFieldPerms = getDefaultFieldPerms(loadedModels);

        if (!isNew) {
          const group = await fetchUserGroupById(id);
          if (!group) {
            router.push("/configuration/user-groups");
            return;
          }
          setName(group.name || "");
          setDescription(group.description || "");
          setColor(group.color || "#6366f1");
          const memberIds = (group.members || []).map((m: any) => (m._id || m).toString());
          setSelectedMembers(memberIds);

          // 1. Populate Module Permissions & Scopes
          if (group.modulePermissions && Array.isArray(group.modulePermissions)) {
            for (const mp of group.modulePermissions) {
              if (initialModulePerms[mp.module]) {
                initialModulePerms[mp.module] = {
                  create: mp.create ?? true,
                  read: mp.read ?? true,
                  update: mp.update ?? true,
                  delete: mp.delete ?? true,
                };
              }
              if (mp.scope && ["own", "team", "all"].includes(mp.scope)) {
                initialModuleScopes[mp.module] = mp.scope;
              }
            }
          } else if (group.permissions && Array.isArray(group.permissions)) {
            for (const p of group.permissions) {
              const [mod, act] = p.split(":");
              if (initialModulePerms[mod]) {
                if (act === "manage") {
                  initialModulePerms[mod] = { create: true, read: true, update: true, delete: true };
                } else if (act === "view") {
                  initialModulePerms[mod] = { create: false, read: true, update: false, delete: false };
                }
              }
            }
          }

          // 2. Populate Operation Permissions
          if (group.operationPermissions && Array.isArray(group.operationPermissions)) {
            for (const op of group.operationPermissions) {
              if (initialOperationPerms[op.operation]) {
                initialOperationPerms[op.operation] = {
                  read: op.read ?? true,
                  write: op.write ?? true,
                  update: op.update ?? true,
                  delete: op.delete ?? true,
                };
              }
            }
          } else {
            // Default operations to match parent module permission if not explicitly configured
            for (const opDef of loadedOperations) {
              const parentMod = initialModulePerms[opDef.module];
              if (parentMod) {
                initialOperationPerms[opDef.key] = {
                  read: parentMod.read,
                  write: parentMod.create,
                  update: parentMod.update,
                  delete: parentMod.delete,
                };
              }
            }
          }

          // 3. Populate Field Permissions
          if (group.fieldPermissions && Array.isArray(group.fieldPermissions)) {
            for (const fp of group.fieldPermissions) {
              if (initialFieldPerms[fp.model] && initialFieldPerms[fp.model][fp.field]) {
                initialFieldPerms[fp.model][fp.field] = {
                  read: fp.read ?? true,
                  write: fp.write ?? true,
                  update: fp.update ?? true,
                  delete: fp.delete ?? true,
                };
              }
            }
          }

          setModulePerms(initialModulePerms);
          setModuleScopes(initialModuleScopes);
          setOperationPerms(initialOperationPerms);
          setFieldPerms(initialFieldPerms);

          setOriginalData({
            name: group.name || "",
            description: group.description || "",
            color: group.color || "#6366f1",
            members: memberIds,
            modulePerms: JSON.parse(JSON.stringify(initialModulePerms)),
            moduleScopes: JSON.parse(JSON.stringify(initialModuleScopes)),
            operationPerms: JSON.parse(JSON.stringify(initialOperationPerms)),
            fieldPerms: JSON.parse(JSON.stringify(initialFieldPerms)),
          });
        } else {
          setModulePerms(initialModulePerms);
          setModuleScopes(initialModuleScopes);
          setOperationPerms(initialOperationPerms);
          setFieldPerms(initialFieldPerms);
        }
      } catch (err) {
        console.error("Failed to load user group data", err);
        router.push("/configuration/user-groups");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, isNew, router]);

  // ── Phase 19: Load Audit Logs ──
  const loadAuditLogs = useCallback(async () => {
    if (isNew || !id) return;
    setAuditLoading(true);
    try {
      const data = await fetchGroupAuditLogs({
        groupId: id,
        action: auditActionFilter !== "all" ? auditActionFilter : undefined,
        page: auditPage,
        limit: 15,
      });
      setAuditLogs(data?.logs || data?.data || []);
      setAuditTotalPages(data?.totalPages || data?.pages || 1);
    } catch (err) {
      console.error("Failed to load audit logs", err);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [id, isNew, auditPage, auditActionFilter]);

  useEffect(() => {
    if (activeTab === "history") {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  // ── Phase 19: Open Effective-Access Preview modal ──
  const handleOpenPreview = async (userId: string) => {
    const user = availableUsers.find((u) => u._id === userId);
    setPreviewUser(user || null);
    setPreviewUserId(userId);
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const data = await fetchUserEffectivePermissions(userId);
      setPreviewData(data);
    } catch (err) {
      console.error("Failed to load effective permissions", err);
      setPreviewData({ error: true });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewUserId(null);
    setPreviewUser(null);
    setPreviewData(null);
  };

  const hasChanges =
    !isNew &&
    originalData &&
    (name !== originalData.name ||
      description !== originalData.description ||
      color !== originalData.color ||
      JSON.stringify(selectedMembers.sort()) !== JSON.stringify(originalData.members.sort()) ||
      JSON.stringify(modulePerms) !== JSON.stringify(originalData.modulePerms) ||
      JSON.stringify(moduleScopes) !== JSON.stringify(originalData.moduleScopes || {}) ||
      JSON.stringify(operationPerms) !== JSON.stringify(originalData.operationPerms) ||
      JSON.stringify(fieldPerms) !== JSON.stringify(originalData.fieldPerms));

  const [allGroupIds, setAllGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchUserGroups().then((groups) => {
        if (groups && Array.isArray(groups)) {
          setAllGroupIds(groups.map((g: any) => g._id || g.id));
        }
      }).catch((err) => console.error("Failed to load user groups list", err));
    }
  }, [isNew]);

  const groupIndex = allGroupIds.indexOf(id);
  const totalGroups = allGroupIds.length;
  const currentGroupNum = groupIndex >= 0 ? groupIndex + 1 : 1;

  const navigateToGroup = (targetId: string) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard and navigate to the other user group?")) {
        return;
      }
    }
    router.push(`/configuration/user-groups/${targetId}`);
  };

  const handlePrevGroup = () => {
    if (groupIndex > 0) {
      navigateToGroup(allGroupIds[groupIndex - 1]);
    }
  };

  const handleNextGroup = () => {
    if (groupIndex >= 0 && groupIndex < totalGroups - 1) {
      navigateToGroup(allGroupIds[groupIndex + 1]);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((i) => i !== userId) : [...prev, userId]
    );
  };

  // ── Module Action Toggles ──
  const handleToggleModuleAction = (
    moduleKey: string,
    action: "create" | "read" | "update" | "delete"
  ) => {
    setModulePerms((prev) => {
      const current = prev[moduleKey] || { create: true, read: true, update: true, delete: true };
      const updated = {
        ...prev,
        [moduleKey]: {
          ...current,
          [action]: !current[action],
        },
      };
      return updated;
    });
  };

  const handleSetModulePreset = (moduleKey: string, preset: "all" | "readonly" | "none") => {
    setModulePerms((prev) => {
      const updated: ActionPermState =
        preset === "all"
          ? { create: true, read: true, update: true, delete: true }
          : preset === "readonly"
          ? { create: false, read: true, update: false, delete: false }
          : { create: false, read: false, update: false, delete: false };
      return {
        ...prev,
        [moduleKey]: updated,
      };
    });
  };

  const handleSetAllModulesPreset = (preset: "all" | "readonly" | "none") => {
    setModulePerms(() => {
      const updated: Record<string, ActionPermState> = {};
      for (const mod of catalogModules) {
        updated[mod.key] =
          preset === "all"
            ? { create: true, read: true, update: true, delete: true }
            : preset === "readonly"
            ? { create: false, read: true, update: false, delete: false }
            : { create: false, read: false, update: false, delete: false };
      }
      return updated;
    });
  };

  // ── Operation Action Toggles ──
  const handleToggleOperationAction = (
    operationKey: string,
    action: "read" | "write" | "update" | "delete"
  ) => {
    setOperationPerms((prev) => {
      const current = prev[operationKey] || { read: true, write: true, update: true, delete: true };
      return {
        ...prev,
        [operationKey]: {
          ...current,
          [action]: !current[action],
        },
      };
    });
  };

  const handleSetOperationPreset = (operationKey: string, preset: "all" | "readonly" | "none") => {
    setOperationPerms((prev) => {
      const updated: OperationPermState =
        preset === "all"
          ? { read: true, write: true, update: true, delete: true }
          : preset === "readonly"
          ? { read: true, write: false, update: false, delete: false }
          : { read: false, write: false, update: false, delete: false };
      return {
        ...prev,
        [operationKey]: updated,
      };
    });
  };

  const handleSetAllOperationsPreset = (preset: "all" | "readonly" | "none", filterMod?: string) => {
    setOperationPerms((prev) => {
      const updated = { ...prev };
      const targets = filterMod && filterMod !== "all"
        ? catalogOperations.filter((op) => op.module === filterMod)
        : catalogOperations;

      for (const op of targets) {
        updated[op.key] =
          preset === "all"
            ? { read: true, write: true, update: true, delete: true }
            : preset === "readonly"
            ? { read: true, write: false, update: false, delete: false }
            : { read: false, write: false, update: false, delete: false };
      }
      return updated;
    });
  };

  // ── Field Action Toggles ──
  const handleToggleFieldAction = (
    modelKey: string,
    fieldKey: string,
    action: "read" | "write" | "update" | "delete"
  ) => {
    setFieldPerms((prev) => {
      const modelObj = prev[modelKey] || {};
      const current = modelObj[fieldKey] || { read: true, write: true, update: true, delete: true };
      return {
        ...prev,
        [modelKey]: {
          ...modelObj,
          [fieldKey]: {
            ...current,
            [action]: !current[action],
          },
        },
      };
    });
  };

  const handleSetModelPreset = (modelKey: string, preset: "all" | "readonly" | "none") => {
    setFieldPerms((prev) => {
      const modelDef = catalogModels[modelKey];
      if (!modelDef) return prev;
      const updatedModel: Record<string, FieldPermState> = {};
      for (const field of modelDef.fields) {
        if (preset === "all") {
          updatedModel[field.key] = { read: true, write: true, update: true, delete: true };
        } else if (preset === "readonly") {
          updatedModel[field.key] = { read: true, write: false, update: false, delete: false };
        } else {
          updatedModel[field.key] = { read: false, write: false, update: false, delete: false };
        }
      }
      return {
        ...prev,
        [modelKey]: updatedModel,
      };
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Group name is required.");
      return;
    }

    // 1. Flatten Module Permissions
    const modulePermissionsArray: Array<{
      module: string;
      scope: "own" | "team" | "all";
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    }> = [];

    const legacyPermissionsArray: string[] = [];

    for (const [modKey, perms] of Object.entries(modulePerms)) {
      modulePermissionsArray.push({
        module: modKey,
        scope: moduleScopes[modKey] || "own",
        create: perms.create,
        read: perms.read,
        update: perms.update,
        delete: perms.delete,
      });

      if (perms.create) {
        legacyPermissionsArray.push(`${modKey}:create`);
        legacyPermissionsArray.push(`${modKey}:write`);
      }
      if (perms.read) legacyPermissionsArray.push(`${modKey}:read`);
      if (perms.update) legacyPermissionsArray.push(`${modKey}:update`);
      if (perms.delete) legacyPermissionsArray.push(`${modKey}:delete`);
      if (perms.create && perms.read && perms.update && perms.delete) {
        legacyPermissionsArray.push(`${modKey}:manage`);
      }
    }

    // 2. Flatten Operation Permissions
    const operationPermissionsArray: Array<{
      module: string;
      operation: string;
      read: boolean;
      write: boolean;
      update: boolean;
      delete: boolean;
    }> = [];

    for (const opDef of catalogOperations) {
      const perms = operationPerms[opDef.key] || { read: true, write: true, update: true, delete: true };
      operationPermissionsArray.push({
        module: opDef.module,
        operation: opDef.key,
        read: perms.read,
        write: perms.write,
        update: perms.update,
        delete: perms.delete,
      });

      if (perms.read) legacyPermissionsArray.push(`${opDef.key}:read`);
      if (perms.write) {
        legacyPermissionsArray.push(`${opDef.key}:write`);
        legacyPermissionsArray.push(`${opDef.key}:create`);
      }
      if (perms.update) legacyPermissionsArray.push(`${opDef.key}:update`);
      if (perms.delete) legacyPermissionsArray.push(`${opDef.key}:delete`);
    }

    // 3. Flatten Field Permissions
    const fieldPermissionsArray: Array<{
      model: string;
      field: string;
      read: boolean;
      write: boolean;
      update: boolean;
      delete: boolean;
    }> = [];

    for (const [modelKey, fields] of Object.entries(fieldPerms)) {
      for (const [fieldKey, perms] of Object.entries(fields)) {
        fieldPermissionsArray.push({
          model: modelKey,
          field: fieldKey,
          read: perms.read,
          write: perms.write,
          update: perms.update,
          delete: perms.delete,
        });
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      color,
      members: selectedMembers,
      permissions: Array.from(new Set(legacyPermissionsArray)),
      modulePermissions: modulePermissionsArray,
      operationPermissions: operationPermissionsArray,
      fieldPermissions: fieldPermissionsArray,
    };

    try {
      setIsSaving(true);
      if (isNew) {
        await createUserGroup(payload);
        setToastMessage("User group created successfully!");
        setTimeout(() => router.push("/configuration/user-groups"), 1000);
      } else {
        const updated = await updateUserGroup(id, payload);
        const memberIds = (updated.members || []).map((m: any) => (m._id || m).toString());
        setOriginalData({
          name: updated.name || "",
          description: updated.description || "",
          color: updated.color || "#6366f1",
          members: memberIds,
          modulePerms: JSON.parse(JSON.stringify(modulePerms)),
          moduleScopes: JSON.parse(JSON.stringify(moduleScopes)),
          operationPerms: JSON.parse(JSON.stringify(operationPerms)),
          fieldPerms: JSON.parse(JSON.stringify(fieldPerms)),
        });
        setToastMessage("User group updated successfully!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save user group", err);
      alert("Failed to save user group.");
    } finally {
      setIsSaving(false);
    }
  };

  const isSystemGroup = ["administrators", "employee"].includes(name.trim().toLowerCase());

  const handleDelete = async () => {
    if (isSystemGroup) {
      alert("Default system groups cannot be deleted.");
      return;
    }
    if (!confirm("Are you sure you want to delete this user group?")) return;
    try {
      setIsDeleting(true);
      await deleteUserGroup(id);
      router.push("/configuration/user-groups");
    } catch (err: any) {
      console.error("Failed to delete group", err);
      alert(err.response?.data?.message || "Failed to delete group.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = name.trim() || (isNew ? "New Group" : "User Group");
  const currentModelFields = catalogModels[activeModelTab]?.fields || [];

  // Filtered operations for Operation Access tab
  const filteredOperations = catalogOperations.filter((op) => {
    if (opModuleFilter !== "all" && op.module !== opModuleFilter) return false;
    if (opSearchQuery.trim()) {
      const q = opSearchQuery.toLowerCase();
      return (
        op.label.toLowerCase().includes(q) ||
        (op.desc && op.desc.toLowerCase().includes(q)) ||
        op.key.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered users for Members tab
  const filteredUsers = availableUsers.filter((u) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background shrink-0 min-h-[60px]">
        <div className="flex items-center gap-2 min-w-0">
          {!isOpen && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm mr-2 shrink-0"
            >
              <PanelLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate">
            <Link href="/configuration/user-groups" className="hover:text-foreground transition-colors">
              User Groups
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[220px]">
              {displayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isNew && totalGroups > 0 && (
            <RecordNavigator
              current={currentGroupNum}
              total={totalGroups}
              onPrev={handlePrevGroup}
              onNext={handleNextGroup}
              hasPrev={groupIndex > 0}
              hasNext={groupIndex >= 0 && groupIndex < totalGroups - 1}
            />
          )}
          {isNew ? (
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : "Save Group"}
            </button>
          ) : hasChanges ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setName(originalData.name);
                  setDescription(originalData.description);
                  setColor(originalData.color);
                  setSelectedMembers(originalData.members);
                  setModulePerms(JSON.parse(JSON.stringify(originalData.modulePerms)));
                  setModuleScopes(JSON.parse(JSON.stringify(originalData.moduleScopes || {})));
                  setOperationPerms(JSON.parse(JSON.stringify(originalData.operationPerms || {})));
                  setFieldPerms(JSON.parse(JSON.stringify(originalData.fieldPerms)));
                }}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          ) : (
            <Link
              href="/configuration/user-groups"
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          )}

          {!isNew && !isSystemGroup && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 h-7 px-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-md transition-colors bg-card shadow-sm text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          {!isNew && isSystemGroup && (
            <span
              title="System default groups cannot be deleted"
              className="flex items-center gap-1.5 h-7 px-2.5 border border-border/80 text-muted-foreground bg-muted/40 rounded-md text-[11px] font-medium"
            >
              <Shield className="w-3 h-3 text-primary" />
              System Group
            </span>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Group Header Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div 
              className="h-16 transition-colors"
              style={{ background: `linear-gradient(90deg, ${color}33, transparent)` }}
            />
            <div className="px-6 pb-6 -mt-8">
              <div className="flex items-end justify-between gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md border-4 border-card shrink-0 transition-colors"
                  style={{ backgroundColor: color }}
                >
                  {name.trim()?.charAt(0)?.toUpperCase() || <Users className="w-8 h-8" />}
                </div>

                {/* Color Presets */}
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-foreground" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Name & Description */}
              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Group Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Project Managers, Developers, HR & Payroll"
                    className="w-full text-base font-semibold text-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the responsibilities, access boundaries, and update limits of this group..."
                    className="w-full text-sm text-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section Navigation Tabs ── */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("modules")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "modules"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Module Access</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold">
                {catalogModules.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "operations"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Operation Access</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.2 rounded-full font-bold">
                {catalogOperations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fields")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "fields"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Field-Level Access</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded-full font-bold">
                {Object.values(catalogModels).reduce((acc, m) => acc + (m?.fields?.length || 0), 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "members"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Group Members</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded-full font-bold">
                {selectedMembers.length}
              </span>
            </button>

            {!isNew && (
              <button
                type="button"
                onClick={() => { setActiveTab("history"); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "history"
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="w-3.5 h-3.5 text-violet-500" />
                <span>History</span>
              </button>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 1: MODULE ACCESS (Read, Write, Update, Delete) ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "modules" && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Module Access Control</h3>
                    <p className="text-xs text-muted-foreground">Configure Read, Write, Update, and Delete permissions across entire modules</p>
                  </div>
                </div>

                {/* Global Quick Action Presets */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllModulesPreset("all")}
                    className="text-[11px] px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllModulesPreset("readonly")}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/50"
                  >
                    Read-Only All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllModulesPreset("none")}
                    className="text-[11px] px-2.5 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Module Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] text-muted-foreground uppercase bg-muted/10 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Module Name</th>
                      <th className="px-5 py-3 font-semibold">Description</th>
                      <th className="px-3 py-3 font-semibold text-center w-36">Access Scope</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Read (View module pages and records)">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Read</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Write (Create / Add new records)">
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Write</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Update (Modify existing records)">
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Update</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Delete (Remove records)">
                          <Trash className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-right w-28">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {catalogModules.map((mod) => {
                      const Icon = getModuleIcon(mod.icon);
                      const currentPerm = modulePerms[mod.key] || {
                        create: true,
                        read: true,
                        update: true,
                        delete: true,
                      };
                      const currentScope = moduleScopes[mod.key] || "own";

                      const isAll = currentPerm.create && currentPerm.read && currentPerm.update && currentPerm.delete;
                      const isReadOnly = !currentPerm.create && currentPerm.read && !currentPerm.update && !currentPerm.delete;
                      const isNone = !currentPerm.create && !currentPerm.read && !currentPerm.update && !currentPerm.delete;

                      return (
                        <tr key={mod.key} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-foreground text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-foreground">{mod.label}</span>
                                <span className="block text-[10px] text-muted-foreground font-mono">{mod.key}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs">
                            {mod.desc}
                          </td>
                          {/* Access Scope Selector */}
                          <td className="px-3 py-3.5 text-center">
                            <select
                              value={currentScope}
                              onChange={(e) => handleSetModuleScope(mod.key, e.target.value as "own" | "team" | "all")}
                              className={`text-[11px] font-semibold border rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-colors ${
                                currentScope === "all"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                  : currentScope === "team"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                  : "bg-muted/40 text-foreground border-border/60"
                              }`}
                              title={`Access scope for ${mod.label}: own (user only), team (user's team & subordinates), all (organization-wide)`}
                            >
                              <option value="own">Own (User)</option>
                              <option value="team">Team</option>
                              <option value="all">All (Org)</option>
                            </select>
                          </td>
                          {/* Read Access Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAction(mod.key, "read")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.read
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Read access for ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {/* Write (Create) Access Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAction(mod.key, "create")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.create
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Write access for ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {/* Update Access Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAction(mod.key, "update")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.update
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Update access for ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {/* Delete Access Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleAction(mod.key, "delete")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.delete
                                  ? "bg-red-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Delete access for ${mod.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <select
                              value={isAll ? "all" : isReadOnly ? "readonly" : isNone ? "none" : "custom"}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "all" || v === "readonly" || v === "none") {
                                  handleSetModulePreset(mod.key, v);
                                }
                              }}
                              className="text-[11px] bg-muted/30 border border-border/60 rounded px-2 py-1 outline-none text-foreground cursor-pointer"
                            >
                              <option value="all">Full Access</option>
                              <option value="readonly">Read Only</option>
                              <option value="none">No Access</option>
                              <option value="custom" disabled>Custom</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 2: OPERATION ACCESS (Read, Write, Update, Delete) ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "operations" && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Operation Access Control</h3>
                    <p className="text-xs text-muted-foreground">Fine-grained Read, Write, Update, and Delete permissions per functional operation</p>
                  </div>
                </div>

                {/* Operation Bulk Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllOperationsPreset("all", opModuleFilter)}
                    className="text-[11px] px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors font-medium"
                  >
                    Grant {opModuleFilter === "all" ? "All" : "Filtered"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllOperationsPreset("readonly", opModuleFilter)}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/50"
                  >
                    Read-Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllOperationsPreset("none", opModuleFilter)}
                    className="text-[11px] px-2.5 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Filter Bar & Search */}
              <div className="p-4 border-b border-border/50 bg-muted/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Module Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setOpModuleFilter("all")}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors shrink-0 font-medium ${
                      opModuleFilter === "all"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All Modules ({catalogOperations.length})
                  </button>
                  {catalogModules.map((mod) => {
                    const count = catalogOperations.filter((op) => op.module === mod.key).length;
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => setOpModuleFilter(mod.key)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors shrink-0 font-medium ${
                          opModuleFilter === mod.key
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {mod.label.replace(" Management", "").replace(" & Analytics", "")} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Operation Search */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={opSearchQuery}
                    onChange={(e) => setOpSearchQuery(e.target.value)}
                    placeholder="Search operations..."
                    className="w-full pl-8 pr-3 py-1 text-xs bg-muted/40 border border-border/60 rounded-md outline-none focus:border-primary transition-colors"
                  />
                  {opSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOpSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Operations Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] text-muted-foreground uppercase bg-muted/10 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Operation</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-5 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Read (View operation data)">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Read</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Write (Create / perform operation)">
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Write</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Update (Modify operation records)">
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Update</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Delete (Remove / cancel operation records)">
                          <Trash className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-right w-28">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredOperations.length > 0 ? (
                      filteredOperations.map((op) => {
                        const currentPerm = operationPerms[op.key] || {
                          read: true,
                          write: true,
                          update: true,
                          delete: true,
                        };

                        const isAll = currentPerm.read && currentPerm.write && currentPerm.update && currentPerm.delete;
                        const isReadOnly = currentPerm.read && !currentPerm.write && !currentPerm.update && !currentPerm.delete;
                        const isNone = !currentPerm.read && !currentPerm.write && !currentPerm.update && !currentPerm.delete;

                        return (
                          <tr key={op.key} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-semibold text-foreground text-xs flex items-center gap-2">
                                <span>{op.label}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {op.key}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[10px]">
                                {op.category}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground max-w-xs">
                              {op.desc}
                            </td>
                            {/* Read Access Toggle */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleOperationAction(op.key, "read")}
                                className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                  currentPerm.read
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                                }`}
                                title={`Toggle Read access for ${op.label}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            {/* Write Access Toggle */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleOperationAction(op.key, "write")}
                                className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                  currentPerm.write
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                                }`}
                                title={`Toggle Write access for ${op.label}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            {/* Update Access Toggle */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleOperationAction(op.key, "update")}
                                className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                  currentPerm.update
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                                }`}
                                title={`Toggle Update access for ${op.label}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            {/* Delete Access Toggle */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleOperationAction(op.key, "delete")}
                                className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                  currentPerm.delete
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                                }`}
                                title={`Toggle Delete access for ${op.label}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <select
                                value={isAll ? "all" : isReadOnly ? "readonly" : isNone ? "none" : "custom"}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "all" || v === "readonly" || v === "none") {
                                    handleSetOperationPreset(op.key, v);
                                  }
                                }}
                                className="text-[11px] bg-muted/30 border border-border/60 rounded px-2 py-1 outline-none text-foreground cursor-pointer"
                              >
                                <option value="all">Full Access</option>
                                <option value="readonly">Read Only</option>
                                <option value="none">No Access</option>
                                <option value="custom" disabled>Custom</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-xs text-muted-foreground">
                          No operations found matching your filter or search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 3: FIELD-LEVEL ACCESS (Read, Write, Update, Delete) ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "fields" && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Field-Level Access Control</h3>
                    <p className="text-xs text-muted-foreground">Configure Read, Write, Update, and Delete permissions per field across models</p>
                  </div>
                </div>

                {/* Model Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetModelPreset(activeModelTab, "all")}
                    className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                  >
                    Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetModelPreset(activeModelTab, "readonly")}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/50"
                  >
                    Read-Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetModelPreset(activeModelTab, "none")}
                    className="text-[11px] px-2.5 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium"
                  >
                    No Access
                  </button>
                </div>
              </div>

              {/* Model Tabs */}
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-border/50 overflow-x-auto">
                {Object.entries(catalogModels).map(([key, def]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveModelTab(key)}
                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                      activeModelTab === key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {def.label} ({def.fields.length})
                  </button>
                ))}
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] text-muted-foreground uppercase bg-muted/10 border-b border-border/50">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Field Name</th>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Read (View field value)">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>Read</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Write (Set value when creating)">
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Write</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Update (Modify existing value)">
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Update</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-center w-24">
                        <div className="flex items-center justify-center gap-1" title="Delete (Clear / Remove value)">
                          <Trash className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {currentModelFields.map((field) => {
                      const currentPerm = (fieldPerms[activeModelTab] && fieldPerms[activeModelTab][field.key]) || {
                        read: true,
                        write: true,
                        update: true,
                        delete: true,
                      };

                      return (
                        <tr key={field.key} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                              <span>{field.label}</span>
                              {field.sensitive && (
                                <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.2 rounded font-semibold">
                                  Confidential
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {field.key}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {field.category || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldAction(activeModelTab, field.key, "read")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.read
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Read for ${field.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldAction(activeModelTab, field.key, "write")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.write
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Write for ${field.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldAction(activeModelTab, field.key, "update")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.update
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Update for ${field.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFieldAction(activeModelTab, field.key, "delete")}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                currentPerm.delete
                                  ? "bg-red-500 text-white shadow-sm"
                                  : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                              }`}
                              title={`Toggle Delete for ${field.label}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 4: GROUP MEMBERS ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "members" && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Group Members</h3>
                    <p className="text-xs text-muted-foreground">Assign users to this group to grant all defined module and operation permissions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium mr-2">
                    {selectedMembers.length} of {availableUsers.length} assigned
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMembers(availableUsers.map((u) => u._id))}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/50"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMembers([])}
                    className="text-[11px] px-2.5 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Member Search Bar */}
              <div className="p-4 border-b border-border/50 bg-muted/5">
                <div className="relative max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border border-border/60 rounded-md outline-none focus:border-primary transition-colors"
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {filteredUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedMembers.includes(u._id);
                      return (
                        <div
                          key={u._id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-primary/5 border-primary/40 shadow-xs"
                              : "bg-muted/10 border-border/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleToggleMember(u._id)}
                            >
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                  {u.name?.charAt(0) || u.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground truncate">
                                  {u.name || (u.authType === 'guest' ? 'Guest User' : 'User')}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {u.email || "No email"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(u._id)}
                                  title="Preview effective permissions for this user"
                                  className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors font-medium border border-violet-500/20"
                                >
                                  <Eye className="w-3 h-3" />
                                  Preview Access
                                </button>
                              )}
                              <div
                                onClick={() => handleToggleMember(u._id)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 bg-card hover:border-primary/60"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    {memberSearchQuery ? "No users match your search query." : "No users found in the system."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 5: HISTORY (Audit Trail) ── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && !isNew && (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-500" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Change History</h3>
                    <p className="text-xs text-muted-foreground">Audit trail of all changes made to this group and its membership</p>
                  </div>
                </div>

                {/* Action filter + Refresh */}
                <div className="flex items-center gap-2">
                  <select
                    value={auditActionFilter}
                    onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                    className="text-[11px] bg-muted/30 border border-border/60 rounded px-2 py-1 outline-none text-foreground cursor-pointer"
                  >
                    <option value="all">All Actions</option>
                    <option value="group_created">Created</option>
                    <option value="group_updated">Updated</option>
                    <option value="group_deleted">Deleted</option>
                    <option value="member_added">Member Added</option>
                    <option value="member_removed">Member Removed</option>
                    <option value="system_admin_granted">Admin Granted</option>
                    <option value="system_admin_revoked">Admin Revoked</option>
                  </select>
                  <button
                    type="button"
                    onClick={loadAuditLogs}
                    disabled={auditLoading}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/50 disabled:opacity-50"
                  >
                    {auditLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                    Refresh
                  </button>
                </div>
              </div>

              {/* Audit log list */}
              <div className="divide-y divide-border/40">
                {auditLoading && auditLogs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No audit records found for the selected filter.</p>
                  </div>
                ) : (
                  auditLogs.map((log: any, idx: number) => {
                    const actionColors: Record<string, string> = {
                      group_created: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      group_updated: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                      group_deleted: "bg-red-500/10 text-red-500 border-red-500/20",
                      member_added: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
                      member_removed: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                      system_admin_granted: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                      system_admin_revoked: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
                    };
                    const actionLabel: Record<string, string> = {
                      group_created: "Group Created",
                      group_updated: "Group Updated",
                      group_deleted: "Group Deleted",
                      member_added: "Member Added",
                      member_removed: "Member Removed",
                      system_admin_granted: "Admin Granted",
                      system_admin_revoked: "Admin Revoked",
                    };
                    const colorClass = actionColors[log.action] || "bg-muted/20 text-muted-foreground border-border/40";
                    const label = actionLabel[log.action] || log.action;
                    const ts = log.createdAt ? new Date(log.createdAt) : null;

                    return (
                      <div key={log._id || idx} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/10 transition-colors">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-1" />
                          {idx < auditLogs.length - 1 && (
                            <div className="w-px flex-1 min-h-[24px] bg-border/50 mt-1" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                              {label}
                            </span>
                            <span className="text-xs font-medium text-foreground truncate">
                              {log.actorEmail || log.actorId || "System"}
                            </span>
                            {ts && (
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>

                          {/* Diff summary */}
                          {(log.before || log.after) && (
                            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {log.before && Object.keys(log.before).length > 0 && (
                                <div className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                                  <p className="text-[10px] font-bold text-red-500 mb-1 uppercase tracking-wider">Before</p>
                                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after && Object.keys(log.after).length > 0 && (
                                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                                  <p className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-wider">After</p>
                                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {log.targetEmail && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Target user: <span className="font-medium text-foreground">{log.targetEmail}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {auditTotalPages > 1 && (
                <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Page {auditPage} of {auditTotalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={auditPage <= 1 || auditLoading}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border/60 bg-card hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={auditPage >= auditTotalPages || auditLoading}
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border/60 bg-card hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ── Phase 19: Effective-Access Preview Modal ── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {previewUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleClosePreview}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Eye className="w-4.5 h-4.5 text-violet-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Effective Access Preview</h2>
                  <p className="text-xs text-muted-foreground">
                    {previewUser?.name || previewUser?.email || previewUserId}
                    {previewUser?.email && previewUser?.name && (
                      <span className="ml-1 opacity-70">({previewUser.email})</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  <p className="text-xs text-muted-foreground">Loading effective permissions…</p>
                </div>
              ) : previewData?.error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <p className="text-xs text-muted-foreground">Failed to load effective permissions. You may need System Admin privileges.</p>
                </div>
              ) : previewData ? (
                <div className="space-y-5">
                  {/* Groups summary */}
                  {previewData.groups && previewData.groups.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Member of Groups</p>
                      <div className="flex flex-wrap gap-1.5">
                        {previewData.groups.map((g: any) => (
                          <span
                            key={g._id || g.name}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* isUnrestricted badge */}
                  {previewData.isUnrestricted && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        This user is a System Admin or Administrators group member and has unrestricted access to all modules.
                      </p>
                    </div>
                  )}

                  {/* Module permissions matrix */}
                  {previewData.modulePermissions && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Module Permissions</p>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/20 border-b border-border/60">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Module</th>
                              <th className="px-2 py-2 text-center font-semibold text-blue-500 w-16">Read</th>
                              <th className="px-2 py-2 text-center font-semibold text-emerald-500 w-16">Write</th>
                              <th className="px-2 py-2 text-center font-semibold text-amber-500 w-16">Update</th>
                              <th className="px-2 py-2 text-center font-semibold text-red-500 w-16">Delete</th>
                              <th className="px-2 py-2 text-center font-semibold text-violet-500 w-20">Scope</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {Object.entries(previewData.modulePermissions).map(([modKey, perms]: [string, any]) => {
                              const scope = previewData.moduleScopes?.[modKey] || "own";
                              const hasAny = perms.read || perms.create || perms.update || perms.delete;
                              return (
                                <tr
                                  key={modKey}
                                  className={`transition-colors ${ hasAny ? "hover:bg-muted/10" : "opacity-50 hover:bg-muted/5" }`}
                                >
                                  <td className="px-3 py-2 font-medium text-foreground">
                                    <div>
                                      <span>{catalogModules.find((m) => m.key === modKey)?.label || modKey}</span>
                                      <span className="block text-[10px] text-muted-foreground font-mono">{modKey}</span>
                                    </div>
                                  </td>
                                  {(["read", "create", "update", "delete"] as const).map((act) => (
                                    <td key={act} className="px-2 py-2 text-center">
                                      {perms[act] ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                                      ) : (
                                        <X className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />
                                      )}
                                    </td>
                                  ))}
                                  <td className="px-2 py-2 text-center">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                      scope === "all" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                      : scope === "team" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "bg-muted/40 text-muted-foreground"
                                    }`}>
                                      {scope}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Granted / Denied by explanation */}
                  {previewData.explanation && (
                    <div className="bg-muted/20 border border-border/60 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Resolution Details
                      </p>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                        {typeof previewData.explanation === "string"
                          ? previewData.explanation
                          : JSON.stringify(previewData.explanation, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={handleClosePreview}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/60"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
