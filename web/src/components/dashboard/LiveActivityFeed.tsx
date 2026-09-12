"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Radio, 
  Activity, 
  Clock, 
  Play, 
  Square, 
  Loader2, 
  ArrowUpRight, 
  CheckCircle2, 
  MessageSquare, 
  Tag, 
  AlertCircle, 
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { useTimer } from "@/src/contexts/TimerContext";
import { stopTaskTimer } from "@/src/lib/api";

interface LiveActivityFeedProps {
  liveNow?: Array<{
    employeeId: string;
    name: string;
    avatarUrl: string;
    taskTitle: string;
    startedAt: string | Date;
  }>;
  recentActivity?: Array<{
    taskId?: string;
    taskTitle?: string;
    user: { name: string; avatarUrl?: string };
    type: string;
    message: string;
    timestamp: string | Date;
  }>;
  selectedEmployee?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
  } | null;
}

export function LiveActivityFeed({
  liveNow = [],
  recentActivity = [],
  selectedEmployee,
}: LiveActivityFeedProps) {
  const { activeTask, isActive, timerStartedAt, refreshTimer, clearTimer } = useTimer();
  const [elapsed, setElapsed] = useState<number>(0);
  const [isStopping, setIsStopping] = useState(false);
  const [showTeamTimers, setShowTeamTimers] = useState(false);
  const [, setTeamTick] = useState(Date.now());

  // Real-time tick for current user's active timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timerStartedAt) {
      const updateTimer = () => {
        const start = new Date(timerStartedAt).getTime();
        const now = Date.now();
        const seconds = Math.max(0, Math.floor((now - start) / 1000));
        setElapsed(seconds);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isActive, timerStartedAt]);

  // Team live timers tick
  useEffect(() => {
    const timer = setInterval(() => setTeamTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStopTimer = async () => {
    if (!activeTask?._id || isStopping) return;
    setIsStopping(true);
    try {
      await stopTaskTimer(activeTask._id);
      clearTimer();
      await refreshTimer();
    } catch (error) {
      console.error("Failed to stop timer:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const formatElapsed = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTeamElapsed = (startedAt: string | Date) => {
    if (!startedAt) return "00:00:00";
    const startMs = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    return formatElapsed(elapsedSec);
  };

  const formatRelativeTime = (timestamp: string | Date) => {
    try {
      const date = typeof timestamp === "string" ? parseISO(timestamp) : timestamp;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const formatStartTime = (timestamp?: string | null) => {
    if (!timestamp) return "";
    try {
      const date = typeof timestamp === "string" ? parseISO(timestamp) : timestamp;
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  };

  // Circular progress calculations
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Progress percentage calculation
  let progressPct = 0;
  let progressLabel = "";
  let ringColor = "#10b981"; // Emerald default

  if (isActive && activeTask) {
    if (activeTask.estimatedHours && activeTask.estimatedHours > 0) {
      const targetSec = activeTask.estimatedHours * 3600;
      const prevLoggedSec = (activeTask.timeEntries || []).reduce(
        (acc: number, entry: any) => acc + (entry.durationSeconds || 0),
        0
      );
      const totalSec = prevLoggedSec + elapsed;
      progressPct = Math.min(100, Math.round((totalSec / targetSec) * 100));
      progressLabel = `${progressPct}% of ${activeTask.estimatedHours}h est.`;
      
      if (progressPct >= 95) {
        ringColor = "#f43f5e"; // Rose
      } else if (progressPct >= 75) {
        ringColor = "#f59e0b"; // Amber
      } else {
        ringColor = "#10b981"; // Emerald
      }
    } else {
      // 60-second sweep cycle for live feedback
      progressPct = Math.round(((elapsed % 60) / 60) * 100);
      progressLabel = "Live Running";
      ringColor = "#10b981";
    }
  }

  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  // Activity type icon helper
  const getActivityIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "timer":
        return <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />;
      case "status":
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case "tags":
      case "labels":
        return <Tag className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-primary" />;
    }
  };

  // Other team members with active timers
  const otherTeamLive = liveNow.filter(
    (item) => item.taskTitle !== activeTask?.title
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      {/* 1. HERO CARD: Current User Live Time Tracker with Circular Progress */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
        {/* Ambient background glow when timer is active */}
        {isActive && (
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              {isActive ? (
                <>
                  <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              ) : (
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/40" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Live Time Tracker
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isActive ? "Your task timer is currently recording live work" : "Personal real-time task timer tracker"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isActive && timerStartedAt && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg border border-border/50 hidden sm:inline-block">
                Started {formatStartTime(timerStartedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Circular Progress Meter & Active Task Section */}
        <div className="flex-1 flex flex-col items-center justify-center py-2 relative z-10">
          {isActive && activeTask ? (
            <div className="w-full flex flex-col md:flex-row items-center justify-around gap-6 py-2">
              {/* Circular Progress Meter */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg width={size} height={size} className="transform -rotate-90">
                  {/* Outer Background Track */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/30"
                  />
                  {/* Dynamic Progress Circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 6px ${ringColor}40)`,
                    }}
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute flex flex-col items-center justify-center text-center px-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Tracking
                    </span>
                  </div>
                  <span className="text-2xl font-mono font-black tracking-tight text-foreground">
                    {formatElapsed(elapsed)}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5 max-w-[120px] truncate">
                    {progressLabel}
                  </span>
                </div>
              </div>

              {/* Active Task Info & Controls */}
              <div className="flex-1 w-full max-w-sm flex flex-col justify-center space-y-3 bg-muted/40 p-4 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Active Task
                  </span>
                  <Link
                    href={`/tasks/${activeTask._id}`}
                    className="group inline-flex items-center gap-1 text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-2"
                  >
                    <span>{activeTask.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {activeTask.status && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 text-[11px]">
                      {activeTask.status}
                    </span>
                  )}
                  {activeTask.priority && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20 text-[11px]">
                      {activeTask.priority}
                    </span>
                  )}
                  {activeTask.estimatedHours && activeTask.estimatedHours > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium text-[11px]">
                      Est: {activeTask.estimatedHours}h
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleStopTimer}
                    disabled={isStopping}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isStopping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Stop Timer</span>
                  </button>

                  <Link
                    href={`/tasks/${activeTask._id}`}
                    className="px-3 py-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold transition-colors"
                  >
                    Task Details
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Standby / Idle State with Clean Circular Dial */
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
              <div className="relative flex items-center justify-center shrink-0">
                <svg width={size} height={size} className="transform -rotate-90">
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray="6 6"
                    className="text-muted/30"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <Clock className="w-5 h-5 text-muted-foreground mb-1 opacity-60" />
                  <span className="text-xl font-mono font-bold text-muted-foreground">
                    00:00:00
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5">
                    Idle Standby
                  </span>
                </div>
              </div>

              <div className="text-center sm:text-left max-w-xs space-y-2">
                <h4 className="text-sm font-bold text-foreground">No Task Timer Running</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start tracking your work time on any assigned task. Live progress will display right here in real time.
                </p>
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Go to My Tasks</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Optional Section: Other active team members */}
        {otherTeamLive.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 relative z-10">
            <button
              onClick={() => setShowTeamTimers(!showTeamTimers)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <Users className="w-3.5 h-3.5 text-primary" />
                Other Active Team Members ({otherTeamLive.length})
              </span>
              {showTeamTimers ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showTeamTimers && (
              <div className="mt-2 space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                {otherTeamLive.map((live, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                        <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate text-[11px]">
                          {live.taskTitle}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {live.name}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                      {formatTeamElapsed(live.startedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. RECENT ACTIVITY CARD: Current User Specific Recent Updates */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {selectedEmployee?.name ? `${selectedEmployee.name.split(" ")[0]}'s Activity` : "Recent Activity"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Your latest workspace updates, status changes & logged actions
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {recentActivity.length} Recent
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">No recent activity logs found.</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Actions like starting timers, updating tasks, or adding comments will appear here.
              </p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="relative flex items-start gap-3 text-xs group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-xs">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                  </div>

                  <div className="flex-1 min-w-0 bg-muted/20 p-2.5 rounded-xl border border-border/40 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="p-1 rounded-md bg-card border border-border/50 shrink-0">
                          {getActivityIcon(activity.type)}
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {activity.user?.name || "You"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 shrink-0 font-medium">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {activity.message}
                    </p>

                    {activity.taskTitle && (
                      <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">
                          Task: <span className="text-foreground font-semibold">{activity.taskTitle}</span>
                        </span>
                        {activity.taskId && (
                          <Link
                            href={`/tasks/${activity.taskId}`}
                            className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
