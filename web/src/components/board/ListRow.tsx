import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Plus, Play, Square, Loader2, Trash2, Copy, Calendar } from "lucide-react";
import { CompanyLink, useCompanyPath } from "../../lib/useCompanyPath";
import { Task } from "../../lib/data";
import { PriorityBadge } from "./PriorityBadge";
import { formatDisplayDate } from "../../lib/utils";
import { startTaskTimer, stopTaskTimer, deleteTask, duplicateTask } from "../../lib/api";
import { useTimer } from "../../contexts/TimerContext";
import { ProjectCapsule } from "./ProjectCapsule";
import { useAccessControl } from "../../contexts/AccessContext";
import { useRouter } from "next/navigation";

interface ListRowProps {
  task: Task;
  showProjectCapsule?: boolean;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (newTask: Task) => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ListRow({ task: initialTask, showProjectCapsule = false, onDelete, onDuplicate }: ListRowProps) {
  const cp = useCompanyPath();
  const router = useRouter();
  const { refreshTimer } = useTimer();
  const { can } = useAccessControl();
  const canCreateTask = can("tasks", "create");
  const canDeleteTask = can("tasks", "delete");
  const hasActions = canCreateTask || canDeleteTask;
  const [task, setTask] = useState<Task>(initialTask);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  // Position of the fixed dropdown
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const taskId = task.id || (task as any)._id;
  const rawLoggedSeconds = (task.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
  const estimatedSec = (task.estimatedHours || 0) * 3600;
  const totalLoggedSeconds = estimatedSec > 0 ? Math.min(rawLoggedSeconds, estimatedSec) : rawLoggedSeconds;
  const ratio = estimatedSec > 0 ? (totalLoggedSeconds / estimatedSec) : 0;
  const percent = Math.min(100, Math.round(ratio * 100));
  const progressColor = ratio <= 0.70 ? "bg-emerald-500" : ratio <= 0.90 ? "bg-amber-500" : "bg-red-500";

  const assignedMember = task.members && task.members.length > 0 ? task.members[0] : null;
  const assigneeName = assignedMember
    ? (assignedMember.name || assignedMember.email.split('@')[0])
    : (task.assignee?.fullName ? `${task.assignee.fullName.firstName} ${task.assignee.fullName.lastName || ''}`.trim() : task.assignee?.name);

  // Open menu anchored to button position
  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setIsMenuOpen((v) => !v);
  };

  // Close menu when clicking anywhere outside the menu panel
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!taskId || taskId === 'new' || isTimerLoading) return;

    try {
      setIsTimerLoading(true);
      if (task.isTimerRunning) {
        const updated = await stopTaskTimer(taskId);
        if (updated) {
          setTask((prev) => ({
            ...prev,
            isTimerRunning: false,
            timeEntries: updated.timeEntries || prev.timeEntries,
          }));
        }
      } else {
        const updated = await startTaskTimer(taskId);
        if (updated) {
          setTask((prev) => ({
            ...prev,
            isTimerRunning: true,
            timerStartedAt: updated.timerStartedAt,
          }));
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update timer");
    } finally {
      setIsTimerLoading(false);
      refreshTimer();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (!taskId || isActionLoading) return;
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      setIsActionLoading(true);
      await deleteTask(taskId);
      onDelete?.(taskId);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete task");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (!taskId || isActionLoading) return;
    try {
      setIsActionLoading(true);
      const newTask = await duplicateTask(taskId);
      onDuplicate?.(newTask);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to duplicate task");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Navigate to task detail if not clicking an interactive button/link
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    router.push(cp(`/tasks/${taskId}`));
  };

  // Fixed-position dropdown portal — escapes any overflow:hidden ancestor
  const dropdownPortal = isMenuOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: 160, zIndex: 9999 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-1 text-sm animate-in fade-in-50 duration-100"
        >
          {canCreateTask && (
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors text-foreground"
            >
              <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              Duplicate
            </button>
          )}
          {canCreateTask && canDeleteTask && <div className="border-t border-border/50 my-1" />}
          {canDeleteTask && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              Delete
            </button>
          )}
        </div>,
        document.body
      )
    : null;

  const displayDate = formatDisplayDate(task.startDate, task.dueDate);

  return (
    <>
      <div 
        onClick={handleRowClick}
        className="group flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border hover:border-slate-grey/40 hover:shadow-xs rounded-xl transition-all cursor-pointer select-none min-w-[760px]"
      >
        {/* Column 1: Timer Button and Logged Duration */}
        <div className="w-28 shrink-0 flex items-center">
          <button
            onClick={handleTimerToggle}
            disabled={isTimerLoading}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-xs ${
              task.isTimerRunning
                ? "bg-red-500 text-white animate-pulse"
                : "bg-carbon-black hover:bg-gunmetal text-bright-snow dark:bg-bright-snow dark:hover:bg-platinum dark:text-carbon-black"
            }`}
            title={task.isTimerRunning ? "Stop Timer" : "Start Timer"}
          >
            {isTimerLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : task.isTimerRunning ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
          <span className="text-xs font-semibold text-foreground ml-2 whitespace-nowrap">
            {formatDuration(totalLoggedSeconds)}
          </span>
        </div>

        {/* Column 2: Task Title */}
        <div className="w-56 sm:w-64 lg:w-72 shrink-0 flex items-center min-w-0">
          <CompanyLink
            href={`/tasks/${taskId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
            title={task.title}
          >
            {task.title}
          </CompanyLink>
        </div>

        {/* Column 3: Project Capsule */}
        <div className="w-36 shrink-0 flex items-center">
          {showProjectCapsule && task.project ? (
            <ProjectCapsule name={task.project.name} color={task.project.color} size="sm" />
          ) : (
            <span className="opacity-0">—</span>
          )}
        </div>

        {/* Column 4: Priority Badge (Strict column alignment) */}
        <div className="w-28 shrink-0 flex items-center">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/80 bg-muted/20 text-xs">
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Column 5: Assignee (Strict column alignment) */}
        <div className="w-32 shrink-0 flex items-center">
          {assigneeName ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/80 bg-muted/20 text-xs text-foreground truncate">
              {task.assignee?.avatarUrl ? (
                <img
                  src={task.assignee.avatarUrl}
                  alt={assigneeName}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                  {assigneeName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate max-w-[90px] font-medium">{assigneeName}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-border/90 text-xs text-muted-foreground">
              <Plus className="w-3 h-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Column 6: Progress & Allocated Hours (Center bounded space) */}
        <div className="flex-1 min-w-[140px] px-2 hidden lg:flex items-center justify-center gap-2.5 text-xs">
          <span className="text-muted-foreground font-normal whitespace-nowrap">
            {task.estimatedHours || 0}h
          </span>
          <div className="w-20 sm:w-24 bg-muted/80 rounded-full h-1.5 overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="font-bold text-foreground text-xs w-7 text-right shrink-0">
            {percent}%
          </span>
        </div>

        {/* Column 7: Due Date (Fixed w-52 column, matching Project List Row!) */}
        <div className="w-48 sm:w-52 shrink-0 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap pl-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">DUE</span>
          <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
          <span className="truncate">{displayDate || "No date"}</span>
        </div>

        {/* Column 8: Actions Menu (Pinned on far right) */}
        <div className="w-8 shrink-0 flex items-center justify-end">
          {hasActions && (
            isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                ref={btnRef}
                onClick={openMenu}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Portal dropdown — rendered at document.body to escape overflow:hidden */}
      {dropdownPortal}
    </>
  );
}
