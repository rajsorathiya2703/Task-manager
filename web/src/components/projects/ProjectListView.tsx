"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Project } from "../../lib/data";
import { ProjectListRow } from "./ProjectListRow";

interface ProjectListViewProps {
  data: Record<string, Project[]>;
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
  isFiltered?: boolean;
}

function ProjectListGroup({
  title,
  projects,
  onProjectClick,
  onAddProjectClick,
}: {
  title: string;
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-6">
      {/* Group Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-normal ml-1">
          {projects.length}
        </span>
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-xs">
          {/* Table Header */}
          <div className="flex items-center px-4 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-foreground">
            <div className="flex-1">Project</div>
            <div className="w-32">Priority</div>
            <div className="w-44">Timeline</div>
            <div className="w-32">Tasks</div>
            <div className="w-12 pr-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {projects.map((project: any, index: number) => (
              <ProjectListRow 
                key={project.id || project._id || index} 
                project={project} 
                onClick={() => onProjectClick(project)} 
              />
            ))}

            {projects.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No projects in this status
              </div>
            )}
          </div>

          {/* Footer Add Project Row */}
          {onAddProjectClick && (
            <button 
              onClick={onAddProjectClick}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors bg-card text-left border-t border-border/50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Project
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectListView({
  data,
  onProjectClick,
  onAddProjectClick,
  isFiltered = false
}: ProjectListViewProps) {
  const stages = Object.keys(data);

  if (isFiltered) {
    const allProjects = Object.values(data).flat();
    return (
      <div className="flex-1 overflow-y-auto p-4 pt-4 h-full w-full custom-scrollbar">
        <div className="max-w-6xl mx-auto pb-10">
          <ProjectListGroup
            title="Filtered Results"
            projects={allProjects}
            onProjectClick={onProjectClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pt-4 h-full w-full custom-scrollbar">
      <div className="max-w-6xl mx-auto pb-10">
        {stages.map((stage) => (
          <ProjectListGroup
            key={stage}
            title={stage}
            projects={data[stage] || []}
            onProjectClick={onProjectClick}
            onAddProjectClick={onAddProjectClick}
          />
        ))}
      </div>
    </div>
  );
}
