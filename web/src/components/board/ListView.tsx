"use client";

import { Task } from "../../lib/data";
import { ListGroup } from "./ListGroup";

interface ListViewProps {
  data: Record<string, Task[]>;
  projectId?: string;
  showProjectCapsule?: boolean;
  isFiltered?: boolean;
}

export function ListView({ data, projectId, showProjectCapsule = false, isFiltered = false }: ListViewProps) {
  const stages = Object.keys(data);
  const addTaskHref = projectId ? `/tasks/new?projectId=${projectId}` : undefined;

  if (isFiltered) {
    const allTasks = Object.values(data).flat();
    return (
      <div className="flex-1 overflow-y-auto p-4 pt-4 h-full w-full custom-scrollbar">
        <div className="max-w-6xl mx-auto pb-10">
          <ListGroup 
            title="Filtered Results" 
            tasks={allTasks} 
            showAddTask={false}
            showProjectCapsule={showProjectCapsule}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pt-4 h-full w-full custom-scrollbar">
      <div className="max-w-6xl mx-auto pb-10">
        {stages.map((stage) => (
          <ListGroup 
            key={stage} 
            title={stage} 
            tasks={data[stage] || []} 
            addTaskHref={addTaskHref}
            showProjectCapsule={showProjectCapsule}
          />
        ))}
      </div>
    </div>
  );
}
