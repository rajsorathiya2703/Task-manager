"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Task } from "../../lib/data";
import { ListRow } from "./ListRow";
import { CompanyLink } from "../../lib/useCompanyPath";
import { useAccessControl } from "../../contexts/AccessContext";

interface ListGroupProps {
  index?: number;
  title: string;
  tasks: Task[];
  addTaskHref?: string | null;
  showAddTask?: boolean;
  showProjectCapsule?: boolean;
}

export function ListGroup({ 
  index,
  title, 
  tasks: initialTasks, 
  addTaskHref, 
  showAddTask = true, 
  showProjectCapsule = false 
}: ListGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const { can } = useAccessControl();
  const canCreateTask = can("tasks", "create");

  const handleDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => (t.id || (t as any)._id) !== taskId));
  };

  const handleDuplicate = (newTask: any) => {
    const formatted = { ...newTask, id: newTask._id || newTask.id };
    setTasks((prev) => [...prev, formatted]);
  };

  const baseHref = addTaskHref || "/tasks/new";
  const finalHref = baseHref.includes("?") 
    ? `${baseHref}&status=${encodeURIComponent(title)}` 
    : `${baseHref}?status=${encodeURIComponent(title)}`;

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
            {tasks.length}
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

        {/* Header Add Task Button */}
        {showAddTask && addTaskHref !== null && canCreateTask && (
          <CompanyLink 
            href={finalHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </CompanyLink>
        )}
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="overflow-x-auto custom-scrollbar pb-1">
          {tasks.length > 0 ? (
            <div className="flex flex-col gap-2.5 min-w-full">
              {tasks.map((task: any, idx: number) => (
                <ListRow 
                  key={task.id || task._id || idx} 
                  task={task} 
                  showProjectCapsule={showProjectCapsule}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl px-5 py-4 bg-card/40 dark:bg-card/20 flex items-center justify-between text-xs text-muted-foreground hover:border-slate-grey/40 transition-colors">
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>No tasks yet</span>
              </div>
              {showAddTask && addTaskHref !== null && canCreateTask && (
                <CompanyLink
                  href={finalHref}
                  className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Add task
                </CompanyLink>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
