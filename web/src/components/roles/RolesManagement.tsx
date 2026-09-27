"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Layers,
  Eye,
  Plus,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import RoleList from "./RoleList";
import RoleDialog, { RoleItem, ModuleDef, RoleMember } from "./RoleDialog";
import RoleAccessPreview from "./RoleAccessPreview";
import { fetchRoles, fetchAccessCatalog, fetchUsers } from "../../lib/api";

export default function RolesManagement() {
  const [activeTab, setActiveTab] = useState<"roles" | "preview">("roles");

  // Data State
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [catalog, setCatalog] = useState<ModuleDef[]>([]);
  const [allUsers, setAllUsers] = useState<RoleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  // Success notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, catalogData, usersData] = await Promise.all([
        fetchRoles(),
        fetchAccessCatalog(),
        fetchUsers(),
      ]);

      setRoles(rolesData || []);
      setCatalog(catalogData || []);
      setAllUsers(usersData || []);
    } catch (err: any) {
      console.error("Failed to load roles data:", err);
      setError(
        err?.response?.data?.message || err?.message || "Failed to load roles and catalog."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for dialog
  const handleOpenCreate = () => {
    setSelectedRole(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleCloneRole = (role: RoleItem) => {
    const cloned: RoleItem = {
      ...role,
      _id: "",
      name: `${role.name} (Copy)`,
      slug: `${role.slug}-copy`,
      isSystem: false,
      members: [],
    };
    setSelectedRole(cloned);
    setIsDialogOpen(true);
  };

  const handleSaved = () => {
    loadData();
    showToast(
      selectedRole?._id
        ? `Role "${selectedRole.name}" updated successfully. Policy recompiled.`
        : "New role created successfully. Policy recompiled."
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl animate-in slide-in-from-bottom duration-200 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Tabbed Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "roles"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4 text-primary" />
            <span>Roles & Permissions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
              {roles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-4 h-4 text-indigo-500" />
            <span>Live Access Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-card border border-border/70 rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh roles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Error loading roles</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* TAB 1: Roles List */}
      {activeTab === "roles" && (
        <RoleList
          roles={roles}
          catalog={catalog}
          allUsers={allUsers}
          loading={loading}
          onRefresh={loadData}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onCloneRole={handleCloneRole}
        />
      )}

      {/* TAB 2: Live Access Preview */}
      {activeTab === "preview" && (
        <div>
          <div className="mb-4 p-4 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>
              This live inspector computes the exact merged policy rights for any user across all their assigned roles. Select a user below to inspect their effective permissions.
            </span>
          </div>
          <RoleAccessPreview />
        </div>
      )}

      {/* Role Builder Dialog Modal */}
      <RoleDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSaved={handleSaved}
        role={selectedRole}
        catalog={catalog}
        allUsers={allUsers}
      />
    </div>
  );
}
