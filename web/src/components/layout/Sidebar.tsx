"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Calendar, CalendarCheck, ClipboardCheck, Sliders, History } from "lucide-react";
import { UserProfile } from "./UserProfile";
import { useSidebar } from "./SidebarContext";
import { usePermissions } from "../../contexts/PermissionsContext";
import { useChatbot } from "../chatbot/ChatbotContext";
import { isDayOffModuleEnabled } from "../../lib/dayoff-feature";

interface SidebarProps {
  user: any;
}

export function Sidebar({ user }: SidebarProps) {
  const { isOpen, setIsOpen, toggleSidebar } = useSidebar();
  const { isOpen: isChatbotOpen, toggleChatbot } = useChatbot();
  const { can } = usePermissions();
  const pathname = usePathname();

  // Day Off / Time Off Module Toggle
  const dayOffEnabled = isDayOffModuleEnabled();

  // Module read permissions
  const isEmployee = Boolean(user?.is_employee);
  const hasTasksAccess = can("tasks", "read");
  const hasProjectsAccess = can("projects", "read");
  const hasTimelineAccess = can("tasks", "read") || can("projects", "read");

  const isSystemAdmin = user?.is_system_admin !== false;
  const hasTeamAccess = can("teams", "read");
  const hasEmployeesAccess = isSystemAdmin && can("employees", "read");
  const hasUsersAccess = isSystemAdmin && can("settings", "read");
  const hasUserGroupsAccess = isSystemAdmin && can("settings", "read");

  // Time Off permissions
  const hasTimeOffSection = dayOffEnabled;
  const hasTimeOffApprovals = dayOffEnabled && (isSystemAdmin || can("employees", "read"));
  const hasTimeOffPolicies = dayOffEnabled && isSystemAdmin;

  const hasWorkspaceSection = isEmployee || hasTasksAccess || hasProjectsAccess || hasTimelineAccess;
  const hasConfigurationSection =
    hasTeamAccess ||
    hasEmployeesAccess ||
    hasUsersAccess ||
    hasUserGroupsAccess ||
    hasTimeOffApprovals ||
    hasTimeOffPolicies;

  if (!isOpen) {
    return null; // The floating toggle button is now in PageHeader
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
        onClick={() => setIsOpen(false)}
      />

      <aside className="fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border h-screen flex flex-col transition-transform transform translate-x-0">
        <div className="p-3 flex flex-col gap-2 border-b border-border/50">
          <div className="flex justify-end">
            <button 
              onClick={toggleSidebar}
              className="p-1 text-muted-foreground hover:bg-muted rounded-md transition-colors"
              title="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="w-full">
            <UserProfile user={user} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* AI Task Copilot Quick Launch */}
          <div>
            <button
              onClick={toggleChatbot}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group border ${
                isChatbotOpen
                  ? "bg-primary/10 text-primary border-primary/30 shadow-xs"
                  : "border-border/60 bg-card hover:bg-muted/70 hover:border-border text-foreground"
              }`}
              title="Open AI Task Copilot (⌘J)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs font-semibold leading-tight truncate">AI Copilot</span>
                  <span className="block text-[10px] text-muted-foreground leading-tight truncate">Task Operations</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:text-foreground shrink-0">
                ⌘J
              </span>
            </button>
          </div>

          {/* Workspace Section */}
          {hasWorkspaceSection && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace</h3>
                <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <nav className="space-y-1">
                {isEmployee && (
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/dashboard")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                  </Link>
                )}
                {hasTasksAccess && (
                  <Link
                    href="/tasks"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/tasks")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Tasks
                  </Link>
                )}
                {hasProjectsAccess && (
                  <Link
                    href="/projects"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/projects")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Projects
                  </Link>
                )}
                {hasTimelineAccess && (
                  <Link
                    href="/timeline"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/timeline")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Timeline
                  </Link>
                )}
              </nav>
            </div>
          )}

          {/* Time Off Section */}
          {hasTimeOffSection && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Off</h3>
                <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <nav className="space-y-1">
                <Link
                  href="/dayoff/calendar"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/dayoff/calendar") || pathname === "/dayoff"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  Calendar
                </Link>

                <Link
                  href="/dayoff/requests"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/dayoff/requests")
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  My Leaves
                </Link>

                <Link
                  href="/dayoff/history"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith("/dayoff/history") || pathname.startsWith("/dayoff/applications")
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <History className="w-4 h-4 shrink-0" />
                  Application History
                </Link>
              </nav>
            </div>
          )}

          {/* Configuration Section */}
          {hasConfigurationSection && (
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</h3>
                <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <nav className="space-y-1">
                {hasTeamAccess && (
                  <Link
                    href="/configuration/team"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/configuration/team")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Team
                  </Link>
                )}
                {hasEmployeesAccess && (
                  <Link
                    href="/configuration/employees"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/configuration/employees")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Employees
                  </Link>
                )}
                {hasUsersAccess && (
                  <Link
                    href="/configuration/users"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/configuration/users")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Users
                  </Link>
                )}
                {hasUserGroupsAccess && (
                  <Link
                    href="/configuration/user-groups"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/configuration/user-groups")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    User Groups
                  </Link>
                )}
                {hasTimeOffApprovals && (
                  <Link
                    href="/dayoff/approvals"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/dayoff/approvals")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    Approvals
                  </Link>
                )}
                {hasTimeOffPolicies && (
                  <Link
                    href="/dayoff/policies"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/dayoff/policies") || pathname.startsWith("/configuration/day-off")
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0" />
                    Leave Policies
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
