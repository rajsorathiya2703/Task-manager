"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "@/src/components/layout/PageHeader";
import { useCompanyPath } from "@/src/lib/useCompanyPath";
import { fetchUsers } from "@/src/lib/api";
import { Mail, Shield, Crown, Clock, Briefcase, Type, UserCheck } from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "@/src/components/common/FilterDropdown";
import { GroupByOption } from "@/src/components/common/GroupByDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Name", icon: Type },
  { key: "email", label: "Email", icon: Mail },
];

const groupByOptions: GroupByOption[] = [
  { key: "none", label: "None" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

const filterFields: FilterFieldDefinition[] = [
  {
    field: "Role",
    label: "Role",
    options: ["Owner", "Employee", "Member"],
  },
  {
    field: "Status",
    label: "Status",
    options: ["Active", "Invited"],
  },
];

export default function UsersConfigurationPage() {
  const router = useRouter();
  const cp = useCompanyPath();
  const [rawUsers, setRawUsers] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setRawUsers(data || []);
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const getMemberRole = (user: any) => {
    if (user.isCompanyOwner) return "Owner";
    if (user.employeeId) return "Employee";
    return "Member";
  };

  // Filter & Search
  const filteredUsers = useMemo(() => {
    return rawUsers.filter((user) => {
      // 1. Apply Filters
      for (const filter of filters) {
        let matchesFilter = true;

        if (filter.field === "Role") {
          const role = getMemberRole(user);
          matchesFilter = role.toLowerCase() === filter.value.toLowerCase();
        } else if (filter.field === "Status") {
          const status = user.membershipStatus || "Active";
          matchesFilter = status.toLowerCase() === filter.value.toLowerCase();
        }

        if (filter.condition === "eq" && !matchesFilter) return false;
        if (filter.condition === "neq" && matchesFilter) return false;
      }

      // 2. Apply Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (user.name || "").toLowerCase();
        const email = (user.email || "").toLowerCase();

        if (searchContext === "name") {
          if (!name.includes(q)) return false;
        } else if (searchContext === "email") {
          if (!email.includes(q)) return false;
        } else {
          // 'all'
          if (!name.includes(q) && !email.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawUsers, filters, searchQuery, searchContext]);

  // Grouping
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }

    const groups: Record<string, any[]> = {};

    filteredUsers.forEach((user) => {
      let key = "Other";
      if (groupBy === "role") {
        key = getMemberRole(user);
      } else if (groupBy === "status") {
        key = user.membershipStatus
          ? user.membershipStatus.charAt(0).toUpperCase() + user.membershipStatus.slice(1)
          : "Active";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(user);
    });

    return groups;
  }, [filteredUsers, groupBy]);

  const renderUserRow = (user: any) => {
    const role = getMemberRole(user);
    const status = user.membershipStatus || "active";

    return (
      <tr 
        key={user._id || user.membershipId} 
        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => router.push(cp(`/configuration/users/${user._id}`)) }
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
                {user.name || "Unnamed Member"}
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
            {user.email || <span className="italic text-muted-foreground/60">No email</span>}
          </div>
        </td>
        <td className="px-6 py-4">
          {role === "Owner" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Crown className="w-3 h-3" />
              Owner
            </span>
          ) : role === "Employee" ? (
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
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 capitalize">
            <UserCheck className="w-3 h-3" />
            {status}
          </span>
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
            }) : (user.joinedAt ? new Date(user.joinedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 'Never')}
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <button className="text-primary hover:underline text-xs font-semibold cursor-pointer">
            View Details
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <PageHeader 
        title="Users" 
        breadcrumbs={[
          { label: 'Configuration', href: cp('/configuration/team') },
          { label: 'Users' }
        ]}
        showAdd={false}
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
                        {groupBy === "role" && <Shield className="w-4 h-4 text-primary" />}
                        {groupBy === "status" && <UserCheck className="w-4 h-4 text-primary" />}
                        <span>{groupKey}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                        {groupedData[groupKey].length} {groupedData[groupKey].length === 1 ? "user" : "users"}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 font-semibold">User</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Last Active / Joined</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedData[groupKey].map(renderUserRow)}
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
                          <th className="px-6 py-4 font-semibold">User</th>
                          <th className="px-6 py-4 font-semibold">Email</th>
                          <th className="px-6 py-4 font-semibold">Role</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold">Last Active / Joined</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(renderUserRow)
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                              {filters.length > 0 || searchQuery
                                ? "No users match the current filters or search query."
                                : "No company members found."}
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
