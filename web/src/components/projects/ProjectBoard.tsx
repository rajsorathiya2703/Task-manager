"use client";

import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners, useDroppable } from "@dnd-kit/core";
import { Project } from "../../lib/data";
import { ProjectCard } from "./ProjectCard";
import { Plus } from "lucide-react";

interface ProjectBoardProps {
  data: Record<string, Project[]>;
  onProjectStatusChange?: (projectId: string, newStatus: string) => void;
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
}

function ProjectColumn({
  status,
  projects,
  onProjectClick,
  onAddProjectClick,
}: {
  status: string;
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getStatusDot = (st: string) => {
    switch (st) {
      case "Completed":
        return "bg-green-500";
      case "Doing":
        return "bg-blue-500";
      case "On Hold":
        return "bg-red-500";
      default:
        return "bg-orange-500";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 shrink-0 bg-muted/40 border border-border/60 rounded-2xl p-3 h-full max-h-full transition-colors ${
        isOver ? "bg-muted/70 ring-2 ring-primary/20" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(status)}`} />
          <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">{status}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
            {projects.length}
          </span>
        </div>

        {onAddProjectClick && (
          <button
            onClick={onAddProjectClick}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Add Project"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar min-h-[100px]">
        {projects.map((project) => (
          <ProjectCard
            key={project.id || (project as any)._id}
            project={project}
            onClick={() => onProjectClick(project)}
          />
        ))}

        {projects.length === 0 && (
          <div className="h-28 border border-dashed border-border/80 rounded-xl flex items-center justify-center text-xs text-muted-foreground/60">
            No projects in this stage
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectBoard({
  data,
  onProjectStatusChange,
  onProjectClick,
  onAddProjectClick,
}: ProjectBoardProps) {
  const stages = Object.keys(data);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as string;

    let currentStatus = null;
    for (const st of stages) {
      if (data[st]?.find((p: any) => p.id === projectId || p._id === projectId)) {
        currentStatus = st;
        break;
      }
    }

    if (currentStatus && currentStatus !== newStatus && onProjectStatusChange) {
      onProjectStatusChange(projectId, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-4 pt-4 h-full w-full custom-scrollbar">
        <div className="flex gap-4 h-full items-start">
          {stages.map((stage) => (
            <ProjectColumn
              key={stage}
              status={stage}
              projects={data[stage] || []}
              onProjectClick={onProjectClick}
              onAddProjectClick={onAddProjectClick}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
