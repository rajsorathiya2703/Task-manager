"use client";

import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { Column } from "./Column";
import { Task } from "../../lib/data";

interface BoardProps {
  data: Record<string, Task[]>;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  projectId?: string;
  showProjectCapsule?: boolean;
}

export function Board({ data, onTaskStatusChange, projectId, showProjectCapsule = false }: BoardProps) {
  const stages = Object.keys(data);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Find current status
    let currentStatus = null;
    for (const status of stages) {
      if (data[status]?.find((t: any) => t.id === taskId || t._id === taskId)) {
        currentStatus = status;
        break;
      }
    }

    if (currentStatus && currentStatus !== newStatus && onTaskStatusChange) {
      onTaskStatusChange(taskId, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-4 pt-4 h-full w-full">
        <div className="flex gap-4 h-full items-start">
          {stages.map((stage) => (
            <Column 
              key={stage} 
              title={stage} 
              tasks={data[stage] || []} 
              projectId={projectId} 
              showProjectCapsule={showProjectCapsule}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

