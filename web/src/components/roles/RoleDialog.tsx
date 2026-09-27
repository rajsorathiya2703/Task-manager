"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Shield,
  Layers,
  Sliders,
  Users,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { createRole, updateRole } from "../../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FieldDef {
  key: string;
  label: string;
  sensitive?: boolean;
}

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  actions: string[];
  fields: FieldDef[];
}

export interface RoleMember {
  _id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ModuleGrantItem {
  module: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: "none" | "own" | "team" | "all";
  operations?: string[];
}

export interface FieldGrantItem {
  module: string;
  field: string;
  read: boolean;
  update: boolean;
}

export interface RoleItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  priority: number;
  isSystem: boolean;
  isActive: boolean;
  members: RoleMember[] | string[];
  moduleGrants: ModuleGrantItem[];
  fieldGrants: FieldGrantItem[];
}

interface RoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  role: RoleItem | null;
  catalog: ModuleDef[];
  allUsers: RoleMember[];
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#64748b", // Slate
];

const SCOPES: Array<"none" | "own" | "team" | "all"> = ["none", "own", "team", "all"];

export default function RoleDialog({
  isOpen,
  onClose,
  onSaved,
  role,
  catalog,
  allUsers,
}: RoleDialogProps) {
  const isEditing = Boolean(role);

  // Tabs: 'general' | 'modules' | 'fields' | 'members'
  const [activeTab, setActiveTab] = useState<"general" | "modules" | "fields" | "members">("general");

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [priority, setPriority] = useState(20);
  const [isActive, setIsActive] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Grants state: moduleId -> ModuleGrantItem
  const [moduleGrants, setModuleGrants] = useState<Record<string, ModuleGrantItem>>({});

  // Field grants state: "moduleId:fieldName" -> FieldGrantItem
  const [fieldGrants, setFieldGrants] = useState<Record<string, FieldGrantItem>>({});

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState("");
  const [expandedFieldModule, setExpandedFieldModule] = useState<string | null>(null);

  // Populate state on open or role change
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setActiveTab("general");

    if (role) {
      setName(role.name || "");
      setSlug(role.slug || "");
      setDescription(role.description || "");
      setColor(role.color || "#6366f1");
      setPriority(role.priority ?? 20);
      setIsActive(role.isActive !== false);

      const mIds = (role.members || []).map((m) =>
        typeof m === "string" ? m : m._id
      );
      setSelectedMemberIds(mIds);

      // Build moduleGrants map
      const mgMap: Record<string, ModuleGrantItem> = {};
      for (const mod of catalog) {
        const found = (role.moduleGrants || []).find((g) => g.module === mod.id);
        if (found) {
          mgMap[mod.id] = {
            module: mod.id,
            create: Boolean(found.create),
            read: Boolean(found.read),
            update: Boolean(found.update),
            delete: Boolean(found.delete),
            scope: found.scope || "none",
            operations: found.operations || [],
          };
        } else {
          mgMap[mod.id] = {
            module: mod.id,
            create: false,
            read: false,
            update: false,
            delete: false,
            scope: "none",
          };
        }
      }
      setModuleGrants(mgMap);

      // Build fieldGrants map
      const fgMap: Record<string, FieldGrantItem> = {};
      for (const fg of role.fieldGrants || []) {
        fgMap[`${fg.module}:${fg.field}`] = {
          module: fg.module,
          field: fg.field,
          read: Boolean(fg.read),
          update: Boolean(fg.update),
        };
      }
      setFieldGrants(fgMap);
    } else {
      // New Role defaults
      setName("");
      setSlug("");
      setDescription("");
      setColor("#6366f1");
      setPriority(25);
      setIsActive(true);
      setSelectedMemberIds([]);

      const mgMap: Record<string, ModuleGrantItem> = {};
      for (const mod of catalog) {
        mgMap[mod.id] = {
          module: mod.id,
          create: false,
          read: false,
          update: false,
          delete: false,
          scope: "none",
        };
      }
      setModuleGrants(mgMap);
      setFieldGrants({});
    }
  }, [isOpen, role, catalog]);

  // Auto-slugify name when creating new role
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Module grant manipulation with invariants                        */
  /* ------------------------------------------------------------------ */

  const updateModuleGrant = (
    moduleId: string,
    field: "create" | "read" | "update" | "delete" | "scope",
    val: any
  ) => {
    setModuleGrants((prev) => {
      const current = prev[moduleId] || {
        module: moduleId,
        create: false,
        read: false,
        update: false,
        delete: false,
        scope: "none",
      };

      const updated = { ...current, [field]: val };

      // Invariant: If read becomes false, create, update, delete become false, and scope resets to none
      if (field === "read" && !val) {
        updated.create = false;
        updated.update = false;
        updated.delete = false;
        updated.scope = "none";
      }

      // If scope is set to something other than none, ensure read is true
      if (field === "scope" && val !== "none" && !updated.read) {
        updated.read = true;
      }

      // If create, update, or delete is enabled, ensure read is enabled
      if ((field === "create" || field === "update" || field === "delete") && val) {
        updated.read = true;
        if (updated.scope === "none") {
          updated.scope = "own";
        }
      }

      return { ...prev, [moduleId]: updated };
    });
  };

  const applyModulePreset = (moduleId: string, preset: "full" | "readonly" | "none") => {
    setModuleGrants((prev) => {
      if (preset === "full") {
        return {
          ...prev,
          [moduleId]: {
            module: moduleId,
            create: true,
            read: true,
            update: true,
            delete: true,
            scope: "all",
          },
        };
      } else if (preset === "readonly") {
        return {
          ...prev,
          [moduleId]: {
            module: moduleId,
            create: false,
            read: true,
            update: false,
            delete: false,
            scope: "team",
          },
        };
      } else {
        return {
          ...prev,
          [moduleId]: {
            module: moduleId,
            create: false,
            read: false,
            update: false,
            delete: false,
            scope: "none",
          },
        };
      }
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Field grant manipulation with invariants                         */
  /* ------------------------------------------------------------------ */

  const getFieldGrant = (moduleId: string, fieldName: string): FieldGrantItem => {
    const key = `${moduleId}:${fieldName}`;
    if (fieldGrants[key]) return fieldGrants[key];

    // Default inherits from module grant
    const mod = moduleGrants[moduleId];
    return {
      module: moduleId,
      field: fieldName,
      read: mod ? mod.read : false,
      update: mod ? mod.update : false,
    };
  };

  const updateFieldGrant = (
    moduleId: string,
    fieldName: string,
    action: "read" | "update",
    val: boolean
  ) => {
    const key = `${moduleId}:${fieldName}`;
    setFieldGrants((prev) => {
      const current = getFieldGrant(moduleId, fieldName);
      let newRead = action === "read" ? val : current.read;
      let newUpdate = action === "update" ? val : current.update;

      // Invariant: field.update <= field.read
      if (action === "read" && !val) {
        newUpdate = false;
      }
      if (action === "update" && val) {
        newRead = true;
      }

      return {
        ...prev,
        [key]: {
          module: moduleId,
          field: fieldName,
          read: newRead,
          update: newUpdate,
        },
      };
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Save Handler                                                      */
  /* ------------------------------------------------------------------ */

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Role name is required");
      setActiveTab("general");
      return;
    }
    if (!slug.trim()) {
      setError("Role slug is required");
      setActiveTab("general");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const moduleGrantsArray = Object.values(moduleGrants);

      // Only save field grants that differ from default or are explicitly defined
      const fieldGrantsArray = Object.values(fieldGrants);

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        color,
        priority: Number(priority) || 0,
        isActive,
        members: selectedMemberIds,
        moduleGrants: moduleGrantsArray,
        fieldGrants: fieldGrantsArray,
      };

      if (isEditing && role) {
        await updateRole(role._id, payload);
      } else {
        await createRole(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to save role"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredModules = catalog.filter((m) =>
    m.label.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const filteredUsers = allUsers.filter((u) =>
    (u.name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEditing ? `Edit Role: ${role?.name}` : "Create New Role"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Update permissions, priority, or members"
                  : "Define custom permissions and scope"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-border/60 bg-muted/10 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "general"
                ? "border-primary text-primary bg-background shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            General Info
          </button>
          <button
            onClick={() => setActiveTab("modules")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "modules"
                ? "border-primary text-primary bg-background shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Module Permissions Matrix
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
              {catalog.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "fields"
                ? "border-primary text-primary bg-background shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Field Overrides
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "members"
                ? "border-primary text-primary bg-background shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Assign Members
            {selectedMemberIds.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-bold">
                {selectedMemberIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2.5 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Role Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Project Auditor"
                    className="w-full px-3.5 py-2 text-sm bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Slug identifier <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={Boolean(role?.isSystem)}
                    placeholder="e.g. project-auditor"
                    className="w-full px-3.5 py-2 text-sm bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                  />
                  {role?.isSystem && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      System role slug cannot be modified.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Summarize the responsibilities and privileges of this role..."
                  className="w-full px-3.5 py-2 text-sm bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Priority Rank */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    Priority Rank ({priority})
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Higher rank takes precedence in display & role badge
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                  <span>Employee (10)</span>
                  <span>Team Leader (40)</span>
                  <span>Manager (60)</span>
                  <span>Admin (100)</span>
                  <span>System Admin (1000)</span>
                </div>
              </div>

              {/* Badge Color */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">
                  Role Badge Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        color === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5 ml-2 border border-border/80 rounded-lg px-2 py-1 bg-background">
                    <span className="text-xs text-muted-foreground">#</span>
                    <input
                      type="text"
                      value={color.replace("#", "")}
                      onChange={(e) => setColor(`#${e.target.value}`)}
                      className="w-16 text-xs bg-transparent focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Role Active Status</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive roles do not grant any permissions to members
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MODULE MATRIX */}
          {activeTab === "modules" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Filter modules..."
                  className="max-w-xs px-3 py-1.5 text-xs bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>Unchecking &quot;Read&quot; automatically revokes Create, Update & Delete</span>
                </div>
              </div>

              <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/70 text-[11px] font-semibold text-muted-foreground">
                      <th className="py-2.5 px-4">Module</th>
                      <th className="py-2.5 px-3 text-center">Read</th>
                      <th className="py-2.5 px-3 text-center">Create</th>
                      <th className="py-2.5 px-3 text-center">Update</th>
                      <th className="py-2.5 px-3 text-center">Delete</th>
                      <th className="py-2.5 px-3 text-center">Scope</th>
                      <th className="py-2.5 px-3 text-right">Presets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredModules.map((mod) => {
                      const grant = moduleGrants[mod.id] || {
                        module: mod.id,
                        create: false,
                        read: false,
                        update: false,
                        delete: false,
                        scope: "none",
                      };

                      return (
                        <tr key={mod.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{mod.label}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">
                              {mod.description}
                            </div>
                          </td>
                          {/* Read */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={grant.read}
                              onChange={(e) =>
                                updateModuleGrant(mod.id, "read", e.target.checked)
                              }
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                          {/* Create */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={grant.create}
                              disabled={!grant.read}
                              onChange={(e) =>
                                updateModuleGrant(mod.id, "create", e.target.checked)
                              }
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-30 cursor-pointer"
                            />
                          </td>
                          {/* Update */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={grant.update}
                              disabled={!grant.read}
                              onChange={(e) =>
                                updateModuleGrant(mod.id, "update", e.target.checked)
                              }
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-30 cursor-pointer"
                            />
                          </td>
                          {/* Delete */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={grant.delete}
                              disabled={!grant.read}
                              onChange={(e) =>
                                updateModuleGrant(mod.id, "delete", e.target.checked)
                              }
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-30 cursor-pointer"
                            />
                          </td>
                          {/* Scope */}
                          <td className="py-3 px-3 text-center">
                            <select
                              value={grant.scope}
                              disabled={!grant.read}
                              onChange={(e) =>
                                updateModuleGrant(mod.id, "scope", e.target.value)
                              }
                              className="text-xs bg-background border border-border/80 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-30"
                            >
                              {SCOPES.map((sc) => (
                                <option key={sc} value={sc}>
                                  {sc.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Presets */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => applyModulePreset(mod.id, "full")}
                                className="px-2 py-0.5 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                              >
                                Full
                              </button>
                              <button
                                type="button"
                                onClick={() => applyModulePreset(mod.id, "readonly")}
                                className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium"
                              >
                                Read
                              </button>
                              <button
                                type="button"
                                onClick={() => applyModulePreset(mod.id, "none")}
                                className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium"
                              >
                                None
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FIELD OVERRIDES */}
          {activeTab === "fields" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>
                  By default, all fields inherit read/update rights from their module. Use this tab to surgically lock or hide specific columns (e.g., hiding salary, or making priority view-only).
                </span>
              </div>

              <div className="space-y-3">
                {catalog
                  .filter((m) => m.fields && m.fields.length > 0)
                  .map((mod) => {
                    const isExpanded = expandedFieldModule === mod.id;
                    const modGrant = moduleGrants[mod.id] || { read: false, update: false };

                    return (
                      <div
                        key={mod.id}
                        className="border border-border/70 rounded-xl overflow-hidden bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFieldModule(isExpanded ? null : mod.id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-xs text-foreground">
                              {mod.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {mod.fields.length} fields
                            </span>
                            {!modGrant.read && (
                              <span className="text-[10px] text-amber-500 font-medium">
                                (Module disabled)
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {isExpanded ? "Collapse" : "Configure"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-4 divide-y divide-border/40">
                            {mod.fields.map((f) => {
                              const grant = getFieldGrant(mod.id, f.key);
                              const disabled = !modGrant.read;

                              return (
                                <div
                                  key={f.key}
                                  className="flex items-center justify-between py-2.5"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-foreground">
                                        {f.label}
                                      </span>
                                      <code className="text-[10px] text-muted-foreground">
                                        ({f.key})
                                      </code>
                                      {f.sensitive && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold">
                                          Sensitive
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={grant.read}
                                        disabled={disabled}
                                        onChange={(e) =>
                                          updateFieldGrant(
                                            mod.id,
                                            f.key,
                                            "read",
                                            e.target.checked
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary disabled:opacity-30"
                                      />
                                      <span className="text-muted-foreground">Read</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={grant.update}
                                        disabled={disabled || !grant.read || !modGrant.update}
                                        onChange={(e) =>
                                          updateFieldGrant(
                                            mod.id,
                                            f.key,
                                            "update",
                                            e.target.checked
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary disabled:opacity-30"
                                      />
                                      <span className="text-muted-foreground">Update</span>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERS */}
          {activeTab === "members" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="max-w-xs px-3 py-1.5 text-xs bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedMemberIds.length} of {allUsers.length} selected
                </span>
              </div>

              <div className="border border-border/70 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto divide-y divide-border/40">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No users match your search.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedMemberIds.includes(u._id);

                    return (
                      <div
                        key={u._id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMemberIds((prev) => prev.filter((id) => id !== u._id));
                          } else {
                            setSelectedMemberIds((prev) => [...prev, u._id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground overflow-hidden">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (u.name || u.email || "U")[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">
                              {u.name || "Unnamed User"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{u.email}</div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Role...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEditing ? "Update Role" : "Create Role"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
