"use client";

import { useMemo, useEffect, useState } from "react";
import { PageHeader, SearchContext } from "@/src/components/layout/PageHeader";
import { Board } from "@/src/components/board/Board";
import { ListView } from "@/src/components/board/ListView";
import { fetchTasks } from "@/src/lib/api";
import { Task } from "@/src/lib/data";
import { FilterRule } from "@/src/components/common/FilterDropdown";
import { GroupByOption } from "@/src/components/common/GroupByDropdown";
import { ModuleGate, AccessDenied } from "@/src/components/access";
import { useAccessControl } from "@/src/contexts/AccessContext";
import { useCompany } from "@/src/contexts/CompanyContext";
import { useCompanyPath } from "@/src/lib/useCompanyPath";
import { useSocket } from "@/src/contexts/SocketContext";
import { useCachedQuery } from "@/src/lib/useCachedQuery";
import { usePersistentState } from "@/src/lib/usePersistentState";

const defaultStages = ["To Do", "Doing", "Completed", "On Hold"];
const defaultPriorities = ["High", "Medium", "Low", "No Priority"];

const groupByOptions: GroupByOption[] = [
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
];

function processTasks(
  tasksToProcess: any[],
  currentFilters: FilterRule[],
  query: string,
  context: SearchContext,
  currentGroupBy: string,
): Record<string, Task[]> {
  if (!tasksToProcess || tasksToProcess.length === 0) {
    if (currentGroupBy === "priority") {
      const emptyPriorities: Record<string, Task[]> = {};
      defaultPriorities.forEach((p) => {
        emptyPriorities[p] = [];
      });
      return emptyPriorities;
    }
    const emptyStages: Record<string, Task[]> = {};
    defaultStages.forEach((s) => {
      emptyStages[s] = [];
    });
    return emptyStages;
  }

  const grouped: Record<string, Task[]> = {};
  if (currentGroupBy === "stage") {
    defaultStages.forEach((s) => {
      grouped[s] = [];
    });
  } else if (currentGroupBy === "priority") {
    defaultPriorities.forEach((p) => {
      grouped[p] = [];
    });
  }

  tasksToProcess.forEach((task: any) => {
    // Apply filters
    let matchesAllFilters = true;
    for (const filter of currentFilters) {
      let taskValue = "";
      if (filter.field === "Stage") {
        taskValue = task.status || "To Do";
      } else if (filter.field === "Priority") {
        taskValue = task.priority || "Medium";
      }

      const safeTaskValue = String(taskValue).toLowerCase();
      const safeFilterValue = String(filter.value).toLowerCase();

      if (filter.condition === "eq" && safeTaskValue !== safeFilterValue) {
        matchesAllFilters = false;
        break;
      } else if (filter.condition === "neq" && safeTaskValue === safeFilterValue) {
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

      if (context === "title") {
        if (!title.includes(q)) matchesAllFilters = false;
      } else if (context === "description") {
        if (!desc.includes(q)) matchesAllFilters = false;
      } else if (context === "label") {
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
      project:
        task.projectId && typeof task.projectId === "object" && task.projectId.name
          ? { name: task.projectId.name, color: task.projectId.color }
          : undefined,
      projectId:
        task.projectId && typeof task.projectId === "object"
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

  return grouped;
}

export default function TasksPage() {
  const cp = useCompanyPath();
  const { slug } = useCompany();
  const { can } = useAccessControl();
  const { socket } = useSocket();
  const canCreateTask = can("tasks", "create");

  const companySlug = slug || "";
  const [accessDenied, setAccessDenied] = useState(false);

  // Persistent UI state across route navigation (survives page switches)
  const [view, setView] = usePersistentState<"board" | "list">(
    companySlug ? `${companySlug}:tasks_view` : "tasks_view",
    "board",
  );
  const [filters, setFilters] = usePersistentState<FilterRule[]>(
    companySlug ? `${companySlug}:tasks_filters` : "tasks_filters",
    [],
  );
  const [searchQuery, setSearchQuery] = usePersistentState(
    companySlug ? `${companySlug}:tasks_search` : "tasks_search",
    "",
  );
  const [searchContext, setSearchContext] = usePersistentState<SearchContext>(
    companySlug ? `${companySlug}:tasks_search_ctx` : "tasks_search_ctx",
    "all",
  );
  const [groupBy, setGroupBy] = usePersistentState(
    companySlug ? `${companySlug}:tasks_groupby` : "tasks_groupby",
    "stage",
  );

  // Component-level cached query (0ms initial render if cached in session or memory)
  const {
    data: rawTasks,
    isLoading,
    isRefetching,
    refetch,
    setData: setRawTasks,
  } = useCachedQuery<any[]>({
    key: `tasks:${companySlug || "_global"}:_all`,
    loader: () => fetchTasks(),
    tags: ["tasks"],
    tier: "session",
    ttl: 30 * 1000,
    onError: (error: any) => {
      console.error("Failed to fetch tasks from backend", error);
      if (error?.response?.status === 403) {
        setAccessDenied(true);
      }
    },
  });

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    let timer: ReturnType<typeof setTimeout>;

    const onRealtimeTask = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refetch(true);
      }, 300);
    };

    const events = ["task:created", "task:updated", "task:deleted"];
    events.forEach((e) => socket.on(e, onRealtimeTask));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => socket.off(e, onRealtimeTask));
    };
  }, [socket, refetch]);

  // Derived processed grouped tasks
  const groupedData = useMemo(() => {
    return processTasks(rawTasks || [], filters, searchQuery, searchContext, groupBy);
  }, [rawTasks, filters, searchQuery, searchContext, groupBy]);

  const handleTaskStatusChange = async (taskId: string, newGroupValue: string) => {
    // Optimistic local update
    setRawTasks((prevTasks: any[] | null) => {
      if (!prevTasks) return [];
      return prevTasks.map((t) => {
        const id = t._id || t.id;
        if (id === taskId) {
          if (groupBy === "priority") return { ...t, priority: newGroupValue };
          if (groupBy === "stage") return { ...t, status: newGroupValue };
        }
        return t;
      });
    });

    try {
      const { updateTask } = await import("@/src/lib/api");
      if (groupBy === "priority") {
        await updateTask(taskId, { priority: newGroupValue });
      } else if (groupBy === "stage") {
        await updateTask(taskId, { status: newGroupValue });
      }
    } catch (error) {
      console.error("Failed to update task", error);
      // Revert from server on failure
      refetch(true);
    }
  };

  return (
    <ModuleGate module="tasks">
      {accessDenied ? (
        <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
          <AccessDenied
            module="tasks"
            action="read"
            message="You do not have permission to view tasks."
          />
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <PageHeader
            title="Tasks"
            activeView={view}
            onViewChange={setView}
            addHref={cp("/tasks/new")}
            showAdd={canCreateTask}
            filters={filters}
            onApplyFilter={(f) => setFilters([...filters, f])}
            onRemoveFilter={(id) => setFilters(filters.filter((f) => f.id !== id))}
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
          ) : view === "board" ? (
            <Board
              data={groupedData}
              onTaskStatusChange={handleTaskStatusChange}
              showProjectCapsule={true}
            />
          ) : (
            <ListView
              data={groupedData}
              showProjectCapsule={true}
              isFiltered={filters.length > 0 || !!searchQuery}
            />
          )}
        </div>
      )}
    </ModuleGate>
  );
}
