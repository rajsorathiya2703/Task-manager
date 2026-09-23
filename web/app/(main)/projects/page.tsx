"use client";

import { useState, useEffect } from "react";
import { PageHeader, SearchContext } from "../../../src/components/layout/PageHeader";
import { ProjectBoard } from "../../../src/components/projects/ProjectBoard";
import { ProjectListView } from "../../../src/components/projects/ProjectListView";
import { ProjectDialog } from "../../../src/components/projects/ProjectDialog";
import { fetchProjects, createProject, updateProject, deleteProject } from "../../../src/lib/api";
import { Project } from "../../../src/lib/data";
import { FilterRule } from "../../../src/components/common/FilterDropdown";
import { GroupByOption } from "../../../src/components/common/GroupByDropdown";
import { Loader2 } from "lucide-react";

const defaultStages = ["To Do", "Doing", "Completed", "On Hold"];
const defaultPriorities = ["High", "Medium", "Low"];

const groupByOptions: GroupByOption[] = [
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
];

export default function ProjectsPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [data, setData] = useState<Record<string, Project[]>>({
    "To Do": [],
    "Doing": [],
    "Completed": [],
    "On Hold": [],
  });
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchContext, setSearchContext] = useState<SearchContext>('all');
  const [groupBy, setGroupBy] = useState<string>("stage");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const processAndSetData = (
    projectsToProcess: any[], 
    currentFilters: FilterRule[], 
    query: string, 
    context: SearchContext,
    currentGroupBy: string
  ) => {
    if (!projectsToProcess || projectsToProcess.length === 0) {
      if (currentGroupBy === "priority") {
        const emptyPriorities: Record<string, Project[]> = {};
        defaultPriorities.forEach(p => { emptyPriorities[p] = []; });
        setData(emptyPriorities);
      } else {
        const emptyStages: Record<string, Project[]> = {};
        defaultStages.forEach(s => { emptyStages[s] = []; });
        setData(emptyStages);
      }
      return;
    }

    const grouped: Record<string, Project[]> = {};
    if (currentGroupBy === "stage") {
      defaultStages.forEach(s => { grouped[s] = []; });
    } else if (currentGroupBy === "priority") {
      defaultPriorities.forEach(p => { grouped[p] = []; });
    }

    projectsToProcess.forEach((proj: any) => {
      // Apply filters
      let matchesAllFilters = true;
      for (const filter of currentFilters) {
        let projValue = '';
        if (filter.field === 'Stage') {
          projValue = proj.status || "To Do";
        } else if (filter.field === 'Priority') {
          projValue = proj.priority || "Medium";
        }
        
        const safeProjValue = String(projValue).toLowerCase();
        const safeFilterValue = String(filter.value).toLowerCase();

        if (filter.condition === 'eq' && safeProjValue !== safeFilterValue) {
          matchesAllFilters = false;
          break;
        } else if (filter.condition === 'neq' && safeProjValue === safeFilterValue) {
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

      const formattedProj = { ...proj, id: proj._id || proj.id };
      let groupKey = proj.status || "To Do";
      if (currentGroupBy === "priority") {
        groupKey = proj.priority || "Medium";
      }

      if (grouped[groupKey]) {
        grouped[groupKey].push(formattedProj);
      } else {
        grouped[groupKey] = [formattedProj];
      }
    });

    setData(grouped);
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const backendProjects = await fetchProjects();
      setRawProjects(backendProjects || []);
      processAndSetData(backendProjects || [], filters, searchQuery, searchContext, groupBy);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      const emptyStages: Record<string, Project[]> = {};
      defaultStages.forEach(s => { emptyStages[s] = []; });
      setData(emptyStages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      processAndSetData(rawProjects, filters, searchQuery, searchContext, groupBy);
    }
  }, [filters, searchQuery, searchContext, groupBy]);

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    try {
      const targetId = selectedProject?.id || (selectedProject as any)?._id;
      if (targetId) {
        // Update
        await updateProject(targetId, projectData);
        await loadProjects();
      } else {
        // Create
        await createProject(projectData);
        await loadProjects();
      }
    } catch (err) {
      console.error("Failed to save project", err);
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      throw err;
    }
  };

  const handleProjectStatusChange = async (projectId: string, newGroupValue: string) => {
    // Optimistic UI update
    setData((prevData) => {
      const newData = { ...prevData };
      let projectToMove: Project | null = null;

      for (const group in newData) {
        const idx = newData[group].findIndex(p => p.id === projectId || (p as any)._id === projectId);
        if (idx !== -1) {
          projectToMove = newData[group][idx];
          newData[group] = [...newData[group]];
          newData[group].splice(idx, 1);
          break;
        }
      }

      if (projectToMove) {
        if (groupBy === "priority") {
          projectToMove.priority = newGroupValue;
        } else if (groupBy === "stage") {
          projectToMove.status = newGroupValue;
        }
        if (!newData[newGroupValue]) newData[newGroupValue] = [];
        newData[newGroupValue] = [...newData[newGroupValue], projectToMove];
      }

      return newData;
    });

    try {
      if (groupBy === "priority") {
        await updateProject(projectId, { priority: newGroupValue });
      } else if (groupBy === "stage") {
        await updateProject(projectId, { status: newGroupValue });
      }
    } catch (error) {
      console.error("Failed to update project", error);
      loadProjects();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <PageHeader 
        title="Projects" 
        activeView={view} 
        onViewChange={setView}
        addText="Add Project"
        onAddClick={handleOpenCreate}
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
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        view === 'board' ? (
          <ProjectBoard 
            data={data} 
            onProjectStatusChange={handleProjectStatusChange} 
            onProjectClick={handleOpenEdit}
            onAddProjectClick={handleOpenCreate}
          />
        ) : (
          <ProjectListView 
            data={data} 
            onProjectClick={handleOpenEdit}
            onAddProjectClick={handleOpenCreate}
            isFiltered={filters.length > 0 || !!searchQuery}
          />
        )
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
