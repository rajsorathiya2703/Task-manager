"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Calendar, Tag, Trash2, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { Task } from "../../lib/data";

import { useDraggable } from "@dnd-kit/core";

import { formatDisplayDate } from "../../lib/utils";
import { ProjectCapsule } from "./ProjectCapsule";
import { deleteTask, duplicateTask } from "../../lib/api";

interface TaskCardProps {
  task: Task;
  showProjectCapsule?: boolean;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (newTask: Task) => void;
}

export function TaskCard({ task, showProjectCapsule = false, onDelete, onDuplicate }: TaskCardProps) {
  const taskId = task.id || (task as any)._id;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: taskId,
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setIsMenuOpen((v) => !v);
  };

  // Close on outside click
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (isActionLoading) return;
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
    if (isActionLoading) return;
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
      <Link
        href={`/tasks/${taskId}`}
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`block bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab group ${isDragging ? "opacity-50 ring-2 ring-primary" : ""}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col min-w-0 pr-2">
            <h4 className="text-sm font-medium text-foreground leading-snug">{task.title}</h4>
            {showProjectCapsule && task.project && (
              <div className="mt-1.5">
                <ProjectCapsule name={task.project.name} color={task.project.color} size="sm" />
              </div>
            )}
          </div>

          {/* Actions button */}
          <div className="shrink-0">
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <button
                ref={btnRef}
                onClick={openMenu}
                className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {(() => {
              const name = task.assignee?.fullName
                ? `${task.assignee.fullName.firstName} ${task.assignee.fullName.lastName || ''}`.trim()
                : (task.assignee?.name || '');
              const avatar = task.assignee?.avatarUrl;

              return (
                <>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name || "User"}
                      className="w-6 h-6 rounded-full object-cover border border-border/50"
                    />
                  ) : name ? (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-medium">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      ?
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground">{name || 'Unassigned'}</span>
                </>
              );
            })()}
          </div>

          {(task.startDate || task.dueDate) && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
              <Calendar className="w-3 h-3" />
              {formatDisplayDate(task.startDate, task.dueDate)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {task.tags?.map((tag, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full text-xs font-medium text-foreground border border-border/50">
              <Tag className="w-3 h-3" />
              {tag}
            </div>
          ))}
        </div>
      </Link>

      {/* Portal dropdown — rendered at document.body to escape overflow:hidden */}
      {dropdownPortal}
    </>
  );
}
