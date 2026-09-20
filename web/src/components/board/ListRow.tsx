import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Plus, Play, Square, Loader2, Trash2, Copy } from "lucide-react";
import Link from "next/link";
import { Task } from "../../lib/data";
import { PriorityBadge } from "./PriorityBadge";
import { formatDisplayDate } from "../../lib/utils";
import { startTaskTimer, stopTaskTimer, deleteTask, duplicateTask } from "../../lib/api";
import { useTimer } from "../../contexts/TimerContext";
import { ProjectCapsule } from "./ProjectCapsule";

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
  const { refreshTimer } = useTimer();
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
  const progressBadge = ratio <= 0.70 ? "text-emerald-600 dark:text-emerald-400" : ratio <= 0.90 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

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
    // Align right edge of menu with right edge of button
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

  // Fixed-position dropdown portal — escapes any overflow:hidden ancestor
  const dropdownPortal = isMenuOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: 160, zIndex: 9999 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-1 text-sm"
        >
          <button
            onClick={handleDuplicate}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors text-foreground"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            Duplicate
          </button>
          <div className="border-t border-border/50 my-1" />
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Delete
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <Link href={`/tasks/${taskId}`} className="group flex items-center px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors bg-card cursor-pointer gap-2">
        {/* Title */}
        <div className="flex-1 min-w-[180px] font-medium text-sm text-foreground truncate flex items-center gap-2">
          <span className="truncate">{task.title}</span>
          {showProjectCapsule && task.project && (
            <ProjectCapsule name={task.project.name} color={task.project.color} size="sm" />
          )}
        </div>

        {/* Priority */}
        <div className="w-28 flex items-center">
          <PriorityBadge priority={task.priority} />
        </div>

        {/* Assignee */}
        <div className="w-28 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {task.assignee?.avatarUrl ? (
            <img
              src={task.assignee.avatarUrl}
              alt={assigneeName || "User"}
              className="w-5 h-5 rounded-full object-cover border border-border/50 shrink-0"
            />
          ) : assigneeName ? (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-medium shrink-0">
              {assigneeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground shrink-0">
              <Plus className="w-2.5 h-2.5" />
            </div>
          )}
          <span className="truncate">{assigneeName || "Unassigned"}</span>
        </div>

        {/* Timer / Logged Time */}
        <div className="w-36 flex items-center gap-1.5">
          <button
            onClick={handleTimerToggle}
            disabled={isTimerLoading}
            className={`p-1 rounded-md transition-all shrink-0 ${
              task.isTimerRunning
                ? "bg-red-500 text-white animate-pulse"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
            title={task.isTimerRunning ? "Stop Timer" : "Start Timer"}
          >
            {isTimerLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : task.isTimerRunning ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
          <span className="text-xs font-semibold text-foreground">
            {formatDuration(totalLoggedSeconds)}
          </span>
        </div>

        {/* Time Progress Bar */}
        <div className="w-40 flex flex-col justify-center gap-1 pr-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">{task.estimatedHours || 0}h allocated</span>
            <span className={`font-bold ${progressBadge}`}>{percent}%</span>
          </div>
          <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden border border-border/40">
            <div
              className={`h-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Due Date */}
        <div className="w-32 flex items-center text-xs text-muted-foreground truncate">
          {formatDisplayDate(task.startDate, task.dueDate) || "No date"}
        </div>

        {/* Actions */}
        <div className="w-12 flex items-center justify-end pr-2">
          {isActionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              ref={btnRef}
              onClick={openMenu}
              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </Link>

      {/* Portal dropdown — rendered at document.body to escape overflow:hidden */}
      {dropdownPortal}
    </>
  );
}
