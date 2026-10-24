"use client";

import { PanelLeft, PanelRight, Save, Check, X, Loader2, ShieldAlert, ArrowLeft, Bot } from "lucide-react";
import { useSidebar } from "@/src/components/layout/SidebarContext";
import { useChatbot } from "@/src/components/chatbot/ChatbotContext";
import { TaskMainContent } from "@/src/components/task-detail/TaskMainContent";
import { TaskActivityPanel } from "@/src/components/task-detail/TaskActivityPanel";
import { TaskHeader } from "@/src/components/task-detail/TaskHeader";
import { TaskComments } from "@/src/components/task-detail/TaskComments";
import { TaskDetailsPanel } from "@/src/components/task-detail/TaskDetailsPanel";
import { TaskUpdatesPanel } from "@/src/components/task-detail/TaskUpdatesPanel";
import { TaskTimelinePanel } from "@/src/components/task-detail/TaskTimelinePanel";
import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTask, fetchTaskById, fetchTasks, updateTask, fetchProjectById, startTaskTimer, stopTaskTimer } from "@/src/lib/api";
import { useTimer } from "@/src/contexts/TimerContext";
import { useSocket } from "@/src/contexts/SocketContext";
import { getUserDisplayName } from "@/src/components/common/Comments";
import { RecordNavigator } from "@/src/components/common/RecordNavigator";
import { useAccessControl } from "@/src/contexts/AccessContext";
import { AccessDenied } from "@/src/components/access/AccessDenied";
import { CompanyLink, useCompanyPath } from "@/src/lib/useCompanyPath";
import { getSessionProjects, getCachedProjectsSync } from "@/src/lib/project-cache";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cp = useCompanyPath();
  const isNew = id === 'new';
  const router = useRouter();
  const { socket, joinTask, leaveTask } = useSocket();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const statusParam = searchParams.get('status');
  const { isOpen, toggleSidebar } = useSidebar();
  const { isOpen: isChatbotOpen, toggleChatbot } = useChatbot();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  const { refreshTimer } = useTimer();
  const { can, loading: accessLoading } = useAccessControl();
  const canCreateTask = can("tasks", "create");
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

  const canUpdateTask = can("tasks", "update");

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
    if (!accessLoading && isNew && !canCreateTask) {
      router.replace(cp('/tasks'));
    }
  }, [accessLoading, isNew, canCreateTask, router, cp]);

  useEffect(() => {
    if (!isNew) {
      const loadTask = async () => {
        try {
          setIsLoading(true);
          setAccessDenied(false);
          const data = await fetchTaskById(id);
          if (!data) {
            console.error("Task not found");
            router.push(cp('/tasks'));
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
          console.error("Failed to load task", error);
          if (error?.response?.status === 403) {
            setAccessDenied(true);
            return;
          }
          router.push(cp('/tasks'));
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

  // Synchronize projectTitle whenever taskData.projectId is selected or changed
  useEffect(() => {
    const currentPid = typeof taskData.projectId === 'object'
      ? (taskData.projectId?._id || taskData.projectId?.id)
      : taskData.projectId;
    if (currentPid) {
      const cachedList = getCachedProjectsSync();
      const found = cachedList?.find((p: any) => (p._id || p.id) === currentPid);
      if (found?.name) {
        setProjectTitle(found.name);
      } else {
        getSessionProjects().then((list) => {
          const match = list?.find((p: any) => (p._id || p.id) === currentPid);
          if (match?.name) {
            setProjectTitle(match.name);
          }
        });
      }
    } else {
      setProjectTitle(null);
    }
  }, [taskData.projectId]);

  useEffect(() => {
    if (isNew || !id) return;
    joinTask(id);

    if (!socket) return;

    const matchesTask = (payload: any) => {
      const pid = payload?.taskId || payload?.task?._id || payload?.task?.id || payload?._id || payload?.id;
      return String(pid) === String(id);
    };

    const handleCommentCreated = (payload: any) => {
      if (matchesTask(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTaskData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.comment) {
          setTaskData((prev: any) => {
            const currentComments = prev?.comments || [];
            const commentId = payload.comment._id || payload.comment.id;
            if (currentComments.some((c: any) => (c._id || c.id) === commentId)) {
              return prev;
            }
            return {
              ...prev,
              comments: [...currentComments, payload.comment],
            };
          });
        }
      }
    };

    const handleCommentUpdated = (payload: any) => {
      if (matchesTask(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTaskData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.comment) {
          const targetCommentId = payload?.commentId || payload.comment._id || payload.comment.id;
          setTaskData((prev: any) => ({
            ...prev,
            comments: (prev?.comments || []).map((c: any) =>
              (c._id || c.id) === targetCommentId ? payload.comment : c
            ),
          }));
        }
      }
    };

    const handleCommentDeleted = (payload: any) => {
      if (matchesTask(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTaskData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.commentId) {
          setTaskData((prev: any) => ({
            ...prev,
            comments: (prev?.comments || []).filter(
              (c: any) => (c._id || c.id) !== payload.commentId
            ),
          }));
        }
      }
    };

    const handleTaskUpdated = (payload: any) => {
      if (matchesTask(payload)) {
        const updated = payload?.task || payload;
        setTaskData((prev: any) => ({
          ...prev,
          ...updated,
          comments: updated.comments || prev.comments,
          timeEntries: updated.timeEntries || prev.timeEntries,
          updates: updated.updates || prev.updates,
        }));
        setOriginalData((prevOrig: any) => {
          if (!prevOrig) return prevOrig;
          return {
            ...prevOrig,
            ...updated,
            comments: updated.comments || prevOrig.comments,
            timeEntries: updated.timeEntries || prevOrig.timeEntries,
            updates: updated.updates || prevOrig.updates,
          };
        });
      }
    };

    socket.on("task:comment:created", handleCommentCreated);
    socket.on("task:comment:updated", handleCommentUpdated);
    socket.on("task:comment:deleted", handleCommentDeleted);
    socket.on("task:updated", handleTaskUpdated);

    return () => {
      leaveTask(id);
      socket.off("task:comment:created", handleCommentCreated);
      socket.off("task:comment:updated", handleCommentUpdated);
      socket.off("task:comment:deleted", handleCommentDeleted);
      socket.off("task:updated", handleTaskUpdated);
    };
  }, [id, isNew, socket, joinTask, leaveTask]);

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
        const timerFields = {
          isTimerRunning: !!updated.isTimerRunning,
          timerStartedAt: updated.timerStartedAt,
          timerUser: updated.timerUser,
          status: updated.status || 'Doing',
          updates: updated.updates,
        };
        setTaskData((prev: any) => ({
          ...prev,
          ...timerFields,
          updates: timerFields.updates || prev.updates,
        }));
        // Sync originalData so timer state and status change do not trigger unsaved changes buttons
        setOriginalData((prev: any) => prev ? ({
          ...prev,
          ...timerFields,
          updates: timerFields.updates || prev.updates,
        }) : prev);
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
        const timerFields = {
          isTimerRunning: false,
          timerStartedAt: null,
          timerUser: null,
          timeEntries: updated.timeEntries,
          updates: updated.updates,
        };
        setTaskData((prev: any) => ({
          ...prev,
          ...timerFields,
          timeEntries: timerFields.timeEntries || prev.timeEntries,
          updates: timerFields.updates || prev.updates,
        }));
        // Sync originalData so stopped timer state does not trigger unsaved changes buttons
        setOriginalData((prev: any) => prev ? ({
          ...prev,
          ...timerFields,
          timeEntries: timerFields.timeEntries || prev.timeEntries,
          updates: timerFields.updates || prev.updates,
        }) : prev);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to stop timer");
    } finally {
      setIsTimerLoading(false);
      refreshTimer();
    }
  };

  const getNormalizedId = (val: any) => {
    if (!val) return null;
    if (typeof val === 'object') return String(val._id || val.id || '');
    return String(val);
  };

  const hasChanges = !isNew && canUpdateTask && originalData && (() => {
    // Title
    if ((taskData.title || '').trim() !== (originalData.title || '').trim()) return true;

    // Description
    if ((taskData.description || '').trim() !== (originalData.description || '').trim()) return true;

    // Status
    if ((taskData.status || 'To Do') !== (originalData.status || 'To Do')) return true;

    // Priority
    if ((taskData.priority || 'No Priority') !== (originalData.priority || 'No Priority')) return true;

    // Start Date
    const curStart = taskData.startDate ? new Date(taskData.startDate).getTime() : null;
    const origStart = originalData.startDate ? new Date(originalData.startDate).getTime() : null;
    if (curStart !== origStart) return true;

    // Due Date
    const curDue = taskData.dueDate ? new Date(taskData.dueDate).getTime() : null;
    const origDue = originalData.dueDate ? new Date(originalData.dueDate).getTime() : null;
    if (curDue !== origDue) return true;

    // Estimated Hours
    if (Number(taskData.estimatedHours || 0) !== Number(originalData.estimatedHours || 0)) return true;

    // Project ID
    if (getNormalizedId(taskData.projectId) !== getNormalizedId(originalData.projectId)) return true;

    // Assignee ID
    if (getNormalizedId(taskData.assignee) !== getNormalizedId(originalData.assignee)) return true;

    // Tags
    const curTags = Array.isArray(taskData.tags) ? [...taskData.tags].sort() : [];
    const origTags = Array.isArray(originalData.tags) ? [...originalData.tags].sort() : [];
    if (JSON.stringify(curTags) !== JSON.stringify(origTags)) return true;

    // Resources
    const curRes = Array.isArray(taskData.resources) ? taskData.resources : [];
    const origRes = Array.isArray(originalData.resources) ? originalData.resources : [];
    if (curRes.length !== origRes.length || JSON.stringify(curRes) !== JSON.stringify(origRes)) return true;

    return false;
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
    router.push(cp(`/tasks/${targetId}`));
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
    if (isNew && !canCreateTask) {
      return;
    }
    if (isNew && !taskData.projectId) {
      alert("A project is required to create a task. Please select a project.");
      return;
    }
    try {
      setIsSaving(true);
      if (isNew) {
        const createPayload: any = {
          title: taskData.title,
          projectId: typeof taskData.projectId === 'object' ? (taskData.projectId._id || taskData.projectId.id) : taskData.projectId,
          ...(taskData.description && { description: taskData.description }),
          ...(taskData.status && { status: taskData.status }),
          ...(taskData.priority && { priority: taskData.priority }),
          ...(taskData.startDate ? { startDate: taskData.startDate } : {}),
          ...(taskData.dueDate ? { dueDate: taskData.dueDate } : {}),
          ...(taskData.estimatedHours !== undefined ? { estimatedHours: taskData.estimatedHours } : {}),
          ...(taskData.assignee ? { assignee: taskData.assignee._id || taskData.assignee } : {}),
          ...(taskData.tags && taskData.tags.length > 0 ? { tags: taskData.tags } : {}),
          ...(taskData.resources && taskData.resources.length > 0 ? { resources: taskData.resources } : {}),
        };
        await createTask(createPayload);
        if (createPayload.projectId) {
          router.push(cp(`/projects/${createPayload.projectId}`));
        } else {
          router.push(cp('/tasks'));
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
      if ((taskData.title || '').trim() !== (originalData?.title || '').trim()) updatePayload.title = taskData.title;
      if ((taskData.description || '').trim() !== (originalData?.description || '').trim()) updatePayload.description = taskData.description;
      if ((taskData.status || 'To Do') !== (originalData?.status || 'To Do')) updatePayload.status = taskData.status;
      if ((taskData.priority || 'No Priority') !== (originalData?.priority || 'No Priority')) updatePayload.priority = taskData.priority;
      
      const curStart = taskData.startDate ? new Date(taskData.startDate).getTime() : null;
      const origStart = originalData?.startDate ? new Date(originalData.startDate).getTime() : null;
      if (curStart !== origStart) updatePayload.startDate = taskData.startDate;
      
      const curDue = taskData.dueDate ? new Date(taskData.dueDate).getTime() : null;
      const origDue = originalData?.dueDate ? new Date(originalData.dueDate).getTime() : null;
      if (curDue !== origDue) updatePayload.dueDate = taskData.dueDate;

      if (Number(taskData.estimatedHours || 0) !== Number(originalData?.estimatedHours || 0)) updatePayload.estimatedHours = taskData.estimatedHours;
      
      if (getNormalizedId(taskData.assignee) !== getNormalizedId(originalData?.assignee)) {
        updatePayload.assignee = taskData.assignee ? (taskData.assignee._id || taskData.assignee.id || taskData.assignee) : null;
      }
      if (getNormalizedId(taskData.projectId) !== getNormalizedId(originalData?.projectId)) {
        updatePayload.projectId = typeof taskData.projectId === 'object'
          ? (taskData.projectId._id || taskData.projectId.id)
          : taskData.projectId;
      }
      
      const curTags = Array.isArray(taskData.tags) ? [...taskData.tags].sort() : [];
      const origTags = Array.isArray(originalData?.tags) ? [...originalData.tags].sort() : [];
      if (JSON.stringify(curTags) !== JSON.stringify(origTags)) updatePayload.tags = taskData.tags;
      
      const curRes = Array.isArray(taskData.resources) ? taskData.resources : [];
      const origRes = Array.isArray(originalData?.resources) ? originalData.resources : [];
      if (curRes.length !== origRes.length || JSON.stringify(curRes) !== JSON.stringify(origRes)) {
        updatePayload.resources = taskData.resources;
      }

      if (Object.keys(updatePayload).length === 0) {
        setOriginalData({ ...taskData });
        return;
      }
      const updated = await updateTask(id, updatePayload);
      if (updated) {
        const mappedData = {
          title: updated.title ?? taskData.title ?? '',
          description: updated.description ?? taskData.description ?? '',
          status: updated.status ?? taskData.status ?? 'To Do',
          priority: updated.priority ?? taskData.priority ?? 'No Priority',
          startDate: updated.startDate ?? taskData.startDate ?? null,
          dueDate: updated.dueDate ?? taskData.dueDate ?? null,
          estimatedHours: updated.estimatedHours ?? taskData.estimatedHours ?? 0,
          isTimerRunning: !!(updated.isTimerRunning ?? taskData.isTimerRunning),
          timerStartedAt: updated.timerStartedAt ?? taskData.timerStartedAt ?? null,
          timerUser: updated.timerUser ?? taskData.timerUser ?? null,
          assignee: updated.assignee !== undefined ? updated.assignee : taskData.assignee,
          assignedBy: updated.assignedBy ?? taskData.assignedBy ?? null,
          projectId: updated.projectId !== undefined ? updated.projectId : taskData.projectId,
          tags: updated.tags ?? taskData.tags ?? [],
          resources: updated.resources ?? taskData.resources ?? [],
          comments: updated.comments ?? taskData.comments ?? [],
          updates: updated.updates ?? taskData.updates ?? [],
          members: updated.members ?? taskData.members ?? [],
          timeEntries: updated.timeEntries ?? taskData.timeEntries ?? [],
          isOwner: updated.isOwner !== undefined ? updated.isOwner : taskData.isOwner !== false,
        };
        setTaskData(mappedData);
        setOriginalData(mappedData);
        setToastMessage("Task updated successfully");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (originalData) {
      setTaskData({ ...originalData }); // Reset to last saved state
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
        <AccessDenied
          module="tasks"
          action="read"
          message="You do not have permission to access or view this task."
        />
      </div>
    );
  }

  if (isNew && !accessLoading && !canCreateTask) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
        <AccessDenied
          module="tasks"
          action="create"
          message="You do not have permission to create new tasks. Please contact your organization administrator if you need access."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-xs shrink-0 min-h-[52px]">
        <div className="flex items-center gap-2">
          {!isOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-1.5 border border-border/80 rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-xs mr-2 cursor-pointer"
            >
              <PanelLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground ml-1">
            {projectTitle && (taskData.projectId || projectId) ? (
              <>
                <CompanyLink href="/projects" className="hover:text-foreground transition-colors">Projects</CompanyLink>
                <span className="text-muted-foreground/60">/</span>
                <CompanyLink href={`/projects/${taskData.projectId || projectId}`} className="hover:text-foreground transition-colors max-w-[150px] truncate">
                  {projectTitle}
                </CompanyLink>
                <span className="text-muted-foreground/60">/</span>
              </>
            ) : (
              <>
                <CompanyLink href="/projects" className="hover:text-foreground transition-colors">Projects</CompanyLink>
                <span className="text-muted-foreground/60">/</span>
                <CompanyLink href="/tasks" className="hover:text-foreground transition-colors">Tasks</CompanyLink>
                <span className="text-muted-foreground/60">/</span>
              </>
            )}
            <span className="text-foreground font-semibold max-w-[220px] md:max-w-[320px] truncate">
              {taskData.title || (isNew ? 'New Task' : 'Loading...')}
            </span>
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
            canCreateTask && (
              <button 
                onClick={handleSave}
                disabled={isSaving || !taskData.title?.trim() || !taskData.projectId}
                title={!taskData.projectId ? "Please select a project before saving" : "Save Task"}
                className="flex items-center gap-1.5 h-8 px-3.5 border border-transparent rounded-lg transition-all bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum shadow-xs text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving...' : 'Save Task'}</span>
              </button>
            )
          ) : hasChanges ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-3 border border-border/80 rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-xs text-muted-foreground hover:text-foreground text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSaving || !taskData.title?.trim() || !canUpdateTask}
                className="flex items-center gap-1.5 h-8 px-3.5 border border-transparent rounded-lg transition-all bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum shadow-xs text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Updating...' : 'Update Task'}</span>
              </button>
            </div>
          ) : null}
          
          <button 
            onClick={toggleChatbot}
            title="Toggle AI Task Copilot (⌘J)"
            className={`p-1.5 border border-border/80 rounded-lg transition-colors bg-card shadow-xs cursor-pointer ${
              isChatbotOpen ? 'bg-primary/10 text-primary border-primary/40 shadow-xs' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            title={isRightPanelOpen ? "Collapse Activity Panel" : "Expand Activity Panel"}
            className={`p-1.5 border border-border/80 rounded-lg transition-colors bg-card shadow-xs cursor-pointer ${
              isRightPanelOpen ? 'bg-muted/80 text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column (Main Task Details & Time entries) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <TaskMainContent 
              taskId={id}
              taskData={taskData} 
              setTaskData={setTaskData} 
              isEditable={canUpdateTask} 
              isNew={isNew}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              isTimerLoading={isTimerLoading}
            />
          </div>
        </div>

        {/* Right Column (Activity Panel: Unified Timeline + Comment Composer) */}
        {isRightPanelOpen && (
          <div className="w-[380px] lg:w-[420px] shrink-0 h-full overflow-hidden">
            <TaskActivityPanel 
              taskId={id} 
              comments={taskData.comments || []} 
              updates={taskData.updates || []}
              setTaskData={setTaskData} 
              mentionMembers={
                (taskData.members || []).map((m: any) => ({
                  name: getUserDisplayName(m),
                  avatarUrl: m.avatarUrl || m.avatar,
                  email: m.email,
                }))
              }
              canComment={canUpdateTask}
            />
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

