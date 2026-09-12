"use client";

import { useState, useEffect } from "react";
import { GripVertical, Plus, MoreHorizontal } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { Task } from "../../lib/data";
import Link from "next/link";

interface ColumnProps {
  title: string;
  tasks: Task[];
  projectId?: string;
  showProjectCapsule?: boolean;
}

export function Column({ title, tasks: initialTasks, projectId, showProjectCapsule = false }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: title,
  });

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const addTaskHref = `/tasks/new?status=${encodeURIComponent(title)}${projectId ? `&projectId=${projectId}` : ''}`;

  const handleDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => (t.id || (t as any)._id) !== taskId));
  };

  const handleDuplicate = (newTask: any) => {
    const formatted = { ...newTask, id: newTask._id || newTask.id };
    setTasks((prev) => [...prev, formatted]);
  };

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col w-[320px] shrink-0 border border-border rounded-2xl h-full max-h-full transition-colors ${
        isOver ? "bg-muted/50 border-primary/50" : "bg-muted/30 dark:bg-muted/10"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <button className="text-muted-foreground hover:text-foreground cursor-grab">
            <GripVertical className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Link href={addTaskHref} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Plus className="w-4 h-4" />
          </Link>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 custom-scrollbar">
        {tasks.map((task: any, index: number) => (
          <TaskCard 
            key={task.id || task._id || index} 
            task={task} 
            showProjectCapsule={showProjectCapsule}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {/* Column Footer */}
      <div className="p-3 pt-1">
        <Link href={addTaskHref} className="w-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
          <Plus className="w-4 h-4" />
          Add Task
        </Link>
      </div>
    </div>
  );
}
