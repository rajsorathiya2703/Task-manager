"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContextItem } from "../../../../src/components/layout/PageHeader";
import { fetchEmployees } from "../../../../src/lib/api";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import { Plus, User, Building, Mail, Type, CheckCircle } from "lucide-react";
import { FilterRule, FilterFieldDefinition } from "../../../../src/components/common/FilterDropdown";
import { GroupByOption } from "../../../../src/components/common/GroupByDropdown";

const searchContexts: SearchContextItem[] = [
  { key: "name", label: "Name", icon: Type },
  { key: "email", label: "Email", icon: Mail },
  { key: "role", label: "Role", icon: User },
  { key: "department", label: "Department", icon: Building },
];

const groupByOptions: GroupByOption[] = [
  { key: "none", label: "None" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

export default function EmployeesConfigurationPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [rawEmployees, setRawEmployees] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await fetchEmployees();
        setRawEmployees(data || []);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, []);

  // Compute dynamic filter fields
  const filterFields = useMemo<FilterFieldDefinition[]>(() => {
    const deptSet = new Set<string>();
    const roleSet = new Set<string>();

    rawEmployees.forEach((emp) => {
      if (emp.department) deptSet.add(emp.department);
      if (emp.role) roleSet.add(emp.role);
    });

    return [
      {
        field: "Status",
        label: "Status",
        options: ["Active", "On Leave", "Inactive"],
      },
      {
        field: "Department",
        label: "Department",
        options: Array.from(deptSet).sort(),
      },
      {
        field: "Role",
        label: "Role",
        options: Array.from(roleSet).sort(),
      },
    ];
  }, [rawEmployees]);

  // Apply filters and search
  const filteredEmployees = useMemo(() => {
    return rawEmployees.filter((emp) => {
      // 1. Apply Filters
      for (const filter of filters) {
        let empValue = "";
        if (filter.field === "Status") {
          empValue = emp.status || "Active";
        } else if (filter.field === "Department") {
          empValue = emp.department || "";
        } else if (filter.field === "Role") {
          empValue = emp.role || "";
        }

        const safeEmpValue = empValue.toLowerCase();
        const safeFilterValue = filter.value.toLowerCase();

        if (filter.condition === "eq" && safeEmpValue !== safeFilterValue) return false;
        if (filter.condition === "neq" && safeEmpValue === safeFilterValue) return false;
      }

      // 2. Apply Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${emp.fullName?.firstName || ""} ${emp.fullName?.lastName || ""}`.toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const role = (emp.role || "").toLowerCase();
        const dept = (emp.department || "").toLowerCase();

        if (searchContext === "name") {
          if (!fullName.includes(q)) return false;
        } else if (searchContext === "email") {
          if (!email.includes(q)) return false;
        } else if (searchContext === "role") {
          if (!role.includes(q)) return false;
        } else if (searchContext === "department") {
          if (!dept.includes(q)) return false;
        } else {
          // 'all'
          if (!fullName.includes(q) && !email.includes(q) && !role.includes(q) && !dept.includes(q)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rawEmployees, filters, searchQuery, searchContext]);

  // Grouping
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return null;
    }

    const groups: Record<string, any[]> = {};

    filteredEmployees.forEach((emp) => {
      let key = "Other";
      if (groupBy === "department") {
        key = emp.department || "No Department";
      } else if (groupBy === "role") {
        key = emp.role || "No Role";
      } else if (groupBy === "status") {
        key = emp.status || "Active";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(emp);
    });

    return groups;
  }, [filteredEmployees, groupBy]);

  const renderEmployeeRow = (employee: any) => (
    <tr 
      key={employee._id} 
      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => router.push(`/configuration/employees/${employee._id}`)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {employee.fullName?.firstName?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {employee.fullName?.firstName} {employee.fullName?.lastName}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3" />
              {employee.email || "No email"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <User className="w-4 h-4 text-muted-foreground" />
          {employee.role || "-"}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building className="w-4 h-4" />
          {employee.department || "-"}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          employee.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
          employee.status === 'On Leave' ? 'bg-amber-500/10 text-amber-500' :
          'bg-red-500/10 text-red-500'
        }`}>
          {employee.status || 'Active'}
        </span>
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
        title="Employees" 
        breadcrumbs={[
          { label: 'Configuration' },
          { label: 'Employees' }
        ]}
        showAdd={can('employees', 'create')}
        addText="New Employee"
        addHref="/configuration/employees/new"
        filters={filters}
        onApplyFilter={(f) => setFilters([...filters, f])}
        onRemoveFilter={(id) => setFilters(filters.filter(f => f.id !== id))}
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
                        {groupBy === "department" && <Building className="w-4 h-4 text-primary" />}
                        {groupBy === "role" && <User className="w-4 h-4 text-primary" />}
                        {groupBy === "status" && <CheckCircle className="w-4 h-4 text-primary" />}
                        <span>{groupKey}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                        {groupedData[groupKey].length} {groupedData[groupKey].length === 1 ? "employee" : "employees"}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold">Department</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedData[groupKey].map(renderEmployeeRow)}
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
                          <th className="px-6 py-4 font-semibold">Name</th>
                          <th className="px-6 py-4 font-semibold">Role</th>
                          <th className="px-6 py-4 font-semibold">Department</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map(renderEmployeeRow)
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                              {filters.length > 0 || searchQuery
                                ? "No employees match the current filters or search query."
                                : "No employees found. Click \"New Employee\" to create one."}
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
