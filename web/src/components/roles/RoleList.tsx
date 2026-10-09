"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Users,
  Layers,
  Sparkles,
  Lock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { RoleItem, ModuleDef, RoleMember } from "./RoleDialog";
import { deleteRole } from "../../lib/api";

interface RoleListProps {
  roles: RoleItem[];
  catalog: ModuleDef[];
  allUsers: RoleMember[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (role: RoleItem) => void;
  onCloneRole: (role: RoleItem) => void;
}

export default function RoleList({
  roles,
  catalog,
  allUsers,
  loading,
  onRefresh,
  onOpenCreate,
  onOpenEdit,
  onCloneRole,
}: RoleListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteRole(roleToDelete._id);
      setRoleToDelete(null);
      onRefresh();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message || err?.message || "Failed to delete role"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roles..."
              className="pl-9 pr-4 py-2 text-xs bg-card border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 shadow-xs"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
            {roles.length} Roles Defined
          </span>
        </div>

        <button
          onClick={onOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Loading roles and permissions...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-16 bg-card border border-dashed border-border/80 rounded-2xl text-center">
          <Shield className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No roles found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            {searchTerm
              ? "No roles match your search criteria. Try a different query."
              : "Get started by creating your first custom access role."}
          </p>
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Role
          </button>
        </div>
      ) : (
        /* Roles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role) => {
            const validUserIds = new Set(allUsers.map((u) => u._id));
            const memberCount = Array.isArray(role.members)
              ? role.members.filter((m) => {
                  const id = typeof m === "string" ? m : (m as any)?._id;
                  return validUserIds.size === 0 || validUserIds.has(id);
                }).length
              : 0;
            const grantedModules = (role.moduleGrants || []).filter((g) => g.read);

            return (
              <div
                key={role._id}
                className="group relative bg-card border border-border/70 hover:border-border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                        style={{ backgroundColor: role.color || "#6366f1" }}
                      >
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {role.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {role.slug}
                          </code>
                          {role.isSystem && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 text-muted-foreground"
                        title="Priority ranking for access arbitration"
                      >
                        Rank {role.priority}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] mb-4">
                    {role.description || "No description provided."}
                  </p>

                  {/* Permissions Summary Badges */}
                  <div className="space-y-2 mb-4 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-primary" />
                        Enabled Modules ({grantedModules.length}/{catalog.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {grantedModules.slice(0, 4).map((gm) => (
                        <span
                          key={gm.module}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/40"
                        >
                          {gm.module} ({gm.scope})
                        </span>
                      ))}
                      {grantedModules.length > 4 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                          +{grantedModules.length - 4} more
                        </span>
                      )}
                      {grantedModules.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">
                          No module grants configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Members Summary */}
                  <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {memberCount} assigned user{memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEdit(role)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors border border-border/60"
                      title="Edit role permissions and properties"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onCloneRole(role)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors border border-border/60"
                      title="Duplicate as new role"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {!role.isSystem ? (
                    <button
                      onClick={() => setRoleToDelete(role)}
                      className="p-1.5 text-destructive/70 hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Delete custom role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span
                      className="p-1.5 text-muted-foreground/40 cursor-not-allowed"
                      title="Built-in system roles cannot be deleted"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive mb-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Role</h3>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to delete the role{" "}
              <strong className="text-foreground">{roleToDelete.name}</strong>? Any users assigned to this role will lose these permissions immediately upon policy recompilation.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
