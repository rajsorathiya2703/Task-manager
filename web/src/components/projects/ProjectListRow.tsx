"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Folder, ArrowRight, Calendar, Users, Edit3, Trash2, Loader2 } from "lucide-react";
import { CompanyLink, useCompanyPath } from "../../lib/useCompanyPath";
import { Project } from "../../lib/data";
import { PriorityBadge } from "../board/PriorityBadge";
import { formatDisplayDate } from "../../lib/utils";
import { useAccessControl } from "../../contexts/AccessContext";

interface ProjectListRowProps {
  project: Project;
  onClick: () => void;
  onDelete?: (projectId: string) => Promise<void> | void;
}

export function ProjectListRow({ project, onClick, onDelete }: ProjectListRowProps) {
  const cp = useCompanyPath();
  const { can } = useAccessControl();
  const canDeleteProject = can("projects", "delete");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const projectId = project.id || (project as any)._id;
  const projectColor = project.color || "#3b82f6";
  const initialLetter = (project.name ? project.name.charAt(0) : "P").toUpperCase();
  const dateFormatted = formatDisplayDate(project.startDate, project.dueDate);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 170 });
    setIsMenuOpen((v) => !v);
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    if (!projectId || isActionLoading || !onDelete) return;
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      setIsActionLoading(true);
      await onDelete(projectId);
    } catch (err: any) {
      console.error("Failed to delete project", err);
      alert(err?.response?.data?.message || "Failed to delete project");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    onClick();
  };

  const dropdownPortal = isMenuOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: 170, zIndex: 9999 }}
          className="bg-card border border-border rounded-xl shadow-2xl py-1 text-xs animate-in fade-in-50 duration-100 outline-none"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
              onClick();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors text-foreground font-medium cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            Edit Project
          </button>
          <CompanyLink
            href={`/projects/${projectId}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors text-foreground font-medium cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            Tasks Board
          </CompanyLink>
          {onDelete && canDeleteProject && (
            <>
              <div className="border-t border-border/50 my-1" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-600 dark:text-red-400 font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                Delete Project
              </button>
            </>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        onClick={handleRowClick}
        className="group flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border hover:border-slate-grey/40 hover:shadow-xs rounded-xl transition-all cursor-pointer select-none min-w-[700px]"
      >
        {/* Column 1: Project Avatar & Name */}
        <div className="w-56 sm:w-64 lg:w-72 shrink-0 flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
            style={{ backgroundColor: projectColor }}
          >
            {initialLetter}
          </div>
          <span
            className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
            title={project.name}
          >
            {project.name}
          </span>
        </div>

        {/* Column 2: Priority Badge (Strict column alignment) */}
        <div className="w-28 shrink-0 flex items-center">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/80 bg-muted/20 text-xs">
            <PriorityBadge priority={project.priority as any} />
          </div>
        </div>

        {/* Column 3: Description & Members (Flexible space that absorbs variable width) */}
        <div className="flex-1 min-w-0 px-2 flex items-center gap-2 text-xs text-muted-foreground">
          {project.members && project.members.length > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/80 bg-muted/20 text-xs text-muted-foreground shrink-0">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span>{project.members.length}</span>
            </div>
          )}
          <span className="truncate" title={project.description || ""}>
            {project.description || ""}
          </span>
        </div>

        {/* Column 4: Tasks Board button (Strict column alignment) */}
        <div className="w-36 shrink-0 flex items-center justify-center">
          <CompanyLink
            href={`/projects/${projectId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground hover:text-primary transition-all shadow-xs"
          >
            <Folder className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Tasks Board</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </CompanyLink>
        </div>

        {/* Column 5: Due Date (Fixed 52 width so date ranges like Oct 18 - Oct 31, 2026 never overlap) */}
        <div className="w-48 sm:w-52 shrink-0 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap pl-2">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">DUE</span>
          <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
          <span className="truncate">{dateFormatted || "No date"}</span>
        </div>

        {/* Column 6: Actions Menu (Pinned on far right) */}
        <div className="w-8 shrink-0 flex items-center justify-end">
          {isActionLoading ? (
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
          )}
        </div>
      </div>

      {dropdownPortal}
    </>
  );
}
