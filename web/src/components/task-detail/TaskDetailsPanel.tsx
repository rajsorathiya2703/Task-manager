"use client";

import { useState, useEffect } from "react";
import { Popover } from "@headlessui/react";
import { ChevronDown, Plus, Settings, SignalHigh, SignalMedium, SignalLow, Signal, CalendarDays, Check, Lock, UserCheck, RotateCcw } from "lucide-react";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { PriorityBadge } from "../board/PriorityBadge";
import { formatDisplayDate } from "../../lib/utils";
import { usePermissions } from "../../contexts/PermissionsContext";

interface TaskDetailsPanelProps {
  taskId?: string;
  taskData?: any;
  setTaskData?: (data: any) => void;
}

export function TaskDetailsPanel({ taskId, taskData, setTaskData }: TaskDetailsPanelProps) {
  const isOwner = taskData?.isOwner !== false;
  const priority = taskData?.priority || "High";
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAssigningBack, setIsAssigningBack] = useState(false);

  // Field-level permission checks (tasks model)
  const { canField, status: permStatus } = usePermissions();
  const canEditStatus   = permStatus === 'ready' ? canField('tasks', 'status',         'update') : true;
  const canEditPriority = permStatus === 'ready' ? canField('tasks', 'priority',       'update') : true;
  const canEditHours    = permStatus === 'ready' ? canField('tasks', 'estimatedHours', 'update') : true;
  const canEditAssignee = permStatus === 'ready' ? canField('tasks', 'assignee',       'update') : true;
  const canEditDates    = permStatus === 'ready' ?
    (canField('tasks', 'startDate', 'update') && canField('tasks', 'dueDate', 'update')) : true;
  const canEditTags     = permStatus === 'ready' ? canField('tasks', 'tags',           'update') : true;

  useEffect(() => {
    import("../../../src/lib/api").then(async ({ fetchMe }) => {
      try {
        const u = await fetchMe();
        setCurrentUser(u);
      } catch (err) {
        console.error("Failed to fetch current user in TaskDetailsPanel", err);
      }
    });
  }, []);

  useEffect(() => {
    if (taskData?.projectId) {
      import("../../../src/lib/api").then(async ({ fetchProjectById, fetchTeamById }) => {
        try {
          const projId = typeof taskData.projectId === 'object'
            ? (taskData.projectId._id || taskData.projectId.id)
            : taskData.projectId;

          if (!projId) {
            setTeamMembers([]);
            return;
          }

          const proj = await fetchProjectById(projId);
          if (proj?.teamId) {
            const teamId = typeof proj.teamId === 'object'
              ? (proj.teamId._id || proj.teamId.id)
              : proj.teamId;

            if (teamId) {
              const team = await fetchTeamById(teamId);
              setTeamMembers(team?.members || []);
            } else {
              setTeamMembers([]);
            }
          } else {
            setTeamMembers([]);
          }
        } catch (error) {
          console.error("Failed to fetch team members", error);
          setTeamMembers([]);
        }
      });
    } else {
      setTeamMembers([]);
    }
  }, [taskData?.projectId]);

  // Calculate Logged Time & Progress
  const rawLoggedSeconds = (taskData?.timeEntries || []).reduce((acc: number, entry: any) => acc + (entry.durationSeconds || 0), 0);
  const estimatedSec = (taskData?.estimatedHours || 0) * 3600;
  const totalLoggedSeconds = estimatedSec > 0 ? Math.min(rawLoggedSeconds, estimatedSec) : rawLoggedSeconds;
  const ratio = estimatedSec > 0 ? (totalLoggedSeconds / estimatedSec) : 0;
  const percent = Math.min(100, Math.round(ratio * 100));
  const progressColor = ratio <= 0.70 ? "bg-emerald-500" : ratio <= 0.90 ? "bg-amber-500" : "bg-red-500";
  const progressBadge = ratio <= 0.70 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : ratio <= 0.90 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" : "text-red-600 dark:text-red-400 bg-red-500/10";

  // Date Range parse
  const initialFrom = taskData?.startDate 
    ? new Date(taskData.startDate) 
    : (taskData?.dueDate ? new Date(taskData.dueDate) : undefined);
  const initialTo = taskData?.dueDate ? new Date(taskData.dueDate) : undefined;
  
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>({
    from: initialFrom,
    to: initialTo,
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
    if (!isOwner) return;
    setRange(selectedRange);
    if (setTaskData && taskData) {
      setTaskData({
        ...taskData,
        startDate: selectedRange?.from ? selectedRange.from.toISOString() : null,
        dueDate: selectedRange?.to ? selectedRange.to.toISOString() : (selectedRange?.from ? selectedRange.from.toISOString() : null),
      });
    }
  };

  const handlePriorityChange = (val: string) => {
    if (setTaskData && taskData) {
      setTaskData({ ...taskData, priority: val });
    }
  };

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
      const { updateTask } = await import("../../../src/lib/api");
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

  return (
    <div className="border border-border rounded-xl bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ChevronDown className="w-4 h-4" />
          Details
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Plus className="w-4 h-4 hover:text-foreground transition-colors" />
          <Settings className="w-4 h-4 hover:text-foreground transition-colors" />
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="grid grid-cols-[80px_1fr] gap-y-4 items-center text-xs">

          {/* Status */}
          <div className="text-muted-foreground">Status</div>
          <div className="relative w-full">
            {isOwner && canEditStatus ? (
              <Popover>
                <Popover.Button className="flex items-center gap-2 font-medium text-foreground outline-none">
                  <span className={`w-2 h-2 rounded-full ${taskData?.status === 'Completed' ? 'bg-green-500' : taskData?.status === 'Doing' ? 'bg-blue-500' : taskData?.status === 'On Hold' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                  {taskData?.status || "To Do"}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Popover.Button>
                <Popover.Panel anchor="bottom start" className="w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1 flex flex-col outline-none origin-top-left mt-1">
                  {['To Do', 'Doing', 'Completed', 'On Hold'].map(status => (
                    <button key={status} className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs text-left" onClick={() => {
                      if (setTaskData && taskData) setTaskData({ ...taskData, status });
                    }}>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className={`w-2 h-2 rounded-full ${status === 'Completed' ? 'bg-green-500' : status === 'Doing' ? 'bg-blue-500' : status === 'On Hold' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                        {status}
                      </div>
                      {taskData?.status === status && <Check className="w-3.5 h-3.5 text-foreground" />}
                    </button>
                  ))}
                </Popover.Panel>
              </Popover>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span className={`w-2 h-2 rounded-full ${taskData?.status === 'Completed' ? 'bg-green-500' : taskData?.status === 'Doing' ? 'bg-blue-500' : taskData?.status === 'On Hold' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                {taskData?.status || "To Do"}
                {isOwner && !canEditStatus && <Lock className="w-3 h-3 text-muted-foreground/60 ml-1" title="Read-only field" />}
              </div>
            )}
          </div>

          {/* Priority (Dropdown) */}
          <div className="text-muted-foreground">Priority</div>
          <div className="relative w-full">
            {isOwner && canEditPriority ? (
              <Popover>
                <Popover.Button className="flex items-center gap-1.5 font-medium outline-none">
                  <PriorityBadge priority={priority as any} />
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Popover.Button>
                <Popover.Panel anchor="bottom start" className="w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1 flex flex-col outline-none origin-top-left mt-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</div>
                  <button className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs text-left" onClick={() => handlePriorityChange("No Priority")}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Signal className="w-3.5 h-3.5" /> No Priority
                    </div>
                    {priority === "No Priority" && <Check className="w-3.5 h-3.5 text-foreground" />}
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs text-left" onClick={() => handlePriorityChange("High")}>
                    <div className="flex items-center gap-2 text-red-600">
                      <SignalHigh className="w-3.5 h-3.5" /> Urgent
                    </div>
                    {priority === "High" && <Check className="w-3.5 h-3.5 text-foreground" />}
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs text-left" onClick={() => handlePriorityChange("Medium")}>
                    <div className="flex items-center gap-2 text-orange-500">
                      <SignalMedium className="w-3.5 h-3.5" /> Medium
                    </div>
                    {priority === "Medium" && <Check className="w-3.5 h-3.5 text-foreground" />}
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 text-xs text-left" onClick={() => handlePriorityChange("Low")}>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <SignalLow className="w-3.5 h-3.5" /> Low
                    </div>
                    {priority === "Low" && <Check className="w-3.5 h-3.5 text-foreground" />}
                  </button>
                </Popover.Panel>
              </Popover>
            ) : (
              <div className="flex items-center gap-1.5 font-medium">
                <PriorityBadge priority={priority as any} />
                {isOwner && !canEditPriority && <Lock className="w-3 h-3 text-muted-foreground/60 ml-1" title="Read-only field" />}
              </div>
            )}
          </div>

          {/* Assigned Time (Hours) */}
          <div className="text-muted-foreground">Assign Time</div>
          <div className="flex items-center gap-2">
            {isOwner && canEditHours ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskData?.estimatedHours ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (setTaskData && taskData) {
                      setTaskData({ ...taskData, estimatedHours: val });
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs bg-muted/50 border border-border rounded-md outline-none focus:border-primary font-semibold text-foreground text-center"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground font-medium">Hours</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">{taskData?.estimatedHours || 0} Hours</span>
                {isOwner && !canEditHours && <Lock className="w-3 h-3 text-muted-foreground/60" title="Read-only field" />}
              </div>
            )}
          </div>

          {/* Due Time Progress Bar */}
          <div className="text-muted-foreground">Progress</div>
          <div className="flex flex-col gap-1.5 w-full pr-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {Math.floor(totalLoggedSeconds / 3600)}h {Math.floor((totalLoggedSeconds % 3600) / 60)}m / {taskData?.estimatedHours || 0}h
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs ${progressBadge}`}>
                {percent}%
              </span>
            </div>
            <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden border border-border/40">
              <div 
                className={`h-full transition-all duration-300 ${progressColor}`} 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Member Assignment (Single Member) */}
          <div className="text-muted-foreground self-start mt-1">Assignee</div>
          <div className="relative w-full flex flex-col gap-2">
            {isOwner && canEditAssignee ? (
              <Popover>
                <Popover.Button className="flex items-center gap-1.5 text-muted-foreground font-medium outline-none hover:text-foreground transition-colors text-left">
                  <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{taskData?.assignee ? (taskData.assignee.fullName?.firstName || taskData.assignee.name || 'Assigned') : 'Assign member'}</span>
                </Popover.Button>
                <Popover.Panel anchor="bottom end" className="w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-3 outline-none origin-top-right mt-1">
                  <div className="text-sm font-semibold mb-3">Assign from Team</div>
                  
                  {teamMembers.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {teamMembers.map((member) => {
                        const isSelected = taskData?.assignee?._id === member._id;
                        return (
                          <button
                            key={member._id}
                            className={`flex items-center gap-2 w-full text-left p-2 rounded-md transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                            onClick={async () => {
                              if (setTaskData && taskData) {
                                try {
                                  const targetId = taskId || taskData.id || taskData._id;
                                  if (!targetId) throw new Error("Task ID is missing");
                                  const { updateTask } = await import("../../../src/lib/api");
                                  const newAssigneeId = isSelected ? null : member._id;
                                  const updated = await updateTask(targetId, { assignee: newAssigneeId });
                                  setTaskData({
                                    ...taskData,
                                    assignee: isSelected ? null : (updated?.assignee || member),
                                    assignedBy: updated?.assignedBy || taskData.assignedBy,
                                    updates: updated?.updates || taskData.updates
                                  });
                                } catch (err) {
                                  console.error("Failed to assign member", err);
                                }
                              }
                            }}
                          >
                            <div className="flex-1 overflow-hidden">
                              <div className="text-xs font-semibold truncate">
                                {member.fullName?.firstName} {member.fullName?.lastName}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{member.role}</div>
                            </div>
                            {isSelected && (
                              <Check className="w-3 h-3 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic text-center py-4">
                      No team assigned to this project.
                    </div>
                  )}

                  {taskData?.assignee && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Currently Assigned</div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {taskData.assignee.fullName?.firstName} {taskData.assignee.fullName?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{taskData.assignee.role}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Popover.Panel>
              </Popover>
            ) : (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{taskData?.assignee ? (taskData.assignee.fullName?.firstName || taskData.assignee.name) : 'Unassigned'}</span>
                {isOwner && !canEditAssignee && <Lock className="w-3 h-3 text-muted-foreground/60 ml-1" title="Read-only field" />}
              </div>
            )}

            {canAssignBack && (
              <button
                onClick={handleAssignBack}
                disabled={isAssigningBack}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md text-xs font-semibold transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed mt-0.5"
                title={`Assign back to ${assigner?.fullName?.firstName || assigner?.name || 'Assigner'}`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isAssigningBack ? 'Assigning Back...' : 'Assign Back'}</span>
              </button>
            )}
          </div>


          {/* Dates (Calendar Popover - Start & End Date Range) */}
          <div className="text-muted-foreground">Dates</div>
          <div className="relative w-full">
            {isOwner && canEditDates ? (
              <Popover className="relative">
                <Popover.Button className="flex items-center gap-2 px-2 py-1 bg-muted/50 border border-border/50 rounded-md font-medium text-foreground outline-none hover:bg-muted transition-colors">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDisplayDate(taskData?.startDate || range?.from?.toISOString(), taskData?.dueDate || range?.to?.toISOString()) || "Set Dates"}
                </Popover.Button>
                <Popover.Panel anchor="bottom end" className="bg-card border border-border rounded-xl shadow-xl z-50 p-2 outline-none mt-1">
                  <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-muted-foreground border-b border-border">
                    Select Start Date → End Date
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
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 border border-border/30 rounded-md text-xs font-medium text-muted-foreground cursor-not-allowed">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{formatDisplayDate(taskData?.startDate, taskData?.dueDate) || "No date set"}</span>
                <Lock className="w-3 h-3 ml-auto opacity-50" title="Read-only field" />
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="text-muted-foreground">Labels</div>
          <div className="relative w-full">
            {canEditTags ? (
              <Popover>
                <Popover.Button className="flex items-center gap-1.5 font-medium text-foreground outline-none hover:text-primary transition-colors text-xs">
                  {taskData?.tags?.length ? `${taskData.tags.length} Labels` : 'Add label...'}
                </Popover.Button>
                <Popover.Panel anchor="bottom end" className="w-56 bg-card border border-border rounded-lg shadow-lg z-50 p-2 outline-none origin-top-right mt-1">
                  <input
                    type="text"
                    placeholder="Type and press Enter..."
                    className="w-full text-xs px-2 py-1.5 bg-muted/50 border border-border rounded-md outline-none focus:border-primary mb-2 text-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newTag = e.currentTarget.value.trim();
                        if (newTag && setTaskData && taskData) {
                          const currentTags = taskData.tags || [];
                          if (!currentTags.includes(newTag)) {
                            setTaskData({ ...taskData, tags: [...currentTags, newTag] });
                          }
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {(taskData?.tags || []).map((tag: string) => (
                      <div key={tag} className="flex items-center gap-1 bg-muted/80 px-2 py-0.5 rounded-sm text-[10px] font-medium text-foreground">
                        {tag}
                        <button
                          className="hover:text-red-500 ml-1 font-bold"
                          onClick={(e) => {
                            e.preventDefault();
                            if (setTaskData && taskData) {
                              setTaskData({
                                ...taskData,
                                tags: taskData.tags.filter((t: string) => t !== tag)
                              });
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!(taskData?.tags?.length) && <span className="text-[10px] text-muted-foreground">No labels added yet.</span>}
                  </div>
                </Popover.Panel>
              </Popover>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {(taskData?.tags || []).map((tag: string) => (
                  <span key={tag} className="bg-muted/80 px-2 py-0.5 rounded-sm text-[10px] font-medium text-foreground">{tag}</span>
                ))}
                {!(taskData?.tags?.length) && <span className="text-[10px] text-muted-foreground italic">No labels</span>}
                <Lock className="w-3 h-3 text-muted-foreground/60 ml-1" title="Read-only field" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
