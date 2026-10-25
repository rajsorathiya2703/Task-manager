"use client";

import { useState, useRef, useEffect } from "react";
import { 
  CircleDot, 
  Flag, 
  Hourglass, 
  Tag, 
  Calendar, 
  CalendarDays, 
  UserPlus, 
  Clock, 
  Paperclip, 
  Link2, 
  Play, 
  Square, 
  ChevronDown, 
  Check, 
  Loader2, 
  File, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  ExternalLink, 
  Download, 
  RotateCcw,
  Bot,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Signal,
  FolderKanban,
  Search
} from "lucide-react";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { BoundField } from "../access";
import { PriorityBadge } from "../board/PriorityBadge";
import { formatDisplayDate } from "../../lib/utils";
import { getSessionProjects, getCachedProjectsSync } from "../../lib/project-cache";
import { 
  uploadResource, 
  fetchMe, 
  fetchProjectById, 
  fetchTeamById, 
  updateTask, 
  getAttachmentUrl, 
  validateUploadFiles, 
  normalizeUrl, 
  openAttachment, 
  isAuthenticatedFileViewUrl 
} from "../../lib/api";

interface TaskMainContentProps {
  taskId?: string;
  taskData?: any;
  setTaskData?: (data: any) => void;
  isEditable?: boolean;
  isNew?: boolean;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  isTimerLoading?: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(dateInput?: string | Date): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      " (" + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ")";
  } catch {
    return "";
  }
}

export function TaskMainContent({
  taskId,
  taskData,
  setTaskData,
  isEditable = true,
  isNew = false,
  onStartTimer,
  onStopTimer,
  isTimerLoading = false
}: TaskMainContentProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isAssigningBack, setIsAssigningBack] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projects session-cached state
  const [projects, setProjects] = useState<any[]>(() => getCachedProjectsSync() || []);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  useEffect(() => {
    getSessionProjects().then((list) => {
      setProjects(list || []);
    });
  }, []);

  // Load current user
  useEffect(() => {
    fetchMe().then(setCurrentUser).catch((err) => console.error("Failed to load user in TaskMainContent", err));
  }, []);

  // Load project team members for assignee dropdown
  useEffect(() => {
    if (taskData?.projectId) {
      const projId = typeof taskData.projectId === 'object'
        ? (taskData.projectId._id || taskData.projectId.id)
        : taskData.projectId;

      if (!projId) {
        setTeamMembers([]);
        return;
      }

      fetchProjectById(projId).then(async (proj) => {
        if (proj?.teamId) {
          const teamId = typeof proj.teamId === 'object' ? (proj.teamId._id || proj.teamId.id) : proj.teamId;
          if (teamId) {
            const team = await fetchTeamById(teamId);
            setTeamMembers(team?.members || []);
          } else {
            setTeamMembers([]);
          }
        } else {
          setTeamMembers([]);
        }
      }).catch((err) => {
        console.error("Failed to load team in TaskMainContent", err);
        setTeamMembers([]);
      });
    } else {
      setTeamMembers([]);
    }
  }, [taskData?.projectId]);

  // Assignee check for starting timer
  const isAssignee = (() => {
    if (!taskData?.assignee) return true; // If unassigned, allow
    if (!currentUser) return false;

    const currentUserId = (currentUser.id || currentUser._id)?.toString();
    const currentEmail = currentUser.email?.toLowerCase();
    const currentName = currentUser.name?.trim().toLowerCase();

    const assigneeId = (taskData.assignee._id || taskData.assignee.userId || taskData.assignee.id)?.toString();
    const assigneeEmail = taskData.assignee.email?.toLowerCase();
    const assigneeName = (taskData.assignee.name || `${taskData.assignee.fullName?.firstName || ''} ${taskData.assignee.fullName?.lastName || ''}`).trim().toLowerCase();

    if (currentUserId && assigneeId && currentUserId === assigneeId) return true;
    if (currentEmail && assigneeEmail && currentEmail === assigneeEmail) return true;
    if (currentName && assigneeName && currentName === assigneeName) return true;

    return false;
  })();

  // Assign Back logic
  const currentUserId = (currentUser?.id || currentUser?._id)?.toString();
  const currentEmail = currentUser?.email?.toLowerCase().trim();
  const currentName = currentUser?.name?.toLowerCase().trim();

  const assignee = taskData?.assignee;
  const assigneeId = (assignee?._id || assignee?.id)?.toString();
  const assigneeUserId = (assignee?.userId?._id || assignee?.userId)?.toString();
  const assigneeEmail = assignee?.email?.toLowerCase().trim();
  const assigneeFirstName = assignee?.fullName?.firstName?.toLowerCase().trim() || '';
  const assigneeLastName = assignee?.fullName?.lastName?.toLowerCase().trim() || '';
  const assigneeFullName = `${assigneeFirstName} ${assigneeLastName}`.trim() || assignee?.name?.toLowerCase().trim() || '';

  const isCurrentAssignee = !!(
    assignee &&
    currentUser &&
    (
      (currentUserId && (currentUserId === assigneeUserId || currentUserId === assigneeId)) ||
      (currentEmail && assigneeEmail && currentEmail === assigneeEmail) ||
      (currentName && assigneeFirstName && (currentName.includes(assigneeFirstName) || assigneeFullName.includes(currentName)))
    )
  );

  const assigner = taskData?.assignedBy;
  const assignerId = (assigner?._id || assigner?.id)?.toString();
  const assignerUserId = (assigner?.userId?._id || assigner?.userId)?.toString();
  const assignerEmail = assigner?.email?.toLowerCase().trim();

  const isAssignerDifferent = !!(
    assigner &&
    (assignerId && assigneeId ? assignerId !== assigneeId : true) &&
    (assignerUserId && assigneeUserId ? assignerUserId !== assigneeUserId : true) &&
    (assignerEmail && assigneeEmail ? assignerEmail !== assigneeEmail : true)
  );

  const canAssignBack = isCurrentAssignee && isAssignerDifferent;

  const handleAssignBack = async () => {
    if (!taskId || taskId === 'new' || !taskData || !assigner || isAssigningBack) return;
    try {
      setIsAssigningBack(true);
      const targetId = taskId || taskData.id || taskData._id;
      const targetAssigneeId = assigner._id || assigner.id;
      const updated = await updateTask(targetId, { assignee: targetAssigneeId });
      if (setTaskData) {
        setTaskData({
          ...taskData,
          assignee: updated?.assignee || assigner,
          assignedBy: updated?.assignedBy || taskData.assignedBy,
          updates: updated?.updates || taskData.updates
        });
      }
    } catch (err) {
      console.error("Failed to assign back task", err);
    } finally {
      setIsAssigningBack(false);
    }
  };

  // Progress & Logged time calculation
  const rawLoggedSeconds = (taskData?.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
  const estimatedSec = (taskData?.estimatedHours || 0) * 3600;
  const totalLoggedSeconds = estimatedSec > 0 ? Math.min(rawLoggedSeconds, estimatedSec) : rawLoggedSeconds;
  const ratio = estimatedSec > 0 ? (totalLoggedSeconds / estimatedSec) : 0;
  const percent = Math.min(100, Math.round(ratio * 100));

  // Date range picker state
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>({
    from: taskData?.startDate ? new Date(taskData.startDate) : (taskData?.dueDate ? new Date(taskData.dueDate) : undefined),
    to: taskData?.dueDate ? new Date(taskData.dueDate) : undefined,
  });

  useEffect(() => {
    if (taskData) {
      setRange({
        from: taskData.startDate ? new Date(taskData.startDate) : (taskData.dueDate ? new Date(taskData.dueDate) : undefined),
        to: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      });
    }
  }, [taskData?.startDate, taskData?.dueDate]);

  const handleSelectRange = (selectedRange: any) => {
    setRange(selectedRange);
    if (setTaskData && taskData) {
      setTaskData({
        ...taskData,
        startDate: selectedRange?.from ? selectedRange.from.toISOString() : null,
        dueDate: selectedRange?.to ? selectedRange.to.toISOString() : (selectedRange?.from ? selectedRange.from.toISOString() : null),
      });
    }
  };

  // Resources File & Link Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !taskId || taskId === 'new') return;
    setUploadError(null);
    const selectedFiles = Array.from(e.target.files);
    const validation = validateUploadFiles(selectedFiles);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      const updatedTask = await uploadResource(taskId, formData);
      if (setTaskData && taskData) {
        setTaskData({ ...taskData, resources: updatedTask.resources });
      }
    } catch (err: any) {
      console.error("Failed to upload files", err);
      const msg = err.response?.data?.message || err.message || "Failed to upload files";
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const rawUrl = e.currentTarget.value.trim();
      if (rawUrl && setTaskData && taskData) {
        const url = normalizeUrl(rawUrl);
        const newResource = { name: rawUrl, url, type: 'link' };
        setTaskData({
          ...taskData,
          resources: [...(taskData.resources || []), newResource]
        });
        e.currentTarget.value = '';
      }
    }
  };

  const removeLabel = (tagToRemove: string) => {
    if (setTaskData && taskData) {
      setTaskData({
        ...taskData,
        tags: (taskData.tags || []).filter((t: string) => t !== tagToRemove)
      });
    }
  };

  const handleAddLabel = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || !setTaskData || !taskData) return;
    const currentTags = taskData.tags || [];
    if (!currentTags.includes(trimmed)) {
      setTaskData({
        ...taskData,
        tags: [...currentTags, trimmed],
      });
    }
  };

  const priority = taskData?.priority || "High";
  const status = taskData?.status || "To Do";

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'Completed': return 'bg-emerald-500';
      case 'Doing': return 'bg-blue-500';
      case 'On Hold': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const currentProjectId = typeof taskData?.projectId === 'object'
    ? (taskData.projectId?._id || taskData.projectId?.id)
    : taskData?.projectId;

  const selectedProject = projects.find((p) => (p._id || p.id) === currentProjectId);
  const projectDisplayName = selectedProject?.name || (typeof taskData?.projectId === 'object' ? taskData.projectId.name : null);

  const filteredProjects = projects.filter((p) =>
    p.name?.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const handleSelectProject = (project: any) => {
    const pId = project._id || project.id;
    if (setTaskData && taskData) {
      setTaskData({
        ...taskData,
        projectId: pId,
      });
    }
  };

  return (
    <div className="relative pb-16">
      {/* Top Header: Title and Start Timer Button */}
      <div className="flex items-start justify-between gap-6 mb-2">
        <div className="flex-1 min-w-0">
          <BoundField module="tasks" field="title">
            {({ disabled }) => (
              isEditable && !disabled ? (
                <input
                  type="text"
                  value={taskData?.title ?? ""}
                  onChange={(e) => setTaskData && setTaskData({ ...taskData, title: e.target.value })}
                  placeholder="Task Title..."
                  className="text-2xl md:text-3xl font-bold text-foreground w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40 p-0 tracking-tight"
                />
              ) : (
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                  {taskData?.title || 'Untitled Task'}
                </h1>
              )
            )}
          </BoundField>

          {/* Description */}
          <BoundField module="tasks" field="description">
            {({ disabled }) => (
              isEditable && !disabled ? (
                <textarea
                  value={taskData?.description ?? ""}
                  onChange={(e) => setTaskData && setTaskData({ ...taskData, description: e.target.value })}
                  placeholder="This is the task to planning..."
                  rows={2}
                  className="text-muted-foreground text-sm w-full bg-transparent border-none outline-none focus:ring-0 resize-none p-0 mt-2 placeholder:text-muted-foreground/40 leading-relaxed"
                />
              ) : (
                <p className="text-muted-foreground text-sm p-0 mt-2 leading-relaxed">
                  {taskData?.description || <span className="italic opacity-50">No description provided</span>}
                </p>
              )
            )}
          </BoundField>
        </div>

        {/* Start / Stop Timer Button */}
        {!isNew && (
          <div className="shrink-0 pt-1">
            {taskData?.isTimerRunning ? (
              <button
                type="button"
                onClick={onStopTimer}
                disabled={isTimerLoading || !isAssignee}
                title={!isAssignee ? "Only the assigned user can stop the timer" : "Stop Timer"}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs md:text-sm transition-all shadow-xs cursor-pointer animate-pulse disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTimerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                <span>Stop timer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartTimer}
                disabled={isTimerLoading || !isAssignee}
                title={!isAssignee ? "Only the assigned user can start the timer" : "Start Timer"}
                className="flex items-center gap-2 px-4 py-2 bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum rounded-lg font-semibold text-xs md:text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTimerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                <span>Start timer</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2-Column Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 my-8">
        {/* Left Column of Properties */}
        <div className="space-y-4">
          {/* Project (Required) */}
          <BoundField module="tasks" field="projectId">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <FolderKanban className="w-4 h-4 text-muted-foreground" />
                  <span>Project</span>
                  {isNew && <span className="text-red-500 font-bold ml-0.5">*</span>}
                </div>
                <div className="relative">
                  {disabled ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card rounded-lg text-xs font-semibold text-foreground opacity-80 cursor-not-allowed truncate max-w-[190px]">
                      <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{projectDisplayName || "No project"}</span>
                    </div>
                  ) : (
                    <Popover className="relative">
                      <Popover.Button className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors shadow-xs outline-none cursor-pointer max-w-[190px] text-left ${
                        !currentProjectId && isNew 
                          ? 'border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                          : 'border-border/80 bg-card hover:bg-muted/40 text-foreground'
                      }`}>
                        <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 min-w-0">{projectDisplayName || (isNew ? "Select project *" : "Select project...")}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
                      </Popover.Button>
                      <Popover.Panel className="absolute left-0 top-full mt-1.5 w-60 bg-card border border-border rounded-xl shadow-xl z-50 p-2 outline-none">
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={projectSearchQuery}
                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-muted/50 border border-border rounded-lg outline-none focus:border-primary text-foreground"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                          {filteredProjects.length > 0 ? (
                            filteredProjects.map((proj) => {
                              const pId = proj._id || proj.id;
                              const isSelected = pId === currentProjectId;
                              return (
                                <button
                                  key={pId}
                                  type="button"
                                  onClick={() => handleSelectProject(proj)}
                                  className={`flex items-center justify-between px-2.5 py-2 hover:bg-muted/50 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground font-medium'
                                  }`}
                                >
                                  <span className="truncate">{proj.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-xs text-muted-foreground p-3 text-center italic">
                              No projects found.
                            </div>
                          )}
                        </div>
                      </Popover.Panel>
                    </Popover>
                  )}
                </div>
              </div>
            )}
          </BoundField>

          {/* Status */}
          <BoundField module="tasks" field="status">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <CircleDot className="w-4 h-4 text-muted-foreground" />
                  <span>Status</span>
                </div>
                <div className="relative">
                  {disabled ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card rounded-lg text-xs font-semibold text-foreground opacity-80 cursor-not-allowed">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                      <span className="uppercase tracking-wider">{status}</span>
                    </div>
                  ) : (
                    <Popover className="relative">
                      <Popover.Button className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card hover:bg-muted/40 rounded-lg text-xs font-semibold text-foreground transition-colors shadow-xs outline-none cursor-pointer">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                        <span className="uppercase tracking-wider">{status}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                      </Popover.Button>
                      <Popover.Panel className="absolute left-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-lg z-50 py-1 flex flex-col outline-none">
                        {['To Do', 'Doing', 'Completed', 'On Hold'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs text-left cursor-pointer transition-colors"
                            onClick={() => setTaskData && setTaskData({ ...taskData, status: st })}
                          >
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(st)}`} />
                              <span>{st}</span>
                            </div>
                            {status === st && <Check className="w-3.5 h-3.5 text-foreground" />}
                          </button>
                        ))}
                      </Popover.Panel>
                    </Popover>
                  )}
                </div>
              </div>
            )}
          </BoundField>

          {/* Priority */}
          <BoundField module="tasks" field="priority">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                  <span>Priority</span>
                </div>
                <div className="relative">
                  {disabled ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border border-border/80 bg-card rounded-lg text-xs font-semibold opacity-80 cursor-not-allowed">
                      <PriorityBadge priority={priority as any} />
                    </div>
                  ) : (
                    <Popover className="relative">
                      <Popover.Button className="flex items-center gap-1.5 px-3 py-1.5 border border-border/80 bg-card hover:bg-muted/40 rounded-lg text-xs font-semibold text-foreground transition-colors shadow-xs outline-none cursor-pointer">
                        <PriorityBadge priority={priority as any} />
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                      </Popover.Button>
                      <Popover.Panel className="absolute left-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 flex flex-col outline-none">
                        <button
                          type="button"
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs text-left cursor-pointer"
                          onClick={() => setTaskData && setTaskData({ ...taskData, priority: "No Priority" })}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Signal className="w-3.5 h-3.5" /> No Priority
                          </div>
                          {priority === "No Priority" && <Check className="w-3.5 h-3.5 text-foreground" />}
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs text-left cursor-pointer"
                          onClick={() => setTaskData && setTaskData({ ...taskData, priority: "High" })}
                        >
                          <div className="flex items-center gap-2 text-red-600">
                            <SignalHigh className="w-3.5 h-3.5" /> High
                          </div>
                          {priority === "High" && <Check className="w-3.5 h-3.5 text-foreground" />}
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs text-left cursor-pointer"
                          onClick={() => setTaskData && setTaskData({ ...taskData, priority: "Medium" })}
                        >
                          <div className="flex items-center gap-2 text-orange-500">
                            <SignalMedium className="w-3.5 h-3.5" /> Medium
                          </div>
                          {priority === "Medium" && <Check className="w-3.5 h-3.5 text-foreground" />}
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs text-left cursor-pointer"
                          onClick={() => setTaskData && setTaskData({ ...taskData, priority: "Low" })}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <SignalLow className="w-3.5 h-3.5" /> Low
                          </div>
                          {priority === "Low" && <Check className="w-3.5 h-3.5 text-foreground" />}
                        </button>
                      </Popover.Panel>
                    </Popover>
                  )}
                </div>
              </div>
            )}
          </BoundField>

          {/* Time Estimate */}
          <BoundField module="tasks" field="estimatedHours">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <Hourglass className="w-4 h-4 text-muted-foreground" />
                  <span>Time estimate</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    disabled={disabled}
                    value={taskData?.estimatedHours ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (setTaskData && taskData) setTaskData({ ...taskData, estimatedHours: val });
                    }}
                    className="w-14 h-8 px-2 text-xs font-bold text-center bg-card border border-border/80 rounded-lg outline-none focus:border-primary text-foreground disabled:opacity-50"
                  />
                  <span className="text-xs text-muted-foreground font-medium">hours</span>
                </div>
              </div>
            )}
          </BoundField>
        </div>

        {/* Right Column of Properties */}
        <div className="space-y-4">
          {/* Dates */}
          <BoundField module="tasks" field="dueDate">
            {({ disabled: dueDisabled }) => (
              <BoundField module="tasks" field="startDate">
                {({ disabled: startDisabled }) => {
                  const disabled = dueDisabled || startDisabled;
                  const dateLabel = formatDisplayDate(taskData?.startDate || range?.from?.toISOString(), taskData?.dueDate || range?.to?.toISOString()) || "Set dates";
                  return (
                    <div className="flex items-center gap-3 text-xs md:text-sm">
                      <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Dates</span>
                      </div>
                      <div className="relative">
                        {disabled ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card rounded-lg text-xs font-medium text-foreground opacity-80 cursor-not-allowed">
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{dateLabel}</span>
                          </div>
                        ) : (
                          <Popover className="relative">
                            <Popover.Button className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card hover:bg-muted/40 rounded-lg text-xs font-medium text-foreground transition-colors shadow-xs outline-none cursor-pointer">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{dateLabel}</span>
                            </Popover.Button>
                            <Popover.Panel className="absolute left-0 md:right-0 md:left-auto top-full mt-1.5 bg-card border border-border rounded-2xl shadow-xl z-50 p-2 outline-none">
                              <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border mb-1">
                                Select Start Date → Due Date
                              </div>
                              <DayPicker
                                mode="range"
                                selected={range as any}
                                onSelect={handleSelectRange}
                                className="!m-0 text-xs"
                                style={{
                                  '--rdp-cell-size': '28px',
                                  '--rdp-caption-font-size': '13px',
                                  '--rdp-nav-height': '28px'
                                } as React.CSSProperties}
                                modifiersClassNames={{
                                  selected: "bg-primary text-primary-foreground font-bold rounded-full",
                                  range_start: "bg-primary text-primary-foreground font-bold rounded-l-full",
                                  range_end: "bg-primary text-primary-foreground font-bold rounded-r-full",
                                  range_middle: "bg-primary/10 text-foreground font-medium rounded-none",
                                }}
                              />
                            </Popover.Panel>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                }}
              </BoundField>
            )}
          </BoundField>

          {/* Assignee */}
          <BoundField module="tasks" field="assignee">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <span>Assignee</span>
                </div>
                <div className="relative">
                  {disabled ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-border/80 bg-card rounded-lg text-xs font-medium text-muted-foreground opacity-80 cursor-not-allowed">
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{taskData?.assignee ? (taskData.assignee.fullName?.firstName || taskData.assignee.name || 'Assigned') : 'Unassigned'}</span>
                    </div>
                  ) : (
                    <Popover className="relative">
                      <Popover.Button className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-border/80 bg-card hover:bg-muted/40 rounded-lg text-xs font-medium text-foreground transition-colors shadow-xs outline-none cursor-pointer">
                        {taskData?.assignee ? (
                          <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                            {taskData.assignee.fullName?.firstName?.[0] || taskData.assignee.name?.[0] || 'U'}
                          </div>
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span>{taskData?.assignee ? (taskData.assignee.fullName?.firstName ? `${taskData.assignee.fullName.firstName} ${taskData.assignee.fullName.lastName || ''}`.trim() : taskData.assignee.name || 'Assigned') : 'Assign member'}</span>
                      </Popover.Button>
                      <Popover.Panel className="absolute left-0 md:right-0 md:left-auto top-full mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-3 outline-none">
                        <div className="text-xs font-semibold mb-2.5 text-foreground">Select Assignee</div>
                        {teamMembers.length > 0 ? (
                          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {teamMembers.map((member) => {
                              const isSelected = taskData?.assignee?._id === member._id;
                              return (
                                <button
                                  key={member._id}
                                  type="button"
                                  className={`flex items-center gap-2 w-full text-left p-1.5 rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                                  onClick={() => {
                                    if (setTaskData && taskData) {
                                      const newAssignee = isSelected ? null : member;
                                      setTaskData({ ...taskData, assignee: newAssignee });
                                    }
                                  }}
                                >
                                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                    {member.fullName?.firstName?.[0] || member.name?.[0] || 'U'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-foreground truncate">
                                      {member.fullName?.firstName} {member.fullName?.lastName}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">{member.role}</div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic text-center py-3">
                            No team members assigned to this project.
                          </div>
                        )}

                        {canAssignBack && !disabled && (
                          <button
                            type="button"
                            onClick={handleAssignBack}
                            disabled={isAssigningBack}
                            className="flex items-center justify-center gap-1.5 w-full mt-2.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isAssigningBack ? 'Assigning Back...' : `Assign back to ${assigner?.fullName?.firstName || assigner?.name || 'Assigner'}`}</span>
                          </button>
                        )}
                      </Popover.Panel>
                    </Popover>
                  )}
                </div>
              </div>
            )}
          </BoundField>

          {/* Progress */}
          <div className="flex items-center gap-3 text-xs md:text-sm">
            <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Progress</span>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">
                  {Math.floor(totalLoggedSeconds / 3600)}h {Math.floor((totalLoggedSeconds % 3600) / 60)}m / {taskData?.estimatedHours || 0}h
                </span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden border border-border/40">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Resources */}
          <BoundField module="tasks" field="resources">
            {({ disabled }) => (
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span>Resources</span>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <Popover className="relative">
                    <Popover.Button
                      disabled={disabled}
                      className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-border/80 bg-card hover:bg-muted/40 rounded-lg text-xs font-medium text-foreground transition-colors shadow-xs outline-none cursor-pointer w-fit disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span>{isUploading ? 'Uploading...' : 'Add document or link...'}</span>
                    </Popover.Button>
                    <Popover.Panel className="absolute left-0 md:right-0 md:left-auto top-full mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-2.5 outline-none flex flex-col gap-2">
                      {isNew ? (
                        <div className="text-xs text-muted-foreground p-2 text-center">
                          Please save task first before attaching files.
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-2.5 py-2 hover:bg-muted/50 rounded-lg text-xs text-left w-full transition-colors cursor-pointer text-foreground font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            Upload Document (PDF, Video, Image)
                          </button>
                          <div className="border-t border-border/60 pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                              <Link2 className="w-3.5 h-3.5" />
                              <span>Attach Link</span>
                            </div>
                            <input
                              type="url"
                              placeholder="https://... (Press Enter)"
                              className="w-full text-xs px-2.5 py-1.5 bg-muted/50 border border-border rounded-lg outline-none focus:border-primary text-foreground"
                              onKeyDown={handleAddLink}
                            />
                          </div>
                        </>
                      )}
                    </Popover.Panel>
                  </Popover>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf,.pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />

                  {uploadError && (
                    <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md flex items-center justify-between">
                      <span>{uploadError}</span>
                      <button onClick={() => setUploadError(null)} className="font-bold ml-2">×</button>
                    </div>
                  )}

                  {/* Attached resources pills */}
                  {taskData?.resources?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {taskData.resources.map((res: any, idx: number) => {
                        const fileUrl = res.type === 'link' ? normalizeUrl(res.url) : getAttachmentUrl(res.url, res.name);
                        const ext = res.name?.split('.').pop()?.toLowerCase() || '';
                        const isPdf = ext === 'pdf';
                        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

                        let icon = <File className="w-3 h-3 text-blue-500 shrink-0" />;
                        if (res.type === 'link') icon = <ExternalLink className="w-3 h-3 text-orange-500 shrink-0" />;
                        else if (isPdf) icon = <FileText className="w-3 h-3 text-red-500 shrink-0" />;
                        else if (isVideo) icon = <Video className="w-3 h-3 text-purple-500 shrink-0" />;
                        else if (isImage) icon = <ImageIcon className="w-3 h-3 text-emerald-500 shrink-0" />;

                        const isAuthFile = isAuthenticatedFileViewUrl(fileUrl);

                        return (
                          <a
                            key={idx}
                            href={fileUrl}
                            target={isAuthFile ? undefined : "_blank"}
                            rel={isAuthFile ? undefined : "noopener noreferrer"}
                            download={res.type === 'link' || isAuthFile ? undefined : res.name}
                            onClick={(e) => {
                              if (isAuthFile) {
                                e.preventDefault();
                                openAttachment(fileUrl, res.name, false);
                              }
                            }}
                            className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-md text-foreground font-medium text-xs border border-border/50 transition-colors group"
                            title={res.name}
                          >
                            {icon}
                            <span className="truncate max-w-[130px]">{res.name}</span>
                            {res.type !== 'link' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openAttachment(fileUrl, res.name, true);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-foreground text-muted-foreground transition-opacity"
                                title="Download"
                              >
                                <Download className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </BoundField>
        </div>

        {/* Labels Row (Full Width Single Line) */}
        <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-xs md:text-sm pt-1">
          <div className="flex items-center gap-2.5 w-24 shrink-0 text-muted-foreground font-medium">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span>Labels</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 flex-wrap py-0.5 min-w-0">
            {(taskData?.tags || []).map((label: string) => (
              <div
                key={label}
                className="flex items-center gap-1 bg-muted/60 dark:bg-muted/40 border border-border/70 text-foreground font-medium text-xs px-2.5 py-1 rounded-md shrink-0 whitespace-nowrap"
              >
                <span>{label}</span>
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="text-muted-foreground hover:text-foreground font-bold text-xs cursor-pointer ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {isEditable && (
              <Popover className="relative shrink-0">
                <Popover.Button className="w-7 h-7 rounded-md border border-border/80 bg-card hover:bg-muted/50 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground cursor-pointer shadow-xs transition-colors shrink-0">
                  +
                </Popover.Button>
                <Popover.Panel
                  anchor="bottom start"
                  className="w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-2.5 outline-none mt-1.5"
                >
                  {({ close }) => (
                    <div className="space-y-2">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.elements.namedItem('labelInput') as HTMLInputElement;
                          const val = input?.value?.trim();
                          if (val) {
                            handleAddLabel(val);
                            input.value = '';
                            close();
                          }
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          name="labelInput"
                          type="text"
                          autoFocus
                          placeholder="Type label & press Enter..."
                          className="flex-1 text-xs px-2.5 py-1.5 bg-muted/50 border border-border rounded-lg outline-none focus:border-primary text-foreground"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                      </form>
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-border/40">
                        {['Bug', 'Feature', 'Urgent', 'Enhancement', 'Documentation']
                          .filter((suggestion) => !(taskData?.tags || []).includes(suggestion))
                          .map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                handleAddLabel(suggestion);
                                close();
                              }}
                              className="px-2 py-0.5 rounded text-[11px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 cursor-pointer transition-colors"
                            >
                              + {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </Popover.Panel>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Divider Line */}
      <div className="border-t border-border/60 my-8" />

      {/* Time Entries Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Time entries</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
            {formatDuration(totalLoggedSeconds)}
          </span>
        </div>

        {/* Empty State Dashed Card */}
        {(!taskData?.timeEntries || taskData.timeEntries.length === 0) && !taskData?.isTimerRunning ? (
          <div className="border border-dashed border-border/80 rounded-xl p-4 flex items-center justify-between text-xs text-muted-foreground bg-card/40">
            <span>+ No time entries recorded yet</span>
            {!isNew && (
              <button
                type="button"
                onClick={onStartTimer}
                disabled={isTimerLoading || !isAssignee}
                className="font-semibold text-foreground hover:underline cursor-pointer disabled:opacity-50"
              >
                Start timer
              </button>
            )}
          </div>
        ) : (
          <div className="border border-border/80 rounded-xl bg-card overflow-hidden divide-y divide-border/50 shadow-xs">
            {/* Active Direct Timer Indicator */}
            {taskData?.isTimerRunning && taskData?.timerStartedAt && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border-b border-emerald-500/20 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Task Timer Running...
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Started by {taskData?.timerUser?.name || "User"} at {formatDateTime(taskData.timerStartedAt)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onStopTimer}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Recorded Time Entries List */}
            {(taskData?.timeEntries || []).map((entry: any, index: number) => {
              const userName = entry.user?.name || entry.user?.email || "User";
              return (
                <div key={entry._id || index} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center font-bold text-[10px] text-foreground border border-border/60 shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{userName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDateTime(entry.startTime)} – {formatDateTime(entry.stopTime)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 shrink-0">
                    {formatDuration(entry.durationSeconds)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
