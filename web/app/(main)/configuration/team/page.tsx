"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { fetchTeams } from "../../../../src/lib/api";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import { Users, Shield } from "lucide-react";

export default function TeamsConfigurationPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await fetchTeams();
        setTeams(data || []);
      } catch (err) {
        console.error("Failed to fetch teams", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTeams();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader 
        title="Teams" 
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'Teams' }
        ]}
        showAdd={can('teams', 'create')}
        addText="New Team"
        addHref="/configuration/team/new"
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
                      <th className="px-6 py-4 font-semibold">Team Name</th>
                      <th className="px-6 py-4 font-semibold">Description</th>
                      <th className="px-6 py-4 font-semibold">Team Lead</th>
                      <th className="px-6 py-4 font-semibold">Members</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <tr 
                          key={team._id} 
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/configuration/team/${team._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {team.name?.charAt(0) || 'T'}
                              </div>
                              <div className="font-semibold text-foreground">
                                {team.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {team.description || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-foreground font-medium">
                              <Shield className="w-4 h-4 text-emerald-500" />
                              {team.teamLead ? `${team.teamLead.fullName?.firstName} ${team.teamLead.fullName?.lastName}` : "Unassigned"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              {team.members?.length || 0} members
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
                          No teams found. Click "Add New" to create one.
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
