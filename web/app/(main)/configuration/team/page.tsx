"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { fetchTeams } from "../../../../src/lib/api";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import { Users, Shield, Type, AlignLeft } from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";
import { GroupByOption } from "../../../../src/components/common/GroupByDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Team Name", icon: Type },
  { key: "description", label: "Description", icon: AlignLeft },
  { key: "teamLead", label: "Team Lead", icon: Shield },
];

const groupByOptions: GroupByOption[] = [
  { key: "none", label: "None" },
  { key: "teamLead", label: "Team Lead" },
];

export default function TeamsConfigurationPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [rawTeams, setRawTeams] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await fetchTeams();
        setRawTeams(data || []);
      } catch (err) {
        console.error("Failed to fetch teams", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTeams();
  }, []);

  // Compute dynamic filter fields
  const filterFields = useMemo<FilterFieldDefinition[]>(() => {
    const leadSet = new Set<string>(["Assigned", "Unassigned"]);
    rawTeams.forEach((team) => {
      if (team.teamLead) {
        const name = `${team.teamLead.fullName?.firstName || ""} ${team.teamLead.fullName?.lastName || ""}`.trim();
        if (name) leadSet.add(name);
      }
    });

    return [
      {
        field: "Team Lead",
        label: "Team Lead",
        options: Array.from(leadSet),
      },
      {
        field: "Members",
        label: "Members",
        options: ["Has Members", "No Members"],
      },
    ];
  }, [rawTeams]);

  // Process data with filters and search
  const filteredTeams = useMemo(() => {
    return rawTeams.filter((team) => {
      // 1. Apply Filters
      for (const filter of filters) {
        const leadName = team.teamLead
          ? `${team.teamLead.fullName?.firstName || ""} ${team.teamLead.fullName?.lastName || ""}`.trim()
          : "";
        const isAssigned = !!team.teamLead;
        const memberCount = team.members?.length || 0;

        let matchesFilter = true;

        if (filter.field === "Team Lead") {
          if (filter.value === "Assigned") {
            matchesFilter = isAssigned;
          } else if (filter.value === "Unassigned") {
            matchesFilter = !isAssigned;
          } else {
            matchesFilter = leadName.toLowerCase() === filter.value.toLowerCase();
          }
        } else if (filter.field === "Members") {
          if (filter.value === "Has Members") {
            matchesFilter = memberCount > 0;
          } else if (filter.value === "No Members") {
            matchesFilter = memberCount === 0;
          }
        }

        if (filter.condition === "eq" && !matchesFilter) return false;
        if (filter.condition === "neq" && matchesFilter) return false;
      }

      // 2. Apply Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (team.name || "").toLowerCase();
        const desc = (team.description || "").toLowerCase();
        const lead = (
          team.teamLead
            ? `${team.teamLead.fullName?.firstName || ""} ${team.teamLead.fullName?.lastName || ""}`
            : ""
        ).toLowerCase();

        if (searchContext === "name") {
          if (!name.includes(q)) return false;
        } else if (searchContext === "description") {
          if (!desc.includes(q)) return false;
        } else if (searchContext === "teamLead") {
          if (!lead.includes(q)) return false;
        } else {
          // 'all'
          if (!name.includes(q) && !desc.includes(q) && !lead.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawTeams, filters, searchQuery, searchContext]);

  // Grouping
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }

    const groups: Record<string, any[]> = {};

    filteredTeams.forEach((team) => {
      let key = "Unassigned";
      if (groupBy === "teamLead") {
        key = team.teamLead
          ? `${team.teamLead.fullName?.firstName || ""} ${team.teamLead.fullName?.lastName || ""}`.trim() || "Unassigned"
          : "Unassigned";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(team);
    });

    return groups;
  }, [filteredTeams, groupBy]);

  const renderTeamRow = (team: any) => (
    <tr
      key={team._id}
      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => router.push(`/configuration/team/${team._id}`)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {team.name?.charAt(0) || "T"}
          </div>
          <div className="font-semibold text-foreground">{team.name}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-muted-foreground">{team.description || "-"}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Shield className="w-4 h-4 text-emerald-500" />
          {team.teamLead
            ? `${team.teamLead.fullName?.firstName} ${team.teamLead.fullName?.lastName}`
            : "Unassigned"}
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
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader
        title="Teams"
        breadcrumbs={[{ label: "Configuration" }, { label: "Teams" }]}
        showAdd={can("teams", "create")}
        addText="New Team"
        addHref="/configuration/team/new"
        filters={filters}
        onApplyFilter={(f) => setFilters([...filters, f])}
        onRemoveFilter={(id) => setFilters(filters.filter((f) => f.id !== id))}
        onClearFilters={() => setFilters([])}
        filterFields={filterFields}
        searchQuery={searchQuery}
        searchContext={searchContext}
        searchContexts={searchContexts}
        onSearchChange={(q, ctx) => {
          setSearchQuery(q);
          setSearchContext(ctx);
        }}
        groupByOptions={groupByOptions}
        selectedGroupBy={groupBy}
        onGroupByChange={setGroupBy}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedData ? (
                Object.keys(groupedData).map((groupKey) => (
                  <div key={groupKey} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                        <Shield className="w-4 h-4 text-primary" />
                        <span>{groupKey}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                        {groupedData[groupKey].length} {groupedData[groupKey].length === 1 ? "team" : "teams"}
                      </span>
                    </div>
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
                          {groupedData[groupKey].map(renderTeamRow)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
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
                        {filteredTeams.length > 0 ? (
                          filteredTeams.map(renderTeamRow)
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              {filters.length > 0 || searchQuery
                                ? "No teams match the current filters or search query."
                                : "No teams found. Click \"New Team\" to create one."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
