"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldCheck,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Lock,
  Unlock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { fetchUsers, fetchAccessPreview } from "../../lib/api";
import { useAccess } from "../../contexts/AccessContext";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PreviewUser {
  _id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  is_system_admin?: boolean;
}

interface FieldAccess {
  read: boolean;
  update: boolean;
}

interface ModuleAccess {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  scope: string;
  fields?: Record<string, FieldAccess>;
}

interface EffectiveRole {
  id: string;
  name: string;
  slug: string;
  priority: number;
  color?: string;
}

interface AccessPreviewData {
  roles: EffectiveRole[];
  policyVersion: number;
  access: Record<string, ModuleAccess>;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Colored permission chip */
function PermChip({
  granted,
  label,
  icon: Icon,
}: {
  granted: boolean;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
        granted
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-muted/50 text-muted-foreground/50"
      }`}
      title={`${label}: ${granted ? "Granted" : "Denied"}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/** Scope badge */
function ScopeBadge({ scope }: { scope: string }) {
  const map: Record<string, string> = {
    all: "bg-violet-500/15 text-violet-400",
    team: "bg-blue-500/15 text-blue-400",
    own: "bg-amber-500/15 text-amber-400",
    none: "bg-muted/50 text-muted-foreground/50",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
        map[scope] ?? map.none
      }`}
    >
      <Layers className="w-3 h-3" />
      {scope}
    </span>
  );
}

/** Expandable module row */
function ModuleRow({
  moduleId,
  mod,
}: {
  moduleId: string;
  mod: ModuleAccess;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = mod.fields ?? {};
  const fieldKeys = Object.keys(fields);
  const hasFields = fieldKeys.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Module header */}
      <button
        type="button"
        onClick={() => hasFields && setExpanded((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasFields ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
        }`}
      >
        <span className="w-4 flex-shrink-0 text-muted-foreground">
          {hasFields ? (
            expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4 h-4 block" />
          )}
        </span>

        <span className="text-sm font-semibold text-foreground flex-1 min-w-0 truncate capitalize">
          {moduleId.replace(".", " — ")}
        </span>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <PermChip granted={mod.create} label="C" icon={Plus} />
          <PermChip granted={mod.read} label="R" icon={Eye} />
          <PermChip granted={mod.update} label="U" icon={Pencil} />
          <PermChip granted={mod.delete} label="D" icon={Trash2} />
          <ScopeBadge scope={mod.scope} />
        </div>
      </button>

      {/* Field details */}
      {expanded && hasFields && (
        <div className="border-t border-border">
          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold bg-muted/30">
            <span className="pl-7">Field</span>
            <span className="text-center">Read</span>
            <span className="text-center">Update</span>
          </div>

          {fieldKeys.map((fieldKey) => {
            const f = fields[fieldKey];
            return (
              <div
                key={fieldKey}
                className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2.5 text-xs border-t border-border/50 hover:bg-muted/20 transition-colors"
              >
                <span className="pl-7 text-foreground/80 font-medium truncate">
                  {fieldKey}
                </span>
                <span className="flex justify-center">
                  {f.read ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </span>
                <span className="flex justify-center">
                  {f.update ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RoleAccessPreview() {
  const { user: currentUser } = useAccess();

  const [users, setUsers] = useState<PreviewUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AccessPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* Load users */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchUsers();
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Fetch preview on user change */
  useEffect(() => {
    if (!selectedUserId) { setPreviewData(null); return; }
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await fetchAccessPreview(selectedUserId);
        if (!cancelled) setPreviewData(data);
      } catch (err: any) {
        if (!cancelled) setPreviewError(err?.response?.data?.message || err?.message || "Failed to load preview");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedUserId]);

  /* Filtered users */
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) => (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const isSelf = selectedUserId === currentUser?._id;

  const handleSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setDropdownOpen(false);
    setSearchQuery("");
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-preview-dd]")) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  /* Stats */
  const stats = useMemo(() => {
    if (!previewData?.access) return null;
    const mods = Object.keys(previewData.access);
    return {
      total: mods.length,
      readable: mods.filter((m) => previewData.access[m].read).length,
      writable: mods.filter((m) => previewData.access[m].update).length,
    };
  }, [previewData]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">

      {/* ── User Picker Card ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Access Preview</h2>
            <p className="text-xs text-muted-foreground">Select a user to inspect their effective permissions</p>
          </div>
        </div>

        {/* Dropdown trigger — positioned relative here, dropdown portals below */}
        <div className="relative" data-preview-dd>
          <button
            type="button"
            onClick={() => setDropdownOpen((p) => !p)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors text-left"
          >
            {selectedUser ? (
              <>
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">
                    {selectedUser.name || "Unnamed"}
                    {isSelf && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground truncate block">{selectedUser.email}</span>
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground flex-1">
                {usersLoading ? "Loading users…" : "Choose a user to preview…"}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown list */}
          {dropdownOpen && (
            <div className="absolute z-50 mt-1.5 w-full max-h-80 rounded-lg border border-border bg-card shadow-xl shadow-black/20 flex flex-col">
              {/* Search */}
              <div className="p-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search users…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-md bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto overscroll-contain max-h-56">
                {filteredUsers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users found</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => handleSelect(u._id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                        u._id === selectedUserId ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                      }`}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">
                          {u.name || "Unnamed"}
                          {u.is_system_admin && <Shield className="inline w-3 h-3 ml-1 text-amber-400" />}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate block">{u.email}</span>
                      </div>
                      {u._id === currentUser?._id && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">You</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {previewLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <span className="ml-3 text-sm text-muted-foreground">Loading access preview…</span>
        </div>
      )}

      {/* ── Error ── */}
      {previewError && !previewLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">{previewError}</span>
        </div>
      )}

      {/* ── Empty State ── */}
      {!selectedUserId && !previewLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">Select a user above to preview their effective permissions</p>
        </div>
      )}

      {/* ── Preview Results ── */}
      {previewData && !previewLoading && (
        <div className="space-y-5">

          {/* Roles + Stats */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            {/* Roles */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                Effective Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {previewData.roles.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No roles assigned</span>
                ) : (
                  previewData.roles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-border bg-muted/50"
                      style={{ color: role.color || undefined }}
                    >
                      <Shield className="w-3 h-3" />
                      {role.name}
                      <span className="text-[10px] opacity-50 ml-0.5">P{role.priority}</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Stats bar */}
            {stats && (
              <div className="flex items-center gap-5 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="font-bold text-foreground">{stats.total}</span> modules
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">{stats.readable}</span> readable
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-blue-400">{stats.writable}</span> writable
                </div>
                <span className="ml-auto text-[11px] text-muted-foreground/60">
                  Policy v{previewData.policyVersion}
                </span>
              </div>
            )}

            {/* Self-preview hint */}
            {isSelf && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/15 text-xs text-primary">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                This matches your own effective access from /auth/me
              </div>
            )}
          </div>

          {/* Module Matrix */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              Module Permissions
            </h3>
            <div className="space-y-2">
              {Object.keys(previewData.access)
                .sort()
                .map((moduleId) => (
                  <ModuleRow key={moduleId} moduleId={moduleId} mod={previewData.access[moduleId]} />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
