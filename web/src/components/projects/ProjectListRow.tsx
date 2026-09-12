"use client";

import { Project } from "../../lib/data";
import { PriorityBadge } from "../board/PriorityBadge";
import { MoreHorizontal, Folder, ArrowRight } from "lucide-react";
import { formatDisplayDate } from "../../lib/utils";
import Link from "next/link";

interface ProjectListRowProps {
  project: Project;
  onClick: () => void;
}

export function ProjectListRow({ project, onClick }: ProjectListRowProps) {
  const projectId = project.id || (project as any)._id;
  const projectColor = project.color || "#3b82f6";
  const initialLetter = (project.name ? project.name.charAt(0) : "P").toUpperCase();
  const dateFormatted = formatDisplayDate(project.startDate, project.dueDate);

  return (
    <div 
      onClick={onClick}
      className="group flex items-center px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors bg-card cursor-pointer"
    >
      {/* Name + Avatar */}
      <div className="flex-1 flex items-center gap-3 min-w-0 pr-4">
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow-xs"
          style={{ backgroundColor: projectColor }}
        >
          {initialLetter}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </span>
          {project.description && (
            <span className="text-xs text-muted-foreground truncate max-w-md">
              {project.description}
            </span>
          )}
        </div>
      </div>

      {/* Priority */}
      <div className="w-32 flex items-center">
        <PriorityBadge priority={project.priority as any} />
      </div>

      {/* Dates */}
      <div className="w-44 flex items-center text-xs text-muted-foreground">
        {dateFormatted || <span className="opacity-50">—</span>}
      </div>

      {/* Open tasks link */}
      <div className="w-32 flex items-center">
        <Link
          href={`/projects/${projectId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Folder className="w-3.5 h-3.5" />
          Tasks Board
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Actions */}
      <div className="w-12 flex items-center justify-end pr-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
