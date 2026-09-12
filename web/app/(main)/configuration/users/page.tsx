"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { fetchUsers } from "../../../../src/lib/api";
import { User, Mail, Shield, Sparkles, Clock, Globe, Briefcase } from "lucide-react";

export default function UsersConfigurationPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data || []);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader 
        title="Users" 
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'Users' }
        ]}
        showAdd={false}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Auth Type</th>
                      <th className="px-6 py-4 font-semibold">Employee</th>
                      <th className="px-6 py-4 font-semibold">Last Active</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr 
                          key={user._id} 
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/configuration/users/${user._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name || "User"}
                                  className="w-8 h-8 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {user.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-foreground">
                                  {user.name || (user.authType === 'guest' ? 'Guest User' : 'Unnamed User')}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  ID: {user._id?.slice(-6)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Mail className="w-3.5 h-3.5" />
                              {user.email || <span className="italic text-muted-foreground/60">No email (Guest)</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              user.authType === 'google'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                            }`}>
                              {user.authType === 'google' ? <Globe className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                              {user.authType === 'google' ? 'Google OAuth' : 'Guest'}
                            </span>
                          </td>
                          {/* Employee status column */}
                          <td className="px-6 py-4">
                            {user.is_employee ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Briefcase className="w-3 h-3" />
                                Employee
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Never'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-primary hover:underline text-xs font-semibold">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
