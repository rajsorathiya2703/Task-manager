"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { fetchUserGroups } from "../../../../src/lib/api";
import { Users, Shield, Key, Type, Lock } from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";
import { GroupByOption } from "../../../../src/components/common/GroupByDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Group Name", icon: Type },
  { key: "description", label: "Description", icon: Shield },
];

const groupByOptions: GroupByOption[] = [
  { key: "none", label: "None" },
  { key: "accessLevel", label: "Access Level" },
  { key: "fieldAccess", label: "Field Permissions" },
];

const filterFields: FilterFieldDefinition[] = [
  {
    field: "Access Level",
    label: "Access Level",
    options: ["Modules Configured", "Permissions Configured", "Standard Access"],
  },
  {
    field: "Field Permissions",
    label: "Field Permissions",
    options: ["Has Field Permissions", "No Field Permissions"],
  },
];

export default function UserGroupsConfigurationPage() {
  const router = useRouter();
  const [rawGroups, setRawGroups] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await fetchUserGroups();
        setRawGroups(data || []);
      } catch (err) {
        console.error("Failed to fetch user groups", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, []);

  // Filter & Search
  const filteredGroups = useMemo(() => {
    return rawGroups.filter((group) => {
      // 1. Apply Filters
      for (const filter of filters) {
        let matchesFilter = true;

        if (filter.field === "Access Level") {
          let currentLevel = "Standard Access";
          if (group.modulePermissions?.length > 0) {
            currentLevel = "Modules Configured";
          } else if (group.permissions?.length > 0) {
            currentLevel = "Permissions Configured";
          }
          matchesFilter = currentLevel.toLowerCase() === filter.value.toLowerCase();
        } else if (filter.field === "Field Permissions") {
          const hasField = group.fieldPermissions?.length > 0;
          if (filter.value === "Has Field Permissions") {
            matchesFilter = hasField;
          } else if (filter.value === "No Field Permissions") {
            matchesFilter = !hasField;
          }
        }

        if (filter.condition === "eq" && !matchesFilter) return false;
        if (filter.condition === "neq" && matchesFilter) return false;
      }

      // 2. Apply Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (group.name || "").toLowerCase();
        const desc = (group.description || "").toLowerCase();

        if (searchContext === "name") {
          if (!name.includes(q)) return false;
        } else if (searchContext === "description") {
          if (!desc.includes(q)) return false;
        } else {
          // 'all'
          if (!name.includes(q) && !desc.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawGroups, filters, searchQuery, searchContext]);

  // Grouping
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }

    const groups: Record<string, any[]> = {};

    filteredGroups.forEach((group) => {
      let key = "Standard Access";
      if (groupBy === "accessLevel") {
        if (group.modulePermissions?.length > 0) {
          key = "Modules Configured";
        } else if (group.permissions?.length > 0) {
          key = "Permissions Configured";
        } else {
          key = "Standard Access";
        }
      } else if (groupBy === "fieldAccess") {
        key = group.fieldPermissions?.length > 0 ? "With Field Permissions" : "Standard Field Access";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(group);
    });

    return groups;
  }, [filteredGroups, groupBy]);

  const renderGroupRow = (group: any) => (
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
              <Key className="w-2.5 h-2.5" />
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
  );

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
                        <Lock className="w-4 h-4 text-primary" />
                        <span>{groupKey}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                        {groupedData[groupKey].length} {groupedData[groupKey].length === 1 ? "group" : "groups"}
                      </span>
                    </div>
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
                          {groupedData[groupKey].map(renderGroupRow)}
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
                          <th className="px-6 py-4 font-semibold">Group Name</th>
                          <th className="px-6 py-4 font-semibold">Description</th>
                          <th className="px-6 py-4 font-semibold">Members</th>
                          <th className="px-6 py-4 font-semibold">Permissions</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGroups.length > 0 ? (
                          filteredGroups.map(renderGroupRow)
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              {filters.length > 0 || searchQuery
                                ? "No user groups match the current filters or search query."
                                : "No user groups found. Click \"New Group\" to create one."}
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
