"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, Check, X, Loader2,
  User as UserIcon, Mail, Shield, Crown, Briefcase,
  Calendar, ArrowLeft, Trash2, UserCheck, Info
} from "lucide-react";
import { useSidebar } from "@/src/components/layout/SidebarContext";
import { fetchUserById, fetchUsers, updateUser, deleteUser } from "@/src/lib/api";
import { RecordNavigator } from "@/src/components/common/RecordNavigator";
import { useCompanyPath, CompanyLink } from "@/src/lib/useCompanyPath";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const cp = useCompanyPath();
  const { isOpen, toggleSidebar } = useSidebar();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");

  const [userData, setUserData] = useState<any>(null);
  const [originalName, setOriginalName] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserById(id);
        if (!data) {
          router.push(cp("/configuration/users"));
          return;
        }
        setUserData(data);
        setName(data.name || "");
        setOriginalName(data.name || "");
      } catch (err) {
        console.error("Failed to load user", err);
        router.push(cp("/configuration/users"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router, cp]);

  const [allUserIds, setAllUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers().then((users) => {
      if (users && Array.isArray(users)) {
        setAllUserIds(users.map((u: any) => u._id || u.id));
      }
    }).catch((err) => console.error("Failed to load user list", err));
  }, []);

  const hasChanges = name !== originalName;

  const userIndex = allUserIds.indexOf(id);
  const totalUsers = allUserIds.length;
  const currentUserNum = userIndex >= 0 ? userIndex + 1 : 1;

  const navigateToUser = (targetId: string) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard and navigate to the other user?")) {
        return;
      }
    }
    router.push(cp(`/configuration/users/${targetId}`));
  };

  const handlePrevUser = () => {
    if (userIndex > 0) {
      navigateToUser(allUserIds[userIndex - 1]);
    }
  };

  const handleNextUser = () => {
    if (userIndex >= 0 && userIndex < totalUsers - 1) {
      navigateToUser(allUserIds[userIndex + 1]);
    }
  };

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToastType(type);
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateUser(id, { name });
      setUserData(updated);
      setOriginalName(name);
      showToast("User updated successfully!");
    } catch (err) {
      console.error("Failed to update user", err);
      alert("Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this user from the company?")) return;
    try {
      setIsDeleting(true);
      await deleteUser(id);
      router.push(cp("/configuration/users"));
    } catch (err) {
      console.error("Failed to delete user", err);
      alert("Failed to delete user.");
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

  const displayName = userData?.name || "Company Member";
  const isOwner = !!userData?.isCompanyOwner;
  const isEmployee = !!userData?.employeeId;
  const membershipStatus = userData?.membershipStatus || "active";

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
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate">
            <CompanyLink href="/configuration/users" className="hover:text-foreground transition-colors">
              Users
            </CompanyLink>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[220px]">
              {displayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalUsers > 0 && (
            <RecordNavigator
              current={currentUserNum}
              total={totalUsers}
              onPrev={handlePrevUser}
              onNext={handleNextUser}
              hasPrev={userIndex > 0}
              hasNext={userIndex >= 0 && userIndex < totalUsers - 1}
            />
          )}
          {hasChanges ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setName(originalName)}
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
            <CompanyLink
              href="/configuration/users"
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </CompanyLink>
          )}
          {!isOwner && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 h-7 px-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-md transition-colors bg-card shadow-sm text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Member
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Profile Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-transparent" />
            <div className="px-6 pb-6 -mt-8">
              <div className="flex items-end justify-between gap-4">
                {/* Avatar */}
                {userData?.avatarUrl ? (
                  <img
                    src={userData.avatarUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-2xl object-cover shadow-md border-4 border-card shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-md border-4 border-card shrink-0">
                    {displayName?.charAt(0)?.toUpperCase() || <UserIcon className="w-8 h-8" />}
                  </div>
                )}
                {/* Role / Ownership Badge */}
                {isOwner ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Crown className="w-3.5 h-3.5" /> Company Owner
                  </span>
                ) : isEmployee ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Briefcase className="w-3.5 h-3.5" /> Linked Employee
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Shield className="w-3.5 h-3.5" /> Company Member
                  </span>
                )}
              </div>

              {/* Name Field */}
              <div className="mt-6 space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full text-base font-semibold text-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ── Read-only Membership & Access Card (replaces retired Employee / System Admin toggles) ── */}
          {/* TODO: PBAC role management arrives with the PBAC plan. Replace this read-only membership view with full role and permission assignment. */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Company Membership & Access</h3>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                Read-Only
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div>
                  <p className="text-sm font-medium text-foreground">Membership Status</p>
                  <p className="text-xs text-muted-foreground">Current standing within this company</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 capitalize">
                  <UserCheck className="w-3.5 h-3.5" />
                  {membershipStatus}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div>
                  <p className="text-sm font-medium text-foreground">Company Role</p>
                  <p className="text-xs text-muted-foreground">Primary access privilege level</p>
                </div>
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Crown className="w-3 h-3" />
                    Owner
                  </span>
                ) : isEmployee ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Briefcase className="w-3 h-3" />
                    Employee
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <Shield className="w-3 h-3" />
                    Member
                  </span>
                )}
              </div>

              {userData?.employeeId && (
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <div>
                    <p className="text-sm font-medium text-foreground">Linked Employee ID</p>
                    <p className="text-xs text-muted-foreground">Associated profile in the Employees directory</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/50">
                    {userData.employeeId}
                  </span>
                </div>
              )}

              {/* Info Note about PBAC plan */}
              <div className="rounded-lg p-3 text-xs leading-relaxed border bg-muted/30 border-border/50 text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>
                  Role configuration and granular permissions are managed at the company level. Fine-grained policy-based access control (PBAC) will arrive in an upcoming release.
                </span>
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Account Information</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</span>
                <div className="flex items-center gap-2 text-sm text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{userData?.email || "No email available"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User ID</span>
                <div className="text-sm font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50 select-all">
                  {userData?._id}
                </div>
              </div>

              {userData?.membershipId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Membership ID</span>
                  <div className="text-sm font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50 select-all">
                    {userData.membershipId}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Active</span>
                <div className="flex items-center gap-2 text-sm text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{userData?.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : "Never"}</span>
                </div>
              </div>

              {userData?.joinedAt && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Joined Company</span>
                  <div className="flex items-center gap-2 text-sm text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{new Date(userData.joinedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toastType === "info"
              ? "bg-muted border border-border text-foreground"
              : "bg-primary text-primary-foreground"
          }`}>
            <Check className="w-4 h-4 shrink-0" />
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
