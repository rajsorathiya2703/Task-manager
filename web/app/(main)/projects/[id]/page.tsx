"use client";

import { use, useState, useEffect } from "react";
import { PageHeader } from "../../../../src/components/layout/PageHeader";
import { Board } from "../../../../src/components/board/Board";
import { ListView } from "../../../../src/components/board/ListView";
import { fetchTasks, fetchProjectById, updateTask } from "../../../../src/lib/api";
import { Task, Project } from "../../../../src/lib/data";
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import Link from "next/link";

const emptyData: Record<string, Task[]> = {
  "To Do": [],
  "Doing": [],
  "Completed": [],
  "On Hold": [],
};

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isFieldEditable, showAccessDenied } = usePermissions();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [project, setProject] = useState<Project | null>(null);
  const [data, setData] = useState<Record<string, Task[]>>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadProjectAndTasks = async () => {
    try {
      setIsLoading(true);
      setAccessDenied(false);

      // Fetch project details and project tasks in parallel
      const [projData, backendTasks] = await Promise.all([
        fetchProjectById(id),
        fetchTasks(id),
      ]);

      if (!projData) {
        setProject(null);
        return;
      }

      setProject(projData);

      if (backendTasks && backendTasks.length > 0) {
        const grouped: Record<string, Task[]> = {
          "To Do": [],
          "Doing": [],
          "Completed": [],
          "On Hold": [],
        };

        backendTasks.forEach((task: any) => {
          const formattedTask = { ...task, id: task._id || task.id };
          const status = task.status || "To Do";
          if (grouped[status]) {
            grouped[status].push(formattedTask);
          } else {
            grouped[status] = [formattedTask];
          }
        });

        setData(grouped);
      } else {
        setData(emptyData);
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setAccessDenied(true);
      } else {
        console.error("Failed to load project or tasks", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadProjectAndTasks();
    }
  }, [id]);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!isFieldEditable("tasks", "status")) {
      showAccessDenied("You do not have permission to edit task status.", "Access Denied");
      return;
    }

    // Optimistic UI update
    setData((prevData) => {
      const newData = { ...prevData };
      let taskToMove: Task | null = null;

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
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task status", error);
      loadProjectAndTasks();
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          You do not have permission to view this project or its tasks dashboard.
        </p>
        <Link 
          href="/projects"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const projectColor = project?.color || "#3b82f6";
  const initialLetter = (project?.name ? project.name.charAt(0) : "P").toUpperCase();

  const titleNode = (
    <div className="flex items-center gap-2">
      <div 
        className="w-5 h-5 rounded-md flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-xs"
        style={{ backgroundColor: projectColor }}
      >
        {initialLetter}
      </div>
      <span className="truncate">{project?.name || "Project"}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <PageHeader 
        title={titleNode}
        breadcrumbs={[
          { label: "Projects", href: "/projects" }
        ]}
        activeView={view} 
        onViewChange={setView} 
        addText="Add Task"
        addHref={`/tasks/new?projectId=${id}`}
      />

      {view === 'board' ? (
        <Board data={data} onTaskStatusChange={handleTaskStatusChange} projectId={id} showProjectCapsule={false} />
      ) : (
        <ListView data={data} projectId={id} showProjectCapsule={false} />
      )}

    </div>
  );
}
