"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { fetchEmployees } from "../../../../src/lib/api";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import { Plus, User, Building, Mail } from "lucide-react";

export default function EmployeesConfigurationPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await fetchEmployees();
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, []);

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
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Department</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map((employee) => (
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No employees found. Click "Add New" to create one.
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
