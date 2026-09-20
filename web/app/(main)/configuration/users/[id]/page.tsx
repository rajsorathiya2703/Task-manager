"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, Check, X, Loader2,
  User as UserIcon, Mail, Shield, ShieldCheck, Globe, Sparkles,
  Calendar, ArrowLeft, Trash2, Briefcase, UserCheck
} from "lucide-react";
import { useSidebar } from "../../../../../src/components/layout/SidebarContext";
import { fetchUserById, fetchUsers, updateUser, deleteUser } from "../../../../../src/lib/api";
import { RecordNavigator } from "../../../../../src/components/common/RecordNavigator";
import Link from "next/link";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isOpen, toggleSidebar } = useSidebar();

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingEmployee, setIsTogglingEmployee] = useState(false);
  const [isTogglingSystemAdmin, setIsTogglingSystemAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");

  const [userData, setUserData] = useState<any>(null);
  const [originalName, setOriginalName] = useState("");
  const [name, setName] = useState("");
  // Local mirror of is_employee so the toggle feels instant
  const [isEmployee, setIsEmployee] = useState(false);
  // Local mirror of is_system_admin (default true unless false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserById(id);
        if (!data) {
          router.push("/configuration/users");
          return;
        }
        setUserData(data);
        setName(data.name || "");
        setOriginalName(data.name || "");
        setIsEmployee(!!data.is_employee);
        setIsSystemAdmin(data.is_system_admin !== false);
      } catch (err) {
        console.error("Failed to load user", err);
        router.push("/configuration/users");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

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
    router.push(`/configuration/users/${targetId}`);
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
      setIsEmployee(!!updated.is_employee);
      setIsSystemAdmin(updated.is_system_admin !== false);
      showToast("User updated successfully!");
    } catch (err) {
      console.error("Failed to update user", err);
      alert("Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Toggle the is_employee flag.
   * - Turning ON  → PATCH { is_employee: true }  → backend creates/links Employee
   * - Turning OFF → PATCH { is_employee: false } → backend only clears the flag,
   *   the Employee record is NOT deleted (by design, as per spec).
   */
  const handleEmployeeToggle = async () => {
    const next = !isEmployee;
    setIsEmployee(next); // optimistic update for snappy UX
    setIsTogglingEmployee(true);
    try {
      const updated = await updateUser(id, { is_employee: next });
      setUserData(updated);
      setIsEmployee(!!updated.is_employee);
      if (next) {
        showToast("Employee record created and linked!", "success");
      } else {
        showToast("Employee flag removed. Existing employee record kept.", "info");
      }
    } catch (err) {
      // Roll back optimistic update on error
      setIsEmployee(!next);
      console.error("Failed to toggle employee status", err);
      alert("Failed to update employee status.");
    } finally {
      setIsTogglingEmployee(false);
    }
  };

  /**
   * Toggle the is_system_admin flag.
   */
  const handleSystemAdminToggle = async () => {
    const next = !isSystemAdmin;
    setIsSystemAdmin(next); // optimistic update
    setIsTogglingSystemAdmin(true);
    try {
      const updated = await updateUser(id, { is_system_admin: next });
      setUserData(updated);
      setIsSystemAdmin(updated.is_system_admin !== false);
      if (next) {
        showToast("System Administrator access granted!", "success");
      } else {
        showToast("System Administrator access revoked.", "info");
      }
    } catch (err) {
      setIsSystemAdmin(!next);
      console.error("Failed to toggle system admin status", err);
      alert("Failed to update system administrator status.");
    } finally {
      setIsTogglingSystemAdmin(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      setIsDeleting(true);
      await deleteUser(id);
      router.push("/configuration/users");
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

  const displayName = userData?.name || (userData?.authType === 'guest' ? 'Guest User' : 'User');

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
            <Link href="/configuration/users" className="hover:text-foreground transition-colors">
              Users
            </Link>
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
            <Link
              href="/configuration/users"
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 h-7 px-3 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-md transition-colors bg-card shadow-sm text-xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
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
                {/* Auth Type Badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  userData?.authType === 'google'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                }`}>
                  {userData?.authType === 'google' ? <Globe className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {userData?.authType === 'google' ? 'Google Account' : 'Guest Account'}
                </span>
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

          {/* ── Employee Status Card ── */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Employee Status</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                {/* Left: description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Mark as Employee</p>
                    {isEmployee && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <UserCheck className="w-3 h-3" />
                        Active Employee
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isEmployee
                      ? "This user has an active employee record linked to their account."
                      : "Enable to automatically create a linked Employee record for this user."}
                  </p>
                  {isEmployee && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                      Note: disabling this flag does not delete the existing employee record.
                    </p>
                  )}
                </div>

                {/* Right: toggle switch */}
                <button
                  id="employee-toggle"
                  role="switch"
                  aria-checked={isEmployee}
                  aria-label="Toggle employee status"
                  disabled={isTogglingEmployee}
                  onClick={handleEmployeeToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isEmployee
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out mt-0.5 ${
                      isEmployee ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  >
                    {isTogglingEmployee && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                      </span>
                    )}
                  </span>
                </button>
              </div>

              {/* What happens info box */}
              <div className={`mt-4 rounded-lg p-3 text-xs leading-relaxed border transition-colors duration-200 ${
                isEmployee
                  ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted/40 border-border/50 text-muted-foreground"
              }`}>
                {isEmployee ? (
                  <span className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      An <strong>Employee record</strong> has been created and linked to this user. You can now assign them to teams and tasks via the Employees section.
                    </span>
                  </span>
                ) : (
                  <span className="flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Enabling this will automatically create an <strong>Employee record</strong> linked to this user account. If a matching employee email already exists, it will be linked instead of creating a duplicate.
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── System Administrator Status Card ── */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <h3 className="font-semibold text-foreground text-sm">System Administrator Role</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-4">
                {/* Left: description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">System Administrator Privileges</p>
                    {isSystemAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        System Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isSystemAdmin
                      ? "This user has full access to configuration modules (Employees, Users, User Groups)."
                      : "Enable to grant this user access to Employees, Users, and User Groups in the sidebar and routes."}
                  </p>
                </div>

                {/* Right: toggle switch */}
                <button
                  id="system-admin-toggle"
                  role="switch"
                  aria-checked={isSystemAdmin}
                  aria-label="Toggle system admin status"
                  disabled={isTogglingSystemAdmin}
                  onClick={handleSystemAdminToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSystemAdmin
                      ? "bg-purple-600 border-purple-600"
                      : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out mt-0.5 ${
                      isSystemAdmin ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  >
                    {isTogglingSystemAdmin && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                      </span>
                    )}
                  </span>
                </button>
              </div>

              {/* What happens info box */}
              <div className={`mt-4 rounded-lg p-3 text-xs leading-relaxed border transition-colors duration-200 ${
                isSystemAdmin
                  ? "bg-purple-500/5 border-purple-500/15 text-purple-700 dark:text-purple-300"
                  : "bg-muted/40 border-border/50 text-muted-foreground"
              }`}>
                {isSystemAdmin ? (
                  <span className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      This user has <strong>System Admin access</strong> enabled. They can view and manage Employees, Users, and User Groups in the sidebar.
                    </span>
                  </span>
                ) : (
                  <span className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      When disabled, the <strong>Employees, Users, and User Groups</strong> modules are hidden from the sidebar, and direct URL entry to those pages is blocked.
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Account Information</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</span>
                <div className="flex items-center gap-2 text-sm text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{userData?.email || "No email attached (Guest session)"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User ID</span>
                <div className="text-sm font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50 select-all">
                  {userData?._id}
                </div>
              </div>

              {userData?.googleId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Google OAuth ID</span>
                  <div className="text-sm font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50 select-all">
                    {userData.googleId}
                  </div>
                </div>
              )}

              {userData?.guestId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Guest ID</span>
                  <div className="text-sm font-mono text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50 select-all">
                    {userData.guestId}
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

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Created At</span>
                <div className="flex items-center gap-2 text-sm text-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/50">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{userData?.createdAt ? new Date(userData.createdAt).toLocaleString() : "-"}</span>
                </div>
              </div>
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
