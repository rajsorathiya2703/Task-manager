"use client";

import { useState, useMemo } from "react";
import { Task } from "../../lib/data";
import { ListGroup } from "./ListGroup";
import { useCompanyPath } from "../../lib/useCompanyPath";

interface ListViewProps {
  data: Record<string, Task[]>;
  projectId?: string;
  showProjectCapsule?: boolean;
  isFiltered?: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ListView({ data, projectId, showProjectCapsule = false, isFiltered = false }: ListViewProps) {
  const cp = useCompanyPath();
  const addTaskHref = projectId ? cp(`/tasks/new?projectId=${projectId}`) : undefined;
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

  const allTasks = useMemo(() => Object.values(data).flat(), [data]);

  const totalAllocatedHours = useMemo(() => {
    return allTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  }, [allTasks]);

  const totalLoggedSeconds = useMemo(() => {
    return allTasks.reduce((sum, t) => {
      const taskSec = (t.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
      return sum + taskSec;
    }, 0);
  }, [allTasks]);

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

      {/* Allocated & Logged Time Summary Card */}
      <div className="flex items-center justify-between sm:justify-around gap-6 px-6 py-3.5 bg-card border border-dashed border-border rounded-xl shadow-xs shrink-0 min-w-[220px] lg:min-w-[240px]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            ALLOCATED
          </span>
          <span className="text-xl sm:text-2xl font-bold text-foreground">
            {totalAllocatedHours}h
          </span>
        </div>
        <div className="h-8 w-px bg-border my-auto" />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            LOGGED
          </span>
          <span className="text-xl sm:text-2xl font-bold text-foreground">
            {formatDuration(totalLoggedSeconds)}
          </span>
        </div>
      </div>
    </div>
  );

  if (isFiltered) {
    const allFilteredTasks = Object.values(data).flat();
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 h-full w-full custom-scrollbar">
        <div className="max-w-7xl mx-auto pb-16">
          {summaryHeader}
          <ListGroup 
            title="Filtered Results" 
            tasks={allFilteredTasks} 
            showAddTask={false}
            showProjectCapsule={showProjectCapsule}
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
            <ListGroup 
              key={stage} 
              index={index}
              title={stage} 
              tasks={data[stage] || []} 
              addTaskHref={addTaskHref}
              showProjectCapsule={showProjectCapsule}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
