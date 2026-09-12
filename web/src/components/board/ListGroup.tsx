"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Task } from "../../lib/data";
import { ListRow } from "./ListRow";

import Link from "next/link";

interface ListGroupProps {
  title: string;
  tasks: Task[];
  addTaskHref?: string | null;
  showAddTask?: boolean;
  showProjectCapsule?: boolean;
}

export function ListGroup({ title, tasks: initialTasks, addTaskHref, showAddTask = true, showProjectCapsule = false }: ListGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => (t.id || (t as any)._id) !== taskId));
  };

  const handleDuplicate = (newTask: any) => {
    const formatted = { ...newTask, id: newTask._id || newTask.id };
    setTasks((prev) => [...prev, formatted]);
  };

  return (
    <div className="mb-6">
      {/* Group Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Table Header */}
          <div className="flex items-center px-4 py-3 bg-muted/30 border-b border-border text-xs font-semibold text-foreground gap-2">
            <div className="flex-1 min-w-[180px]">Task</div>
            <div className="w-28">Priority</div>
            <div className="w-28">Assignee</div>
            <div className="w-36">Timer / Logged</div>
            <div className="w-40">Due Time Progress</div>
            <div className="w-32">Due Date</div>
            <div className="w-12 pr-2 text-right">Actions</div>
          </div>


          {/* Table Rows */}
          <div className="flex flex-col">
            {tasks.map((task: any, index: number) => (
              <ListRow 
                key={task.id || task._id || index} 
                task={task} 
                showProjectCapsule={showProjectCapsule}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>

          {/* Footer Add Task Row */}
          {showAddTask && addTaskHref !== null && (
            (() => {
              const baseHref = addTaskHref || "/tasks/new";
              const finalHref = baseHref.includes("?") 
                ? `${baseHref}&status=${encodeURIComponent(title)}` 
                : `${baseHref}?status=${encodeURIComponent(title)}`;

              return (
                <Link href={finalHref} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors bg-card text-left">
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </Link>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
