"use client";

import { useState, useEffect } from "react";
import { PageHeader, SearchContext } from "../../../src/components/layout/PageHeader";
import { Board } from "../../../src/components/board/Board";
import { ListView } from "../../../src/components/board/ListView";
import { fetchTasks } from "../../../src/lib/api";
import { Task } from "../../../src/lib/data";
import { FilterRule } from "../../../src/components/common/FilterDropdown";
import { usePermissions } from "../../../src/contexts/PermissionsContext";

const emptyData: Record<string, Task[]> = {
  "To Do": [],
  "Doing": [],
  "Completed": [],
  "On Hold": [],
};

export default function TasksPage() {
  const { can } = usePermissions();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [data, setData] = useState<Record<string, Task[]>>(emptyData);
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<SearchContext>('all');
  const [isLoading, setIsLoading] = useState(true);

  const processAndSetData = (tasksToProcess: any[], currentFilters: FilterRule[], query: string, context: SearchContext) => {
    if (!tasksToProcess || tasksToProcess.length === 0) {
      setData(emptyData);
      return;
    }

    const grouped: Record<string, Task[]> = {
      "To Do": [],
      "Doing": [],
      "Completed": [],
      "On Hold": [],
    };
    
    tasksToProcess.forEach((task: any) => {
      // Apply filters
      let matchesAllFilters = true;
      for (const filter of currentFilters) {
        let taskValue = '';
        if (filter.field === 'Stage') {
          taskValue = task.status || "To Do";
        } else if (filter.field === 'Priority') {
          taskValue = task.priority || "Medium";
        }
        
        const safeTaskValue = String(taskValue).toLowerCase();
        const safeFilterValue = String(filter.value).toLowerCase();

        if (filter.condition === 'eq' && safeTaskValue !== safeFilterValue) {
          matchesAllFilters = false;
          break;
        } else if (filter.condition === 'neq' && safeTaskValue === safeFilterValue) {
          matchesAllFilters = false;
          break;
        }
      }

      // Apply Search
      if (matchesAllFilters && query) {
        const q = query.toLowerCase();
        const title = (task.title || "").toLowerCase();
        const desc = (task.description || "").toLowerCase();
        const labels = Array.isArray(task.labels) ? task.labels.join(" ").toLowerCase() : "";

        if (context === 'title') {
          if (!title.includes(q)) matchesAllFilters = false;
        } else if (context === 'description') {
          if (!desc.includes(q)) matchesAllFilters = false;
        } else if (context === 'label') {
          if (!labels.includes(q)) matchesAllFilters = false;
        } else {
          // 'all' context
          if (!title.includes(q) && !desc.includes(q) && !labels.includes(q)) {
            matchesAllFilters = false;
          }
        }
      }

      if (!matchesAllFilters) return;

      const formattedTask = {
        ...task,
        id: task._id || task.id,
        project: task.projectId && typeof task.projectId === 'object' && task.projectId.name
          ? { name: task.projectId.name, color: task.projectId.color }
          : undefined,
        projectId: task.projectId && typeof task.projectId === 'object'
          ? task.projectId._id
          : task.projectId,
      };
      const status = task.status || "To Do";
      
      if (grouped[status]) {
        grouped[status].push(formattedTask);
      } else {
        grouped[status] = [formattedTask];
      }
    });
    
    setData(grouped);
  };

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const backendTasks = await fetchTasks();
        setRawTasks(backendTasks || []);
        processAndSetData(backendTasks || [], filters, searchQuery, searchContext);
      } catch (error) {
        console.error("Failed to fetch tasks from backend", error);
        setData(emptyData);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      processAndSetData(rawTasks, filters, searchQuery, searchContext);
    }
  }, [filters, searchQuery, searchContext]);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setData((prevData) => {
      const newData = { ...prevData };
      let taskToMove: Task | null = null;
      
      // Find and remove task from old column
      for (const status in newData) {
        const idx = newData[status].findIndex(t => t.id === taskId || (t as any)._id === taskId);
        if (idx !== -1) {
          taskToMove = newData[status][idx];
          newData[status] = [...newData[status]];
          newData[status].splice(idx, 1);
          break;
        }
      }
      
      if (taskToMove) {
        taskToMove.status = newStatus;
        if (!newData[newStatus]) newData[newStatus] = [];
        newData[newStatus] = [...newData[newStatus], taskToMove];
      }
      
      return newData;
    });

    try {
      const { updateTask } = await import("../../../src/lib/api");
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task status", error);
      // Revert could be implemented here by re-fetching
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Tasks" 
        activeView={view} 
        onViewChange={setView} 
        showAdd={can('tasks', 'create')}
        filters={filters}
        onApplyFilter={(f) => setFilters([...filters, f])}
        onRemoveFilter={(id) => setFilters(filters.filter(f => f.id !== id))}
        onClearFilters={() => setFilters([])}
        availableStages={["To Do", "Doing", "Completed", "On Hold"]}
        availablePriorities={["Low", "Medium", "High"]}
        searchQuery={searchQuery}
        searchContext={searchContext}
        onSearchChange={(q, ctx) => {
          setSearchQuery(q);
          setSearchContext(ctx);
        }}
      />
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        view === 'board' ? (
          <Board data={data} onTaskStatusChange={handleTaskStatusChange} showProjectCapsule={true} />
        ) : (
          <ListView data={data} showProjectCapsule={true} isFiltered={filters.length > 0 || !!searchQuery} />
        )
      )}
    </div>
  );
}
