"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, Save, Check, X, Loader2,
  Users, Shield, Key, ArrowLeft, Trash2, Sliders,
  Eye, Edit3, PlusCircle, Trash, CheckSquare, Layers
} from "lucide-react";
import { useSidebar } from "../../../../../src/components/layout/SidebarContext";
import {
  fetchUserGroupById,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  fetchUsers
} from "../../../../../src/lib/api";
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

const MODULE_DEFS = [
  { key: "tasks", label: "Tasks Management", desc: "Create, assign, track, and complete tasks" },
  { key: "projects", label: "Projects Management", desc: "Organize project timelines, teams, and milestones" },
  { key: "employees", label: "Employees & HR", desc: "Manage employee profiles, contact info, and compensation" },
  { key: "teams", label: "Teams Management", desc: "Create teams, assign team leads, and coordinate members" },
  { key: "reports", label: "Reports & Analytics", desc: "Access business reports, timeline summaries, and dashboards" },
  { key: "settings", label: "System Administration", desc: "Configure users, user groups, and global preferences" },
];

interface ModelFieldDef {
  key: string;
  label: string;
  category?: string;
  sensitive?: boolean;
}

const MODEL_FIELDS: Record<string, { label: string; fields: ModelFieldDef[] }> = {
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

type ActionPermState = {
  create: boolean;
  read: boolean;
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

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Module-Level CRUD Permissions: moduleKey -> { create, read, update, delete }
  const [modulePerms, setModulePerms] = useState<Record<string, ActionPermState>>({});

  // Field-Level Permissions State: model -> field -> { read, write, update, delete }
  const [fieldPerms, setFieldPerms] = useState<Record<string, Record<string, FieldPermState>>>({});
  const [activeModelTab, setActiveModelTab] = useState<string>("tasks");

  const [originalData, setOriginalData] = useState<any>(null);

  // Helper to initialize default permissions for all modules
  const getDefaultModulePerms = () => {
    const initial: Record<string, ActionPermState> = {};
    for (const mod of MODULE_DEFS) {
      initial[mod.key] = {
        create: true,
        read: true,
        update: true,
        delete: true,
      };
    }
    return initial;
  };

  // Helper to initialize default permissions for all models/fields
  const getDefaultFieldPerms = () => {
    const initial: Record<string, Record<string, FieldPermState>> = {};
    for (const [modelKey, modelDef] of Object.entries(MODEL_FIELDS)) {
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const users = await fetchUsers();
        setAvailableUsers(users || []);

        const initialModulePerms = getDefaultModulePerms();
        const initialFieldPerms = getDefaultFieldPerms();

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

          // Populate existing module permissions if saved
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
            }
          } else if (group.permissions && Array.isArray(group.permissions)) {
            // Backward compatibility mapping from permissions array
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

          // Populate existing field permissions if saved
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
          setFieldPerms(initialFieldPerms);

          setOriginalData({
            name: group.name || "",
            description: group.description || "",
            color: group.color || "#6366f1",
            members: memberIds,
            modulePerms: JSON.parse(JSON.stringify(initialModulePerms)),
            fieldPerms: JSON.parse(JSON.stringify(initialFieldPerms)),
          });
        } else {
          setModulePerms(initialModulePerms);
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

  const hasChanges =
    !isNew &&
    originalData &&
    (name !== originalData.name ||
      description !== originalData.description ||
      color !== originalData.color ||
      JSON.stringify(selectedMembers.sort()) !== JSON.stringify(originalData.members.sort()) ||
      JSON.stringify(modulePerms) !== JSON.stringify(originalData.modulePerms) ||
      JSON.stringify(fieldPerms) !== JSON.stringify(originalData.fieldPerms));

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((i) => i !== userId) : [...prev, userId]
    );
  };

  // Module Action Toggle (create, read, update, delete)
  const handleToggleModuleAction = (
    moduleKey: string,
    action: "create" | "read" | "update" | "delete"
  ) => {
    setModulePerms((prev) => {
      const current = prev[moduleKey] || { create: true, read: true, update: true, delete: true };
      return {
        ...prev,
        [moduleKey]: {
          ...current,
          [action]: !current[action],
        },
      };
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
      for (const mod of MODULE_DEFS) {
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

  // Field Action Toggle (read, write, update, delete)
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
      const modelDef = MODEL_FIELDS[modelKey];
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

    // Flatten modulePerms into array
    const modulePermissionsArray: Array<{
      module: string;
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    }> = [];

    const legacyPermissionsArray: string[] = [];

    for (const [modKey, perms] of Object.entries(modulePerms)) {
      modulePermissionsArray.push({
        module: modKey,
        create: perms.create,
        read: perms.read,
        update: perms.update,
        delete: perms.delete,
      });

      if (perms.create) legacyPermissionsArray.push(`${modKey}:create`);
      if (perms.read) legacyPermissionsArray.push(`${modKey}:read`);
      if (perms.update) legacyPermissionsArray.push(`${modKey}:update`);
      if (perms.delete) legacyPermissionsArray.push(`${modKey}:delete`);
      if (perms.create && perms.read && perms.update && perms.delete) {
        legacyPermissionsArray.push(`${modKey}:manage`);
      }
    }

    // Flatten fieldPerms object into array for backend storage
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
      permissions: legacyPermissionsArray,
      modulePermissions: modulePermissionsArray,
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
          fieldPerms: JSON.parse(JSON.stringify(fieldPerms)),
        });
        setToastMessage("User group updated!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save user group", err);
      alert("Failed to save user group.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user group?")) return;
    try {
      setIsDeleting(true);
      await deleteUserGroup(id);
      router.push("/configuration/user-groups");
    } catch (err) {
      console.error("Failed to delete group", err);
      alert("Failed to delete group.");
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
  const currentModelFields = MODEL_FIELDS[activeModelTab]?.fields || [];

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

          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 h-7 px-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-md transition-colors bg-card shadow-sm text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
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

          {/* ── Module-Level Permissions Matrix (Create, Read, Update, Delete) ── */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Module-Level Permissions (CRUD)</h3>
                  <p className="text-xs text-muted-foreground">Grant or restrict Create, Read, Update, and Delete access across entire modules</p>
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

            {/* Module CRUD Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] text-muted-foreground uppercase bg-muted/10 border-b border-border/50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Module</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold text-center w-24">
                      <div className="flex items-center justify-center gap-1" title="Create (Add new records)">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Create</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-center w-24">
                      <div className="flex items-center justify-center gap-1" title="Read (View records & lists)">
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span>Read</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-center w-24">
                      <div className="flex items-center justify-center gap-1" title="Update / Write (Modify existing records)">
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
                  {MODULE_DEFS.map((mod) => {
                    const currentPerm = modulePerms[mod.key] || {
                      create: true,
                      read: true,
                      update: true,
                      delete: true,
                    };

                    const isAll = currentPerm.create && currentPerm.read && currentPerm.update && currentPerm.delete;
                    const isReadOnly = !currentPerm.create && currentPerm.read && !currentPerm.update && !currentPerm.delete;
                    const isNone = !currentPerm.create && !currentPerm.read && !currentPerm.update && !currentPerm.delete;

                    return (
                      <tr key={mod.key} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/70" />
                            <span className="font-semibold text-sm">{mod.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs">
                          {mod.desc}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAction(mod.key, "create")}
                            className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                              currentPerm.create
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                            }`}
                            title={`Toggle Create for ${mod.label}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAction(mod.key, "read")}
                            className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                              currentPerm.read
                                ? "bg-blue-500 text-white shadow-sm"
                                : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                            }`}
                            title={`Toggle Read for ${mod.label}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAction(mod.key, "update")}
                            className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                              currentPerm.update
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                            }`}
                            title={`Toggle Update for ${mod.label}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAction(mod.key, "delete")}
                            className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                              currentPerm.delete
                                ? "bg-red-500 text-white shadow-sm"
                                : "bg-muted/50 text-muted-foreground/40 hover:bg-muted"
                            }`}
                            title={`Toggle Delete for ${mod.label}`}
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
                            <option value="all">Full (CRUD)</option>
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

          {/* ── Field-Level Permissions Matrix (Read, Write, Update, Delete) ── */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Field-Level Access Control (CRUD)</h3>
                  <p className="text-xs text-muted-foreground">Configure Read, Write, Update, and Delete permissions per field across models</p>
                </div>
              </div>

              {/* Model Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetModelPreset(activeModelTab, "all")}
                  className="text-[11px] px-2.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
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
              {Object.entries(MODEL_FIELDS).map(([key, def]) => (
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
                  {def.label}
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

          {/* Group Members Selector */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Group Members</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedMembers.length} members
              </span>
            </div>
            <div className="p-5">
              {availableUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableUsers.map((u) => {
                    const isSelected = selectedMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => handleToggleMember(u._id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-primary/5 border-primary/40"
                            : "bg-muted/10 border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {u.name?.charAt(0) || u.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {u.name || (u.authType === 'guest' ? 'Guest User' : 'User')}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {u.email || "No email"}
                            </div>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No users found in the system.
                </div>
              )}
            </div>
          </div>

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
    </div>
  );
}
