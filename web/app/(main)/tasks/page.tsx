"use client";

import { useState, useEffect } from "react";
import { PageHeader, SearchContext } from "../../../src/components/layout/PageHeader";
import { Board } from "../../../src/components/board/Board";
import { ListView } from "../../../src/components/board/ListView";
import { fetchTasks } from "../../../src/lib/api";
import { Task } from "../../../src/lib/data";
import { FilterRule } from "../../../src/components/common/FilterDropdown";
import { GroupByOption } from "../../../src/components/common/GroupByDropdown";

const defaultStages = ["To Do", "Doing", "Completed", "On Hold"];
const defaultPriorities = ["High", "Medium", "Low", "No Priority"];

const groupByOptions: GroupByOption[] = [
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
];

export default function TasksPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [data, setData] = useState<Record<string, Task[]>>({
    "To Do": [],
    "Doing": [],
    "Completed": [],
    "On Hold": [],
  });
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<SearchContext>('all');
  const [groupBy, setGroupBy] = useState<string>("stage");
  const [isLoading, setIsLoading] = useState(true);

  const processAndSetData = (
    tasksToProcess: any[], 
    currentFilters: FilterRule[], 
    query: string, 
    context: SearchContext,
    currentGroupBy: string
  ) => {
    if (!tasksToProcess || tasksToProcess.length === 0) {
      if (currentGroupBy === "priority") {
        const emptyPriorities: Record<string, Task[]> = {};
        defaultPriorities.forEach(p => { emptyPriorities[p] = []; });
        setData(emptyPriorities);
      } else {
        const emptyStages: Record<string, Task[]> = {};
        defaultStages.forEach(s => { emptyStages[s] = []; });
        setData(emptyStages);
      }
      return;
    }

    const grouped: Record<string, Task[]> = {};
    if (currentGroupBy === "stage") {
      defaultStages.forEach(s => { grouped[s] = []; });
    } else if (currentGroupBy === "priority") {
      defaultPriorities.forEach(p => { grouped[p] = []; });
    }
    
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

      const formattedTask: Task = {
        ...task,
        id: task._id || task.id,
        project: task.projectId && typeof task.projectId === 'object' && task.projectId.name
          ? { name: task.projectId.name, color: task.projectId.color }
          : undefined,
        projectId: task.projectId && typeof task.projectId === 'object'
          ? task.projectId._id
          : task.projectId,
      };

      let groupKey = task.status || "To Do";
      if (currentGroupBy === "priority") {
        groupKey = task.priority || "Medium";
      } else if (currentGroupBy === "project") {
        groupKey = formattedTask.project?.name || "No Project";
      }
      
      if (grouped[groupKey]) {
        grouped[groupKey].push(formattedTask);
      } else {
        grouped[groupKey] = [formattedTask];
      }
    });
    
    setData(grouped);
  };

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const backendTasks = await fetchTasks();
        setRawTasks(backendTasks || []);
        processAndSetData(backendTasks || [], filters, searchQuery, searchContext, groupBy);
      } catch (error) {
        console.error("Failed to fetch tasks from backend", error);
        const emptyStages: Record<string, Task[]> = {};
        defaultStages.forEach(s => { emptyStages[s] = []; });
        setData(emptyStages);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      processAndSetData(rawTasks, filters, searchQuery, searchContext, groupBy);
    }
  }, [filters, searchQuery, searchContext, groupBy]);

  const handleTaskStatusChange = async (taskId: string, newGroupValue: string) => {
    // Optimistic UI update
    setData((prevData) => {
      const newData = { ...prevData };
      let taskToMove: Task | null = null;
      
      // Find and remove task from old column
      for (const group in newData) {
        const idx = newData[group].findIndex(t => t.id === taskId || (t as any)._id === taskId);
        if (idx !== -1) {
          taskToMove = newData[group][idx];
          newData[group] = [...newData[group]];
          newData[group].splice(idx, 1);
          break;
        }
      }
      
      if (taskToMove) {
        if (groupBy === "priority") {
          taskToMove.priority = newGroupValue as any;
        } else if (groupBy === "stage") {
          taskToMove.status = newGroupValue;
        }
        if (!newData[newGroupValue]) newData[newGroupValue] = [];
        newData[newGroupValue] = [...newData[newGroupValue], taskToMove];
      }
      
      return newData;
    });

    try {
      const { updateTask } = await import("../../../src/lib/api");
      if (groupBy === "priority") {
        await updateTask(taskId, { priority: newGroupValue });
      } else if (groupBy === "stage") {
        await updateTask(taskId, { status: newGroupValue });
      }
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Tasks" 
        activeView={view} 
        onViewChange={setView} 
        showAdd={true}
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
        groupByOptions={groupByOptions}
        selectedGroupBy={groupBy}
        onGroupByChange={setGroupBy}
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
