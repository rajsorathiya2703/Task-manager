"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  LayoutGrid,
  Briefcase,
  Clock,
  Calendar,
  CalendarCheck,
  History,
  Users,
  Shield,
  ClipboardCheck,
  Sliders,
  Building2,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { UserProfile } from "./UserProfile";
import { useSidebar } from "./SidebarContext";
import { useChatbot } from "../chatbot/ChatbotContext";
import { useAccess } from "../../contexts/AccessContext";
import { isDayOffModuleEnabled } from "../../lib/dayoff-feature";
import { CompanyLink, useCompanyPath } from "../../lib/useCompanyPath";

interface SidebarProps {
  user: any;
}

// Custom Tasks icon matching image clipboard frame with lines
const TasksIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

// Custom Employees icon matching image badge card with photo and lines
const EmployeesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="14" x="3" y="5" rx="2" />
    <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
    <circle cx="8" cy="9" r="1.2" />
  </svg>
);

export function Sidebar({ user }: SidebarProps) {
  const { isOpen, setIsOpen, toggleSidebar } = useSidebar();
  const { isOpen: isChatbotOpen, toggleChatbot } = useChatbot();
  const pathname = usePathname();
  const cp = useCompanyPath();
  const { can } = useAccess();

  // Collapsible section state (default all expanded as in images)
  const [openSections, setOpenSections] = useState({
    workspace: true,
    timeOff: true,
    configuration: true,
    platform: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Day Off / Time Off Module Toggle
  const dayOffEnabled = isDayOffModuleEnabled();

  // Route-to-module permission checks
  const canCopilot = can("chatbot", "use") || can("chatbot", "read");
  const canDashboard = can("dashboard", "read");
  const canTasks = can("tasks", "read");
  const canProjects = can("projects", "read");
  const canTimeline = can("timeline", "read") || canTasks;

  const canDayOff = dayOffEnabled && can("dayoff", "read");
  const canApprovals = dayOffEnabled && can("dayoff.approvals", "read");
  const canPolicies = dayOffEnabled && can("dayoff.policies", "read");

  const canTeams = can("teams", "read");
  const canEmployees = can("employees", "read");
  const canUsers = can("users", "read");
  const canRoles = can("roles", "read");

  // Section visibility flags
  const hasWorkspaceSection = canDashboard || canTasks || canProjects || canTimeline;
  const hasTimeOffSection = canDayOff;
  const hasConfigSection = canTeams || canEmployees || canUsers || canRoles || canApprovals || canPolicies;
  const isPlatformAdmin = Boolean(
    user?.isPlatformAdmin ||
    (user?.email && user.email.toLowerCase().trim() === "raj2732005@gmail.com")
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        onClick={() => setIsOpen(false)}
      />

      <aside className="fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#ebedf1] dark:bg-[#2b303b] border-r border-[#dce1e7] dark:border-[#222731] h-screen flex flex-col transition-transform transform translate-x-0 select-none">
        {/* Top Header: User Profile & Close Button inline */}
        <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2 border-b border-[#dce1e7]/60 dark:border-white/[0.06]">
          <div className="flex-1 min-w-0">
            <UserProfile user={user} />
          </div>
          <button 
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#1e232b] hover:bg-gray-100 dark:hover:bg-[#181c22] text-[#64748b] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white border border-[#dce1e7] dark:border-white/[0.06] shadow-xs flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 custom-scrollbar">
          {/* AI Task Copilot Quick Launch */}
          {canCopilot && (
            <div>
              <button
                onClick={toggleChatbot}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-sm font-medium transition-all group cursor-pointer ${
                  isChatbotOpen
                    ? "bg-white dark:bg-[#1e232b] border border-[#111827]/20 dark:border-white/20 shadow-xs"
                    : "bg-white dark:bg-[#1e232b] hover:bg-white/90 dark:hover:bg-[#171b21] border border-[#dce1e7] dark:border-white/[0.06] shadow-xs"
                }`}
                title="Open AI Task Copilot (⌘J)"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1e232b] dark:bg-white text-white dark:text-black shrink-0 shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="block text-sm font-bold text-[#111827] dark:text-white leading-tight truncate">
                      AI Copilot
                    </span>
                    <span className="block text-xs text-[#64748b] dark:text-[#9ca3af] leading-tight truncate mt-0.5">
                      Task Operations
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#e2e6eb] dark:bg-[#2d343f] text-[#64748b] dark:text-[#9ca3af] group-hover:text-[#111827] dark:group-hover:text-white shrink-0">
                  ⌘J
                </span>
              </button>
            </div>
          )}

          {/* Workspace Section */}
          {hasWorkspaceSection && (
            <div>
              <div
                className="flex items-center justify-between px-2 mb-2 cursor-pointer select-none group"
                onClick={() => toggleSection("workspace")}
              >
                <h3 className="text-[11px] font-bold text-[#64748b] dark:text-[#8f9cae] uppercase tracking-wider group-hover:text-[#111827] dark:group-hover:text-white transition-colors">
                  Workspace
                </h3>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#64748b] dark:text-[#8f9cae] transition-transform duration-200 ${
                    openSections.workspace ? "" : "-rotate-90"
                  }`}
                />
              </div>
              
              {openSections.workspace && (
                <nav className="space-y-1">
                  {canDashboard && (
                    <NavItem
                      href="/dashboard"
                      label="Dashboard"
                      icon={LayoutGrid}
                      isActive={pathname.startsWith(cp("/dashboard"))}
                    />
                  )}
                  {canTasks && (
                    <NavItem
                      href="/tasks"
                      label="Tasks"
                      icon={TasksIcon}
                      isActive={pathname.startsWith(cp("/tasks"))}
                    />
                  )}
                  {canProjects && (
                    <NavItem
                      href="/projects"
                      label="Projects"
                      icon={Briefcase}
                      isActive={pathname.startsWith(cp("/projects"))}
                    />
                  )}
                  {canTimeline && (
                    <NavItem
                      href="/timeline"
                      label="Timeline"
                      icon={Clock}
                      isActive={pathname.startsWith(cp("/timeline"))}
                    />
                  )}
                </nav>
              )}
            </div>
          )}

          {/* Time Off Section */}
          {hasTimeOffSection && (
            <div>
              <div
                className="flex items-center justify-between px-2 mb-2 cursor-pointer select-none group"
                onClick={() => toggleSection("timeOff")}
              >
                <h3 className="text-[11px] font-bold text-[#64748b] dark:text-[#8f9cae] uppercase tracking-wider group-hover:text-[#111827] dark:group-hover:text-white transition-colors">
                  Time Off
                </h3>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#64748b] dark:text-[#8f9cae] transition-transform duration-200 ${
                    openSections.timeOff ? "" : "-rotate-90"
                  }`}
                />
              </div>

              {openSections.timeOff && (
                <nav className="space-y-1">
                  <NavItem
                    href="/dayoff/calendar"
                    label="Calendar"
                    icon={Calendar}
                    isActive={pathname.startsWith(cp("/dayoff/calendar")) || pathname === cp("/dayoff")}
                  />
                  <NavItem
                    href="/dayoff/requests"
                    label="My Leaves"
                    icon={CalendarCheck}
                    isActive={pathname.startsWith(cp("/dayoff/requests"))}
                  />
                  <NavItem
                    href="/dayoff/history"
                    label="Application History"
                    icon={History}
                    isActive={pathname.startsWith(cp("/dayoff/history")) || pathname.startsWith(cp("/dayoff/applications"))}
                  />
                </nav>
              )}
            </div>
          )}

          {/* Configuration Section */}
          {hasConfigSection && (
            <div>
              <div
                className="flex items-center justify-between px-2 mb-2 cursor-pointer select-none group"
                onClick={() => toggleSection("configuration")}
              >
                <h3 className="text-[11px] font-bold text-[#64748b] dark:text-[#8f9cae] uppercase tracking-wider group-hover:text-[#111827] dark:group-hover:text-white transition-colors">
                  Configuration
                </h3>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#64748b] dark:text-[#8f9cae] transition-transform duration-200 ${
                    openSections.configuration ? "" : "-rotate-90"
                  }`}
                />
              </div>
              
              {openSections.configuration && (
                <nav className="space-y-1">
                  {canTeams && (
                    <NavItem
                      href="/configuration/team"
                      label="Team"
                      icon={Users}
                      isActive={pathname.startsWith(cp("/configuration/team"))}
                    />
                  )}
                  {canEmployees && (
                    <NavItem
                      href="/configuration/employees"
                      label="Employees"
                      icon={EmployeesIcon}
                      isActive={pathname.startsWith(cp("/configuration/employees"))}
                    />
                  )}
                  {canUsers && (
                    <NavItem
                      href="/configuration/users"
                      label="Users"
                      icon={Users}
                      isActive={pathname.startsWith(cp("/configuration/users"))}
                    />
                  )}
                  {canRoles && (
                    <NavItem
                      href="/configuration/roles"
                      label="Roles"
                      icon={Shield}
                      isActive={pathname.startsWith(cp("/configuration/roles"))}
                    />
                  )}
                  {canApprovals && (
                    <NavItem
                      href="/dayoff/approvals"
                      label="Approvals"
                      icon={ClipboardCheck}
                      isActive={pathname.startsWith(cp("/dayoff/approvals"))}
                    />
                  )}
                  {canPolicies && (
                    <NavItem
                      href="/dayoff/policies"
                      label="Leave Policies"
                      icon={Sliders}
                      isActive={pathname.startsWith(cp("/dayoff/policies")) || pathname.startsWith(cp("/configuration/day-off"))}
                    />
                  )}
                </nav>
              )}
            </div>
          )}

          {/* Platform Admin Section (Platform Superuser Only) */}
          {isPlatformAdmin && (
            <div>
              <div
                className="flex items-center justify-between px-2 mb-2 cursor-pointer select-none group"
                onClick={() => toggleSection("platform")}
              >
                <h3 className="text-[11px] font-bold text-[#64748b] dark:text-[#8f9cae] uppercase tracking-wider group-hover:text-[#111827] dark:group-hover:text-white transition-colors">
                  Platform
                </h3>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#64748b] dark:text-[#8f9cae] transition-transform duration-200 ${
                    openSections.platform ? "" : "-rotate-90"
                  }`}
                />
              </div>

              {openSections.platform && (
                <nav className="space-y-1">
                  <Link
                    href="/platform-admin"
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all group ${
                      pathname.startsWith("/platform-admin")
                        ? "bg-white dark:bg-[#1e232b] text-[#111827] dark:text-white font-semibold shadow-xs border border-[#dce1e7]/80 dark:border-white/[0.04]"
                        : "text-[#5f6d7e] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] font-medium"
                    }`}
                  >
                    {pathname.startsWith("/platform-admin") && (
                      <span
                        className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.25 h-5 bg-[#111827] dark:bg-white rounded-r-full"
                        aria-hidden="true"
                      />
                    )}
                    <Building2 className={`w-5 h-5 shrink-0 transition-colors ${
                      pathname.startsWith("/platform-admin")
                        ? "text-[#111827] dark:text-white"
                        : "text-[#5f6d7e] dark:text-[#9ca3af] group-hover:text-[#111827] dark:group-hover:text-white"
                    }`} />
                    <span className="truncate">Platform Admin</span>
                  </Link>
                </nav>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// Reusable navigation item with active indicator pill
function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <CompanyLink
      href={href}
      className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all group ${
        isActive
          ? "bg-white dark:bg-[#1e232b] text-[#111827] dark:text-white font-semibold shadow-xs border border-[#dce1e7]/80 dark:border-white/[0.04]"
          : "text-[#5f6d7e] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] font-medium"
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.25 h-5 bg-[#111827] dark:bg-white rounded-r-full"
          aria-hidden="true"
        />
      )}
      <Icon
        className={`w-5 h-5 shrink-0 transition-colors ${
          isActive
            ? "text-[#111827] dark:text-white"
            : "text-[#5f6d7e] dark:text-[#9ca3af] group-hover:text-[#111827] dark:group-hover:text-white"
        }`}
      />
      <span className="truncate">{label}</span>
    </CompanyLink>
  );
}
