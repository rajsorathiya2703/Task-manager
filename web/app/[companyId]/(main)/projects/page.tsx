"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, SearchContext } from "@/src/components/layout/PageHeader";
import { ProjectBoard } from "@/src/components/projects/ProjectBoard";
import { ProjectListView } from "@/src/components/projects/ProjectListView";
import { ProjectDialog } from "@/src/components/projects/ProjectDialog";
import { fetchProjects, createProject, updateProject, deleteProject } from "@/src/lib/api";
import { Project } from "@/src/lib/data";
import { FilterRule } from "@/src/components/common/FilterDropdown";
import { GroupByOption } from "@/src/components/common/GroupByDropdown";
import { Loader2 } from "lucide-react";
import { useCompanyPath } from "@/src/lib/useCompanyPath";
import { useCompany } from "@/src/contexts/CompanyContext";
import { useCachedQuery } from "@/src/lib/useCachedQuery";
import { usePersistentState } from "@/src/lib/usePersistentState";
import { useSocket } from "@/src/contexts/SocketContext";

const defaultStages = ["To Do", "Doing", "Completed", "On Hold"];
const defaultPriorities = ["High", "Medium", "Low"];

const groupByOptions: GroupByOption[] = [
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
];

function processProjects(
  projectsToProcess: any[],
  currentFilters: FilterRule[],
  query: string,
  context: SearchContext,
  currentGroupBy: string,
): Record<string, Project[]> {
  if (!projectsToProcess || projectsToProcess.length === 0) {
    if (currentGroupBy === "priority") {
      const emptyPriorities: Record<string, Project[]> = {};
      defaultPriorities.forEach((p) => {
        emptyPriorities[p] = [];
      });
      return emptyPriorities;
    }
    const emptyStages: Record<string, Project[]> = {};
    defaultStages.forEach((s) => {
      emptyStages[s] = [];
    });
    return emptyStages;
  }

  const grouped: Record<string, Project[]> = {};
  if (currentGroupBy === "stage") {
    defaultStages.forEach((s) => {
      grouped[s] = [];
    });
  } else if (currentGroupBy === "priority") {
    defaultPriorities.forEach((p) => {
      grouped[p] = [];
    });
  }

  projectsToProcess.forEach((proj: any) => {
    // Apply filters
    let matchesAllFilters = true;
    for (const filter of currentFilters) {
      let projValue = "";
      if (filter.field === "Stage") {
        projValue = proj.status || "To Do";
      } else if (filter.field === "Priority") {
        projValue = proj.priority || "Medium";
      }

      const safeProjValue = String(projValue).toLowerCase();
      const safeFilterValue = String(filter.value).toLowerCase();

      if (filter.condition === "eq" && safeProjValue !== safeFilterValue) {
        matchesAllFilters = false;
        break;
      } else if (filter.condition === "neq" && safeProjValue === safeFilterValue) {
        matchesAllFilters = false;
        break;
      }
    }

    // Apply Search
    if (matchesAllFilters && query) {
      const q = query.toLowerCase();
      const title = (proj.name || "").toLowerCase();
      const desc = (proj.description || "").toLowerCase();
      const labels = Array.isArray(proj.labels) ? proj.labels.join(" ").toLowerCase() : "";

      if (context === "title") {
        if (!title.includes(q)) matchesAllFilters = false;
      } else if (context === "description") {
        if (!desc.includes(q)) matchesAllFilters = false;
      } else if (context === "label") {
        if (!labels.includes(q)) matchesAllFilters = false;
      } else {
        if (!title.includes(q) && !desc.includes(q) && !labels.includes(q)) {
          matchesAllFilters = false;
        }
      }
    }

    if (!matchesAllFilters) return;

    let groupKey = proj.status || "To Do";
    if (currentGroupBy === "priority") {
      groupKey = proj.priority || "Medium";
    }

    if (grouped[groupKey]) {
      grouped[groupKey].push(proj);
    } else {
      grouped[groupKey] = [proj];
    }
  });

  return grouped;
}

export default function ProjectsPage() {
  const router = useRouter();
  const cp = useCompanyPath();
  const { slug } = useCompany();
  const { socket } = useSocket();
  const companySlug = slug || "";

  // Persistent view preferences across navigation
  const [view, setView] = usePersistentState<"board" | "list">(
    companySlug ? `${companySlug}:projects_view` : "projects_view",
    "board",
  );
  const [filters, setFilters] = usePersistentState<FilterRule[]>(
    companySlug ? `${companySlug}:projects_filters` : "projects_filters",
    [],
  );
  const [searchQuery, setSearchQuery] = usePersistentState(
    companySlug ? `${companySlug}:projects_search` : "projects_search",
    "",
  );
  const [searchContext, setSearchContext] = usePersistentState<SearchContext>(
    companySlug ? `${companySlug}:projects_search_ctx` : "projects_search_ctx",
    "all",
  );
  const [groupBy, setGroupBy] = usePersistentState(
    companySlug ? `${companySlug}:projects_groupby` : "projects_groupby",
    "stage",
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Component-level cached query for projects
  const {
    data: rawProjects,
    isLoading,
    isRefetching,
    refetch,
    setData: setRawProjects,
  } = useCachedQuery<any[]>({
    key: `projects:${companySlug || "_global"}`,
    loader: () => fetchProjects(),
    tags: ["projects"],
    tier: "session",
    ttl: 60 * 1000,
  });

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    let timer: ReturnType<typeof setTimeout>;

    const onRealtimeProject = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refetch(true);
      }, 500);
    };

    const events = ["project:created", "project:updated", "project:deleted"];
    events.forEach((e) => socket.on(e, onRealtimeProject));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => socket.off(e, onRealtimeProject));
    };
  }, [socket, refetch]);

  // Derived processed grouped projects
  const groupedData = useMemo(() => {
    return processProjects(rawProjects || [], filters, searchQuery, searchContext, groupBy);
  }, [rawProjects, filters, searchQuery, searchContext, groupBy]);

  const handleOpenCreate = () => {
    router.push(cp("/projects/new"));
  };

  const handleOpenEdit = (project: Project) => {
    const targetId = project.id || (project as any)._id;
    if (targetId) {
      router.push(cp(`/projects/${targetId}/edit`));
    }
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const targetId = selectedProject?.id || (selectedProject as any)?._id;
      if (targetId) {
        await updateProject(targetId, projectData);
      } else {
        await createProject(projectData);
      }
      await refetch(true);
    } catch (err) {
      console.error("Failed to save project", err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      await refetch(true);
    } catch (err) {
      console.error("Failed to delete project", err);
      throw err;
    }
  };

  const handleProjectStatusChange = async (projectId: string, newGroupValue: string) => {
    // Optimistic local update
    setRawProjects((prev: any[] | null) => {
      if (!prev) return [];
      return prev.map((p) => {
        const id = p.id || p._id;
        if (id === projectId) {
          if (groupBy === "priority") return { ...p, priority: newGroupValue };
          if (groupBy === "stage") return { ...p, status: newGroupValue };
        }
        return p;
      });
    });

    try {
      if (groupBy === "priority") {
        await updateProject(projectId, { priority: newGroupValue });
      } else if (groupBy === "stage") {
        await updateProject(projectId, { status: newGroupValue });
      }
    } catch (error) {
      console.error("Failed to update project", error);
      refetch(true);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <PageHeader
        title="Projects"
        breadcrumbs={[{ label: "Projects", href: cp("/projects") }]}
        activeView={view}
        onViewChange={setView}
        addText="Add Project"
        addHref={cp("/projects/new")}
        onAddClick={handleOpenCreate}
        showAdd={true}
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
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : view === "board" ? (
        <ProjectBoard
          data={groupedData}
          onProjectStatusChange={handleProjectStatusChange}
          onProjectClick={handleOpenEdit}
          onAddProjectClick={handleOpenCreate}
        />
      ) : (
        <ProjectListView
          data={groupedData}
          onProjectClick={handleOpenEdit}
          onAddProjectClick={handleOpenCreate}
          onDeleteProject={handleDeleteProject}
          isFiltered={filters.length > 0 || !!searchQuery}
        />
      )}

      {/* Project Creation/Editing Dialog */}
      <ProjectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        project={selectedProject}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />
    </div>
  );
}
