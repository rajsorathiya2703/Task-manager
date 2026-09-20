"use client";

import { PanelLeft, PanelRight, Save, Check, X, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { useSidebar } from "../../../../src/components/layout/SidebarContext";
import { TaskHeader } from "../../../../src/components/task-detail/TaskHeader";
import { TaskComments } from "../../../../src/components/task-detail/TaskComments";
import { TaskDetailsPanel } from "../../../../src/components/task-detail/TaskDetailsPanel";
import { TaskUpdatesPanel } from "../../../../src/components/task-detail/TaskUpdatesPanel";
import { TaskTimelinePanel } from "../../../../src/components/task-detail/TaskTimelinePanel";
import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTask, fetchTaskById, fetchTasks, updateTask, fetchProjectById, startTaskTimer, stopTaskTimer } from "../../../../src/lib/api";
import { useTimer } from "../../../../src/contexts/TimerContext";
import { getUserDisplayName } from "../../../../src/components/common/Comments";
import { RecordNavigator } from "../../../../src/components/common/RecordNavigator";
import { usePermissions } from "../../../../src/contexts/PermissionsContext";
import Link from "next/link";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const statusParam = searchParams.get('status');
  const { isOpen, toggleSidebar } = useSidebar();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  const { refreshTimer } = useTimer();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [originalData, setOriginalData] = useState<any>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<any>({
    title: '',
    description: '',
    status: statusParam || 'To Do',
    priority: 'No Priority',
    startDate: null,
    dueDate: null,
    estimatedHours: 0,
    isTimerRunning: false,
    timerStartedAt: null,
    timerUser: null,
    assignee: null,
    tags: [],
    resources: [],
    projectId: projectId || undefined,
    updates: [],
    timeEntries: [],
    isOwner: true,
  });

  const { can, status: permStatus } = usePermissions();
  const isOwner = taskData?.isOwner !== false;
  const canUpdateTask = isNew 
    ? (permStatus === 'ready' ? can('tasks', 'create') : true) 
    : (isOwner || (permStatus === 'ready' ? can('tasks', 'update') : true));

  const [allTaskIds, setAllTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchTasks().then((tasks) => {
        if (tasks && Array.isArray(tasks)) {
          setAllTaskIds(tasks.map((t: any) => t._id || t.id));
        }
      }).catch((err) => console.error("Failed to load tasks list", err));
    }
  }, [isNew]);

  useEffect(() => {
    if (!isNew) {
      const loadTask = async () => {
        try {
          setIsLoading(true);
          setAccessDenied(false);
          const data = await fetchTaskById(id);
          if (!data) {
            console.error("Task not found");
            router.push('/tasks');
            return;
          }
          const mappedData = {
            title: data.title || '',
            description: data.description || '',
            status: data.status || 'To Do',
            priority: data.priority || 'No Priority',
            startDate: data.startDate || null,
            dueDate: data.dueDate || null,
            estimatedHours: data.estimatedHours || 0,
            isTimerRunning: !!data.isTimerRunning,
            timerStartedAt: data.timerStartedAt || null,
            timerUser: data.timerUser || null,
            assignee: data.assignee || null,
            assignedBy: data.assignedBy || null,
            tags: data.tags || [],
            resources: data.resources || [],
            projectId: data.projectId || undefined,
            comments: data.comments || [],
            updates: data.updates || [],
            members: data.members || [],
            timeEntries: data.timeEntries || [],
            isOwner: data.isOwner !== false,
          };
          setOriginalData(mappedData);
          setTaskData(mappedData);

          if (data.projectId) {
            try {
              const projData = await fetchProjectById(data.projectId);
              setProjectTitle(projData?.name || null);
            } catch {
              setProjectTitle(null);
            }
          }
        } catch (error: any) {
          if (error?.response?.status === 403) {
            setAccessDenied(true);
          } else {
            console.error("Failed to load task", error);
            router.push('/tasks');
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadTask();
    } else if (projectId) {
      const loadProject = async () => {
        try {
          const projData = await fetchProjectById(projectId);
          if (projData) {
            setProjectTitle(projData.name);
          }
        } catch (error) {
          console.error("Failed to load project title", error);
        }
      };
      loadProject();
    }
  }, [id, isNew, projectId, router]);

  useEffect(() => {
    if (isNew) return;
    const interval = setInterval(async () => {
      try {
        const latestData = await fetchTaskById(id);
        if (latestData) {
          setTaskData((prev: any) => ({
            ...prev,
            comments: latestData.comments || prev.comments,
            updates: latestData.updates || prev.updates,
            members: latestData.members || prev.members,
            isTimerRunning: !!latestData.isTimerRunning,
            timerStartedAt: latestData.timerStartedAt || null,
            timerUser: latestData.timerUser || null,
            timeEntries: latestData.timeEntries || prev.timeEntries,
          }));
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          clearInterval(interval);
          router.push('/login');
          return;
        }
        console.error("Failed to poll updates", error);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [id, isNew]);

  const handleStartTimer = async () => {
    if (isNew || isTimerLoading) return;
    try {
      setIsTimerLoading(true);
      const updated = await startTaskTimer(id);
      if (updated) {
        if (updated.previousTimerStopped) {
          setToastMessage("Previous active task timer was stopped automatically.");
          setTimeout(() => setToastMessage(null), 5000);
        }
        setTaskData((prev: any) => ({
          ...prev,
          isTimerRunning: !!updated.isTimerRunning,
          timerStartedAt: updated.timerStartedAt,
          timerUser: updated.timerUser,
          status: updated.status || 'Doing',
          updates: updated.updates || prev.updates,
        }));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to start timer");
    } finally {
      setIsTimerLoading(false);
      refreshTimer();
    }
  };

  const handleStopTimer = async () => {
    if (isNew || isTimerLoading) return;
    try {
      setIsTimerLoading(true);
      const updated = await stopTaskTimer(id);
      if (updated) {
        setTaskData((prev: any) => ({
          ...prev,
          isTimerRunning: false,
          timerStartedAt: null,
          timerUser: null,
          timeEntries: updated.timeEntries || prev.timeEntries,
          updates: updated.updates || prev.updates,
        }));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to stop timer");
    } finally {
      setIsTimerLoading(false);
      refreshTimer();
    }
  };

  const hasChanges = !isNew && originalData && (() => {
    const { comments: c1, updates: u1, timeEntries: te1, ...t1 } = taskData;
    const { comments: c2, updates: u2, timeEntries: te2, ...t2 } = originalData;
    return JSON.stringify(t1) !== JSON.stringify(t2);
  })();

  const taskIndex = allTaskIds.indexOf(id);
  const totalTasks = allTaskIds.length;
  const currentTaskNum = taskIndex >= 0 ? taskIndex + 1 : 1;

  const navigateToTask = (targetId: string) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard and navigate to the other task?")) {
        return;
      }
    }
    router.push(`/tasks/${targetId}`);
  };

  const handlePrevTask = () => {
    if (taskIndex > 0) {
      navigateToTask(allTaskIds[taskIndex - 1]);
    }
  };

  const handleNextTask = () => {
    if (taskIndex >= 0 && taskIndex < totalTasks - 1) {
      navigateToTask(allTaskIds[taskIndex + 1]);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (isNew) {
        const createPayload: any = {
          title: taskData.title,
          ...(taskData.description && { description: taskData.description }),
          ...(taskData.status && { status: taskData.status }),
          ...(taskData.priority && { priority: taskData.priority }),
          ...(taskData.startDate ? { startDate: taskData.startDate } : {}),
          ...(taskData.dueDate ? { dueDate: taskData.dueDate } : {}),
          ...(taskData.estimatedHours !== undefined ? { estimatedHours: taskData.estimatedHours } : {}),
          ...(taskData.assignee ? { assignee: taskData.assignee._id || taskData.assignee } : {}),
          ...(taskData.tags && taskData.tags.length > 0 ? { tags: taskData.tags } : {}),
          ...(taskData.resources && taskData.resources.length > 0 ? { resources: taskData.resources } : {}),
          ...(taskData.projectId ? { projectId: taskData.projectId } : {}),
        };
        await createTask(createPayload);
        if (taskData.projectId) {
          router.push(`/projects/${taskData.projectId}`);
        } else {
          router.push('/tasks');
        }
      }
    } catch (error) {
      console.error("Failed to create task", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!canUpdateTask) return;
    try {
      setIsSaving(true);
      const updatePayload: any = {};
      if (taskData.title !== originalData?.title) updatePayload.title = taskData.title;
      if (taskData.description !== originalData?.description) updatePayload.description = taskData.description;
      if (taskData.status !== originalData?.status) updatePayload.status = taskData.status;
      if (taskData.priority !== originalData?.priority) updatePayload.priority = taskData.priority;
      if (taskData.startDate !== originalData?.startDate) updatePayload.startDate = taskData.startDate;
      if (taskData.dueDate !== originalData?.dueDate) updatePayload.dueDate = taskData.dueDate;
      if (taskData.estimatedHours !== originalData?.estimatedHours) updatePayload.estimatedHours = taskData.estimatedHours;
      if (taskData.assignee !== originalData?.assignee) {
        updatePayload.assignee = taskData.assignee ? (taskData.assignee._id || taskData.assignee) : null;
      }
      if (JSON.stringify(taskData.tags) !== JSON.stringify(originalData?.tags)) updatePayload.tags = taskData.tags;
      if (JSON.stringify(taskData.resources) !== JSON.stringify(originalData?.resources)) updatePayload.resources = taskData.resources;

      if (Object.keys(updatePayload).length === 0) {
        return;
      }
      const updated = await updateTask(id, updatePayload);
      if (updated) {
        const mappedData = {
          title: updated.title || '',
          description: updated.description || '',
          status: updated.status || 'To Do',
          priority: updated.priority || 'No Priority',
          startDate: updated.startDate || null,
          dueDate: updated.dueDate || null,
          estimatedHours: updated.estimatedHours || 0,
          isTimerRunning: !!updated.isTimerRunning,
          timerStartedAt: updated.timerStartedAt || null,
          timerUser: updated.timerUser || null,
          assignee: updated.assignee || null,
          assignedBy: updated.assignedBy || null,
          tags: updated.tags || [],
          resources: updated.resources || [],
          comments: updated.comments || [],
          updates: updated.updates || [],
          members: updated.members || [],
          timeEntries: updated.timeEntries || [],
          isOwner: updated.isOwner !== false,
        };
        setTaskData(mappedData);
        setOriginalData(mappedData);
      }
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setIsSaving(false);
    }
  };


  const handleDiscard = () => {
    if (originalData) {
      setTaskData(originalData); // Reset to last saved state
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
          You do not have permission to view or edit this task. Please contact the task owner to request an invite.
        </p>
        <Link 
          href="/tasks"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background shrink-0 min-h-[60px]">
        <div className="flex items-center gap-2">
          {!isOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm mr-2 cursor-pointer"
            >
              <PanelLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground ml-1">
            {projectTitle && (taskData.projectId || projectId) ? (
              <>
                <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
                <span>/</span>
                <Link href={`/projects/${taskData.projectId || projectId}`} className="hover:text-foreground transition-colors max-w-[150px] truncate">
                  {projectTitle}
                </Link>
                <span>/</span>
              </>
            ) : (
              <>
                <Link href="/tasks" className="hover:text-foreground transition-colors">Tasks</Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground max-w-[200px] truncate">{taskData.title || (isNew ? 'New Task' : 'Loading...')}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isNew && totalTasks > 0 && (
            <RecordNavigator
              current={currentTaskNum}
              total={totalTasks}
              onPrev={handlePrevTask}
              onNext={handleNextTask}
              hasPrev={taskIndex > 0}
              hasNext={taskIndex >= 0 && taskIndex < totalTasks - 1}
            />
          )}
          {isNew ? (
            <button 
              onClick={handleSave}
              disabled={isSaving || !taskData.title?.trim()}
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          ) : hasChanges ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSaving || !taskData.title?.trim() || !canUpdateTask}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isSaving ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          ) : null}
          
          <button 
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 border border-border rounded-md transition-colors bg-card shadow-sm ml-1 cursor-pointer ${isRightPanelOpen ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <TaskHeader 
              taskId={id}
              taskData={taskData} 
              setTaskData={setTaskData} 
              isEditable={canUpdateTask} 
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              isTimerLoading={isTimerLoading}
            />
            <TaskComments 
              taskId={id} 
              comments={taskData.comments || []} 
              setTaskData={setTaskData} 
              mentionMembers={
                (taskData.members || []).map((m: any) => ({
                  name: getUserDisplayName(m),
                  avatarUrl: m.avatarUrl || m.avatar,
                  email: m.email,
                }))
              }
            />
          </div>
        </div>

        {/* Right Column (Sidebar panels) */}
        {isRightPanelOpen && (
          <div className="w-80 shrink-0 border-l border-border/50 bg-muted/10 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <TaskDetailsPanel 
              taskId={id}
              taskData={taskData} 
              setTaskData={setTaskData} 
            />
            <TaskTimelinePanel 
              timeEntries={taskData.timeEntries || []} 
              isTimerRunning={taskData.isTimerRunning}
              timerStartedAt={taskData.timerStartedAt}
              timerUser={taskData.timerUser}
              estimatedHours={taskData.estimatedHours}
            />

            <TaskUpdatesPanel updates={taskData.updates || []} />
          </div>
        )}
      </div>
      
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

