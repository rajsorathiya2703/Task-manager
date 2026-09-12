"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, PanelRight, Save, Check, X, Loader2,
  User, Banknote, Briefcase, Phone, Mail, MapPin,
  Calendar, Hash, ChevronDown, ArrowLeft
} from "lucide-react";
import { useSidebar } from "../../../../../src/components/layout/SidebarContext";
import { fetchEmployeeById, createEmployee, api } from "../../../../../src/lib/api";
import Link from "next/link";

const EMPTY_EMPLOYEE = {
  fullName: { firstName: "", middleName: "", lastName: "" },
  email: "",
  role: "",
  department: "",
  status: "Active",
  personalNumber: "",
  houseContactNumber: "",
  joiningDate: new Date().toISOString().split("T")[0],
  address: "",
  baseSalary: 0,
  currency: "USD",
  payFrequency: "Monthly",
  bankAccountNumber: "",
  bankRoutingNumber: "",
  taxId: "",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "On Leave": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Terminated: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { isOpen, toggleSidebar } = useSidebar();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [originalData, setOriginalData] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<any>(EMPTY_EMPLOYEE);

  useEffect(() => {
    if (!isNew) {
      const load = async () => {
        try {
          setIsLoading(true);
          const data = await fetchEmployeeById(id);
          if (!data) { router.push("/configuration/employees"); return; }
          const mapped = {
            ...EMPTY_EMPLOYEE,
            ...data,
            fullName: {
              firstName: data.fullName?.firstName || "",
              middleName: data.fullName?.middleName || "",
              lastName: data.fullName?.lastName || "",
            },
            joiningDate: data.joiningDate
              ? new Date(data.joiningDate).toISOString().split("T")[0]
              : EMPTY_EMPLOYEE.joiningDate,
          };
          setEmployeeData(mapped);
          setOriginalData(mapped);
        } catch (err) {
          console.error("Failed to load employee", err);
          router.push("/configuration/employees");
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
  }, [id, isNew, router]);

  const hasChanges =
    !isNew &&
    originalData &&
    JSON.stringify(employeeData) !== JSON.stringify(originalData);

  const set = (field: string, value: any, parent?: string) => {
    setEmployeeData((prev: any) =>
      parent
        ? { ...prev, [parent]: { ...prev[parent], [field]: value } }
        : { ...prev, [field]: value }
    );
  };

  const handleSave = async () => {
    if (!employeeData.fullName.firstName || !employeeData.role) {
      alert("First Name and Role are required.");
      return;
    }
    const payload = {
      ...employeeData,
      email: employeeData.email ? employeeData.email.trim().toLowerCase() : "",
    };
    try {
      setIsSaving(true);
      if (isNew) {
        await createEmployee(payload);
        setToastMessage("Employee created successfully!");
        setTimeout(() => router.push("/configuration/employees"), 1000);
      } else {
        const updated = await api.patch(`/employees/${id}`, payload);
        const d = updated.data;
        const mapped = {
          ...EMPTY_EMPLOYEE,
          ...d,
          fullName: {
            firstName: d.fullName?.firstName || "",
            middleName: d.fullName?.middleName || "",
            lastName: d.fullName?.lastName || "",
          },
          joiningDate: d.joiningDate
            ? new Date(d.joiningDate).toISOString().split("T")[0]
            : EMPTY_EMPLOYEE.joiningDate,
        };
        setEmployeeData(mapped);
        setOriginalData(mapped);
        setToastMessage("Employee updated!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save employee", err);
      alert("Failed to save. Please check all required fields.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (originalData) setEmployeeData(originalData);
  };

  const displayName = employeeData.fullName?.firstName
    ? `${employeeData.fullName.firstName}${employeeData.fullName.lastName ? " " + employeeData.fullName.lastName : ""}`
    : isNew
    ? "New Employee"
    : "Employee";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Top Toolbar ── */}
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
            <Link href="/configuration/employees" className="hover:text-foreground transition-colors">
              Employees
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[220px]">
              {displayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isNew ? (
            <button
              onClick={handleSave}
              disabled={isSaving || !employeeData.fullName?.firstName?.trim()}
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : "Save Employee"}
            </button>
          ) : hasChanges ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={handleDiscard}
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
                {isSaving ? "Updating..." : "Update Employee"}
              </button>
            </div>
          ) : (
            <Link
              href="/configuration/employees"
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          )}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 border border-border rounded-md transition-colors bg-card shadow-sm ml-1 ${isRightPanelOpen ? "bg-muted text-foreground" : "hover:bg-muted text-muted-foreground"}`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* ── Hero / Name Card ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
              <div className="px-6 pb-6 -mt-8">
                <div className="flex items-end justify-between gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-md border-4 border-card shrink-0">
                    {employeeData.fullName?.firstName?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
                  </div>
                  {/* Status */}
                  <select
                    value={employeeData.status}
                    onChange={(e) => set("status", e.target.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer outline-none transition-colors ${STATUS_STYLES[employeeData.status] || STATUS_STYLES["Active"]}`}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                {/* Name Fields */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">First Name *</label>
                    <input
                      type="text"
                      value={employeeData.fullName?.firstName || ""}
                      onChange={(e) => set("firstName", e.target.value, "fullName")}
                      placeholder="First name"
                      className="w-full text-base font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors py-1"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Middle Name</label>
                    <input
                      type="text"
                      value={employeeData.fullName?.middleName || ""}
                      onChange={(e) => set("middleName", e.target.value, "fullName")}
                      placeholder="Middle name"
                      className="w-full text-base font-medium text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors py-1"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Name *</label>
                    <input
                      type="text"
                      value={employeeData.fullName?.lastName || ""}
                      onChange={(e) => set("lastName", e.target.value, "fullName")}
                      placeholder="Last name"
                      className="w-full text-base font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors py-1"
                    />
                  </div>
                </div>

                {/* Role & Department */}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={employeeData.role || ""}
                      onChange={(e) => set("role", e.target.value)}
                      placeholder="Role / Title *"
                      className="text-sm font-medium text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors w-36"
                    />
                  </div>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={employeeData.department || ""}
                      onChange={(e) => set("department", e.target.value)}
                      placeholder="Department"
                      className="text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors w-32"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contact Information ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Contact Information</h3>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Email Address" icon={<Mail className="w-3.5 h-3.5" />} required>
                    <input
                      type="email"
                      value={employeeData.email || ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="employee@company.com"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    />
                  </Field>
                  <Field label="Mobile / Personal Number" icon={<Phone className="w-3.5 h-3.5" />}>
                    <input
                      type="text"
                      value={employeeData.personalNumber || ""}
                      onChange={(e) => set("personalNumber", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    />
                  </Field>
                  <Field label="Home / House Contact Number" icon={<Phone className="w-3.5 h-3.5" />}>
                    <input
                      type="text"
                      value={employeeData.houseContactNumber || ""}
                      onChange={(e) => set("houseContactNumber", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    />
                  </Field>
                  <Field label="Home Address" icon={<MapPin className="w-3.5 h-3.5" />}>
                    <input
                      type="text"
                      value={employeeData.address || ""}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="123 Main St, City, Country"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Payroll Details ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                <h3 className="font-semibold text-foreground text-sm">Payroll & Compensation</h3>
                <span className="ml-auto text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Confidential</span>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Base Salary" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        {employeeData.currency === "USD" ? "$" : employeeData.currency === "EUR" ? "€" : employeeData.currency === "GBP" ? "£" : "₹"}
                      </span>
                      <input
                        type="number"
                        value={employeeData.baseSalary || 0}
                        onChange={(e) => set("baseSalary", parseFloat(e.target.value) || 0)}
                        className="w-full text-sm pl-7 pr-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                      />
                    </div>
                  </Field>
                  <Field label="Currency">
                    <select
                      value={employeeData.currency || "USD"}
                      onChange={(e) => set("currency", e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </Field>
                  <Field label="Pay Frequency">
                    <select
                      value={employeeData.payFrequency || "Monthly"}
                      onChange={(e) => set("payFrequency", e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-weekly">Bi-weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Bank Account Number">
                    <input
                      type="text"
                      value={employeeData.bankAccountNumber || ""}
                      onChange={(e) => set("bankAccountNumber", e.target.value)}
                      placeholder="•••• •••• ••••"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all font-mono"
                    />
                  </Field>
                  <Field label="Bank Routing Number">
                    <input
                      type="text"
                      value={employeeData.bankRoutingNumber || ""}
                      onChange={(e) => set("bankRoutingNumber", e.target.value)}
                      placeholder="•••••••••"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all font-mono"
                    />
                  </Field>
                  <Field label="Tax ID / SSN">
                    <input
                      type="password"
                      value={employeeData.taxId || ""}
                      onChange={(e) => set("taxId", e.target.value)}
                      placeholder="•••-••-••••"
                      className="w-full text-sm px-3 py-2 bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:bg-muted/60 transition-all font-mono"
                    />
                  </Field>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Sidebar Panel ── */}
        {isRightPanelOpen && (
          <div className="w-72 shrink-0 border-l border-border/50 bg-muted/10 overflow-y-auto custom-scrollbar p-4 space-y-4">

            {/* Employment Details */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Employment</span>
              </div>
              <div className="p-4 space-y-4">
                <SideField label="Status">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[employeeData.status] || STATUS_STYLES["Active"]}`}>
                    {employeeData.status}
                  </span>
                </SideField>
                <SideField label="Role">
                  <span className="text-sm font-medium text-foreground">{employeeData.role || <span className="text-muted-foreground italic text-xs">Not set</span>}</span>
                </SideField>
                <SideField label="Department">
                  <span className="text-sm text-foreground">{employeeData.department || <span className="text-muted-foreground italic text-xs">Not set</span>}</span>
                </SideField>
                <SideField label="Joining Date">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={employeeData.joiningDate || ""}
                      onChange={(e) => set("joiningDate", e.target.value)}
                      className="bg-transparent text-sm outline-none cursor-pointer"
                    />
                  </div>
                </SideField>
              </div>
            </div>

            {/* Compensation Summary */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-foreground">Compensation</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {employeeData.currency === "USD" ? "$" : employeeData.currency === "EUR" ? "€" : employeeData.currency === "GBP" ? "£" : "₹"}
                    {(employeeData.baseSalary || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{employeeData.payFrequency} · {employeeData.currency}</div>
                </div>
                {employeeData.bankAccountNumber && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Bank:</span>{" "}
                    ••••{employeeData.bankAccountNumber.slice(-4)}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {!isNew && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">Employee ID</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-mono text-muted-foreground break-all">{id}</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
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

// ── Helper sub-components ──────────────────────────────────

function Field({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SideField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
