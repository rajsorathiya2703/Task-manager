"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Project } from "../../lib/data";
import { ProjectListRow } from "./ProjectListRow";
import { useAccessControl } from "../../contexts/AccessContext";

interface ProjectListViewProps {
  data: Record<string, Project[]>;
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  isFiltered?: boolean;
}

function ProjectListGroup({
  index,
  title,
  projects,
  onProjectClick,
  onAddProjectClick,
  onDeleteProject,
  showAddProject = true,
}: {
  index?: number;
  title: string;
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onAddProjectClick?: () => void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  showAddProject?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { can } = useAccessControl();
  const canCreateProject = can("projects", "create");

  return (
    <div id={`stage-${encodeURIComponent(title)}`} className="scroll-mt-6">
      {/* Group Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center cursor-pointer select-none group"
        >
          {index !== undefined && (
            <span className="text-pale-slate-2 dark:text-iron-grey font-bold text-lg sm:text-xl font-mono mr-2 group-hover:text-foreground/80 transition-colors">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-muted-foreground transition-colors flex items-center gap-2">
            {title}
          </h3>
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-md bg-carbon-black text-white dark:bg-bright-snow dark:text-carbon-black text-xs font-bold ml-2 shadow-xs">
            {projects.length}
          </span>
          <button 
            className="ml-2 text-muted-foreground/60 hover:text-foreground p-0.5 rounded transition-colors"
            aria-label="Toggle group visibility"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Header Add Project Button */}
        {showAddProject && onAddProjectClick && canCreateProject && (
          <button 
            onClick={onAddProjectClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add project</span>
          </button>
        )}
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="overflow-x-auto custom-scrollbar pb-1">
          {projects.length > 0 ? (
            <div className="flex flex-col gap-2.5 min-w-full">
              {projects.map((project: any, idx: number) => (
                <ProjectListRow 
                  key={project.id || project._id || idx} 
                  project={project} 
                  onClick={() => onProjectClick(project)} 
                  onDelete={onDeleteProject}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl px-5 py-4 bg-card/40 dark:bg-card/20 flex items-center justify-between text-xs text-muted-foreground hover:border-slate-grey/40 transition-colors">
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>No projects yet</span>
              </div>
              {showAddProject && onAddProjectClick && canCreateProject && (
                <button
                  onClick={onAddProjectClick}
                  className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Add project
                </button>
              )}
            </div>
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
  onDeleteProject,
  isFiltered = false
}: ProjectListViewProps) {
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const defaultStages = ["To Do", "Doing", "Completed", "On Hold"];
  const availableStages = Object.keys(data);
  const stages = useMemo(() => {
    if (availableStages.length === 0) return defaultStages;
    const isStandard = availableStages.every((s) => defaultStages.includes(s));
    if (isStandard) {
      return defaultStages.filter((s) => availableStages.includes(s));
    }
    return availableStages;
  }, [availableStages]);

  const allProjects = useMemo(() => Object.values(data).flat(), [data]);

  const activeProjectsCount = useMemo(() => {
    return allProjects.filter((p) => {
      const st = (p.status || '').toLowerCase();
      return st === 'doing' || st === 'in progress' || st === 'to do';
    }).length;
  }, [allProjects]);

  const handleStageClick = (stage: string) => {
    if (activeStage === stage) {
      setActiveStage(null);
    } else {
      setActiveStage(stage);
      const el = document.getElementById(`stage-${encodeURIComponent(stage)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const renderStageIcon = (stageName: string) => {
    const s = stageName.toLowerCase();
    if (s === "to do") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    }
    if (s === "doing" || s === "in progress") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
        </svg>
      );
    }
    if (s === "completed" || s === "done") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-4.5" />
        </svg>
      );
    }
    if (s === "on hold") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="10" x2="10" y1="9" y2="15" />
          <line x1="14" x2="14" y1="9" y2="15" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  };

  const summaryHeader = (
    <div className="flex flex-col lg:flex-row items-stretch justify-between gap-3 mb-8">
      {/* Stage Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
        {stages.map((stage, index) => {
          const isCardActive = activeStage ? activeStage === stage : index === 0;
          const count = (data[stage] || []).length;

          return (
            <button
              key={stage}
              onClick={() => handleStageClick(stage)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all cursor-pointer text-left select-none ${
                isCardActive
                  ? "bg-carbon-black text-bright-snow dark:bg-bright-snow dark:text-carbon-black shadow-sm"
                  : "bg-card border border-border text-foreground hover:border-slate-grey/40 hover:bg-muted/30 shadow-xs"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 mr-3">
                <span className={isCardActive ? "text-bright-snow dark:text-carbon-black" : "text-muted-foreground"}>
                  {renderStageIcon(stage)}
                </span>
                <span className={`text-sm font-semibold truncate ${
                  isCardActive ? "text-bright-snow dark:text-carbon-black" : "text-foreground"
                }`}>
                  {stage}
                </span>
              </div>
              <span className={`text-xl sm:text-2xl font-bold shrink-0 ${
                isCardActive ? "text-bright-snow dark:text-carbon-black" : "text-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projects Stats Summary Card */}
      <div className="flex items-center justify-between sm:justify-around gap-6 px-6 py-3.5 bg-card border border-dashed border-border rounded-xl shadow-xs shrink-0 min-w-[220px] lg:min-w-[240px]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            PROJECTS
          </span>
          <span className="text-xl sm:text-2xl font-bold text-foreground">
            {allProjects.length}
          </span>
        </div>
        <div className="h-8 w-px bg-border my-auto" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            ACTIVE
          </span>
          <span className="text-xl sm:text-2xl font-bold text-foreground">
            {activeProjectsCount}
          </span>
        </div>
      </div>
    </div>
  );

  if (isFiltered) {
    const allFilteredProjects = Object.values(data).flat();
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 h-full w-full custom-scrollbar">
        <div className="max-w-7xl mx-auto pb-16">
          {summaryHeader}
          <ProjectListGroup
            title="Filtered Results"
            projects={allFilteredProjects}
            onProjectClick={onProjectClick}
            onAddProjectClick={onAddProjectClick}
            onDeleteProject={onDeleteProject}
            showAddProject={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 h-full w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto pb-16">
        {summaryHeader}
        <div className="space-y-8">
          {stages.map((stage, index) => (
            <ProjectListGroup
              key={stage}
              index={index}
              title={stage}
              projects={data[stage] || []}
              onProjectClick={onProjectClick}
              onAddProjectClick={onAddProjectClick}
              onDeleteProject={onDeleteProject}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
