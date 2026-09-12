"use client";

import { useDraggable } from "@dnd-kit/core";
import { Project } from "../../lib/data";
import { PriorityBadge } from "../board/PriorityBadge";
import { Calendar, MoreHorizontal, Folder, ArrowRight } from "lucide-react";
import { formatDisplayDate } from "../../lib/utils";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const projectId = project.id || (project as any)._id;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: projectId,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  const projectColor = project.color || "#3b82f6";
  const initialLetter = (project.name ? project.name.charAt(0) : "P").toUpperCase();
  const dateFormatted = formatDisplayDate(project.startDate, project.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`block bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
        isDragging ? "opacity-50 ring-2 ring-primary" : ""
      }`}
    >
      {/* Top row: Color Badge Avatar + Name + More */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
            style={{ backgroundColor: projectColor }}
          >
            {initialLetter}
          </div>
          <h4 className="text-sm font-semibold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
            {project.name}
          </h4>
        </div>
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

      {/* Description */}
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Middle row: Priority & Dates */}
      <div className="flex items-center justify-between gap-2 mb-3 pt-1">
        <PriorityBadge priority={project.priority as any} />

        {dateFormatted && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-md">
            <Calendar className="w-3 h-3" />
            <span>{dateFormatted}</span>
          </div>
        )}
      </div>

      {/* Bottom row: Direct Task Link */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5" />
          Project Tasks
        </span>
        <Link
          href={`/projects/${projectId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          Open Board
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
