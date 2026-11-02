"use client";

import { useMemo } from "react";
import {
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { CompanyLink } from "../../lib/useCompanyPath";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { ProgressBar } from "../ui/ProgressBar";
import { Avatar } from "../ui/Avatar";
import { StatusBadge, PriorityBadgeChip } from "../ui/Badge";
import { cn, formatDisplayDate, statusStyles } from "../../lib/utils";

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function assigneeName(task: any): string {
  if (task?.assignee?.fullName) {
    return `${task.assignee.fullName.firstName || ""} ${task.assignee.fullName.lastName || ""}`.trim();
  }
  if (task?.assignee?.name) return task.assignee.name;
  if (task?.members?.[0]?.name) return task.members[0].name;
  if (task?.members?.[0]?.email) return task.members[0].email.split("@")[0];
  return "Unassigned";
}

export function DashboardOverview({
  userName,
  tasks = [],
  projects = [],
  leaveApplications = [],
  recentActivity = [],
  showTimeOff = false,
}: {
  userName?: string;
  tasks?: any[];
  projects?: any[];
  leaveApplications?: any[];
  recentActivity?: any[];
  showTimeOff?: boolean;
}) {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (userName || "there").split(" ")[0];

  const stats = useMemo(() => {
    const open = tasks.filter((t) => (t.status || "To Do") !== "Completed");
    const completed = tasks.filter((t) => t.status === "Completed");
    const dueThisWeek = open.filter((t) => {
      const due = parseDate(t.dueDate);
      return due && isWithinInterval(due, { start: weekStart, end: weekEnd });
    });
    const overdue = open.filter((t) => {
      const due = parseDate(t.dueDate);
      return due && isBefore(due, today);
    });
    const dueToday = open.filter((t) => {
      const due = parseDate(t.dueDate);
      return due && isSameDay(due, today);
    });
    return {
      open: open.length,
      dueThisWeek: dueThisWeek.length,
      overdue: overdue.length,
      completed: completed.length,
      dueToday: dueToday.length,
      myOpen: open.slice(0, 6),
    };
  }, [tasks, today, weekEnd, weekStart]);

  const projectProgress = useMemo(() => {
    return projects.slice(0, 5).map((project) => {
      const id = project._id || project.id;
      const related = tasks.filter((t) => {
        const pid = typeof t.projectId === "object" ? t.projectId?._id || t.projectId?.id : t.projectId;
        return pid === id;
      });
      const total = related.length;
      const done = related.filter((t) => t.status === "Completed").length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id,
        name: project.name,
        color: project.color || "#6d5efc",
        total,
        done,
        pct,
      };
    });
  }, [projects, tasks]);

  const workload = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string; count: number }>();
    tasks
      .filter((t) => (t.status || "To Do") !== "Completed")
      .forEach((t) => {
        const name = assigneeName(t);
        const key = t.assignee?._id || t.assignee?.email || name;
        const prev = map.get(key) || { name, avatarUrl: t.assignee?.avatarUrl, count: 0 };
        prev.count += 1;
        map.set(key, prev);
      });
    const rows = Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    const max = Math.max(...rows.map((r) => r.count), 1);
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }, [tasks]);

  const upcomingLeave = useMemo(() => {
    return (leaveApplications || [])
      .filter((app) => {
        const status = String(app.status || "").toLowerCase();
        if (status === "rejected" || status === "cancelled") return false;
        const end = parseDate(app.endDate || app.toDate);
        return !end || !isBefore(end, today);
      })
      .slice(0, 4);
  }, [leaveApplications, today]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {format(today, "EEEE, MMM d")} · {stats.dueToday} task{stats.dueToday === 1 ? "" : "s"} due today
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Open" value={stats.open} dotClass="bg-primary" />
        <StatCard label="Due this week" value={stats.dueThisWeek} dotClass="bg-blue-500" />
        <StatCard label="Overdue" value={stats.overdue} dotClass="bg-rose-500" />
        <StatCard label="Completed" value={stats.completed} dotClass="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">My tasks</h3>
            <CompanyLink href="/tasks" className="text-xs font-medium text-primary hover:underline">
              View all
            </CompanyLink>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {stats.myOpen.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No open tasks right now</p>
            ) : (
              stats.myOpen.map((task) => {
                const id = task._id || task.id;
                const due = parseDate(task.dueDate);
                const overdue = due && isBefore(due, today);
                const styles = statusStyles(task.status);
                return (
                  <CompanyLink
                    key={id}
                    href={`/tasks/${id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 hover:border-primary/30 transition-colors"
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", styles.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={task.status} />
                        <PriorityBadgeChip priority={task.priority} />
                      </div>
                    </div>
                    <span className={cn("text-xs shrink-0", overdue ? "text-rose-600 font-semibold" : "text-muted-foreground")}>
                      {due ? (isSameDay(due, today) ? "Today" : formatDisplayDate(task.dueDate)) : "—"}
                    </span>
                  </CompanyLink>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Project progress</h3>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {projectProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No projects yet</p>
            ) : (
              projectProgress.map((project) => (
                <div key={project.id}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: project.color }} />
                      <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {project.total > 0 ? `${project.pct}%` : "—"}
                    </span>
                  </div>
                  <ProgressBar value={project.pct} color={project.color} />
                  {project.total > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {project.done} of {project.total} tasks
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", showTimeOff ? "xl:grid-cols-3" : "xl:grid-cols-2")}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Workload</h3>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {workload.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No open assignments</p>
            ) : (
              workload.map((person) => (
                <div key={person.name} className="flex items-center gap-3">
                  <Avatar name={person.name} src={person.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{person.name}</span>
                      <span className="text-xs text-muted-foreground">{person.count}</span>
                    </div>
                    <ProgressBar value={person.pct} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {(recentActivity || []).slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity</p>
            ) : (
              (recentActivity || []).slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <Avatar name={item.user?.name} src={item.user?.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">{item.user?.name || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{item.message || item.type}</span>
                    </p>
                    {item.timestamp && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(item.timestamp), "MMM d · h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {showTimeOff && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">Upcoming time off</h3>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {upcomingLeave.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No upcoming leave</p>
              ) : (
                upcomingLeave.map((app) => {
                  const name = app.employee?.name || app.user?.name || app.employeeName || "Employee";
                  const type = app.leaveType?.name || app.type || "Leave";
                  return (
                    <div key={app._id || app.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDisplayDate(app.startDate || app.fromDate, app.endDate || app.toDate)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                        {type}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
