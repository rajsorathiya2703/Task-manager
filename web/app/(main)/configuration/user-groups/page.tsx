"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { fetchUserGroups } from "../../../../src/lib/api";
import { Users, Shield, Key } from "lucide-react";

export default function UserGroupsConfigurationPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await fetchUserGroups();
        setGroups(data || []);
      } catch (err) {
        console.error("Failed to fetch user groups", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader 
        title="User Groups" 
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'User Groups' }
        ]}
        showAdd={true}
        addText="New Group"
        addHref="/configuration/user-groups/new"
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
                      <th className="px-6 py-4 font-semibold">Group Name</th>
                      <th className="px-6 py-4 font-semibold">Description</th>
                      <th className="px-6 py-4 font-semibold">Members</th>
                      <th className="px-6 py-4 font-semibold">Permissions</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length > 0 ? (
                      groups.map((group) => (
                        <tr 
                          key={group._id} 
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/configuration/user-groups/${group._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                                style={{ backgroundColor: group.color || '#6366f1' }}
                              >
                                {group.name?.charAt(0) || 'G'}
                              </div>
                              <div className="font-semibold text-foreground">
                                {group.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {group.description || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {group.members?.length || 0} members
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {group.modulePermissions?.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                  <Key className="w-2.5 h-2.5" />
                                  {group.modulePermissions.length} Modules configured
                                </span>
                              ) : group.permissions?.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                  <Key className="w-2.5 h-2.5" />
                                  {group.permissions.length} Permissions
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">Standard Access</span>
                              )}
                              {group.fieldPermissions?.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-medium">
                                  {group.fieldPermissions.length} Fields Access
                                </span>
                              )}
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
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No user groups found. Click "New Group" to create one.
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
