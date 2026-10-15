"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
} from "lucide-react";

export type Stage = "todo" | "ongoing" | "onhold" | "completed";

export interface HeroUser {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  bgColor: string;
}

export interface HeroTag {
  label: string;
  bg: string;
  text: string;
}

export interface HeroTask {
  id: string;
  title: string;
  description: string;
  tags: HeroTag[];
  dueDate: string;
  estimatedHours: string;
  stage: Stage;
  assignees: HeroUser[];
}

const STAGES: { id: Stage; label: string; dotColor: string }[] = [
  { id: "todo", label: "To Do", dotColor: "bg-slate-400 dark:bg-slate-500" },
  { id: "ongoing", label: "Ongoing", dotColor: "bg-blue-500" },
  { id: "onhold", label: "On Hold", dotColor: "bg-amber-500" },
  { id: "completed", label: "Completed", dotColor: "bg-emerald-500" },
];

const USERS: Record<string, HeroUser> = {
  alex: {
    id: "u-1",
    name: "Alex Morgan",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    initials: "AM",
    bgColor: "bg-rose-500",
  },
  sarah: {
    id: "u-2",
    name: "Sarah Chen",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    initials: "SC",
    bgColor: "bg-indigo-500",
  },
  elena: {
    id: "u-3",
    name: "Elena Rostova",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    initials: "ER",
    bgColor: "bg-emerald-500",
  },
  marcus: {
    id: "u-4",
    name: "Marcus Vance",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    initials: "MV",
    bgColor: "bg-amber-500",
  },
};

const INITIAL_TASKS: HeroTask[] = [
  // 2 Tasks in To Do
  {
    id: "task-1",
    title: "Revamp User Onboarding Flow",
    description: "Streamline signup wizard steps to reduce drop-off rate and boost activation...",
    tags: [
      { label: "Design", bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
      { label: "High", bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-600 dark:text-red-400" },
    ],
    dueDate: "Oct 24",
    estimatedHours: "6h",
    stage: "todo",
    assignees: [USERS.alex], // Single user (full round profile without name)
  },
  {
    id: "task-2",
    title: "Stripe Webhook Idempotency",
    description: "Handle retry events and prevent duplicate subscription credit deductions...",
    tags: [
      { label: "Backend", bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
      { label: "Billing", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
    ],
    dueDate: "Oct 28",
    estimatedHours: "10h",
    stage: "todo",
    assignees: [USERS.sarah, USERS.marcus], // Multiple users (attached round circles, 70% visible)
  },

  // 1 Task in Ongoing
  {
    id: "task-3",
    title: "Live Activity WebSocket Feed",
    description: "Real-time task drag and drop synchronization for multi-player workspaces...",
    tags: [
      { label: "Feature", bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
      { label: "Realtime", bg: "bg-cyan-500/10 dark:bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400" },
    ],
    dueDate: "Tomorrow",
    estimatedHours: "8h",
    stage: "ongoing",
    assignees: [USERS.alex, USERS.elena], // 2 users attached
  },

  // 1 Task in On Hold
  {
    id: "task-4",
    title: "Figma Plugin Asset Sync",
    description: "Waiting on external Figma API marketplace approval before publishing...",
    tags: [
      { label: "Integration", bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
      { label: "Pending", bg: "bg-slate-500/10 dark:bg-slate-500/20", text: "text-slate-600 dark:text-slate-400" },
    ],
    dueDate: "Nov 02",
    estimatedHours: "4h",
    stage: "onhold",
    assignees: [USERS.marcus], // Single user
  },

  // 1 Task in Completed
  {
    id: "task-5",
    title: "Next.js 16 App Router Audit",
    description: "Optimized server component rendering bundle sizes and dynamic segments...",
    tags: [
      { label: "Core", bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
    ],
    dueDate: "Yesterday",
    estimatedHours: "14h",
    stage: "completed",
    assignees: [USERS.sarah, USERS.elena, USERS.alex], // 3 users attached (~70% visible each)
  },
];

// High-fidelity Oversized Hand Cursor (open hand & grabbing fist)
function BigHandCursor({ isGrabbing }: { isGrabbing: boolean }) {
  if (isGrabbing) {
    // Grabbing / Clenched Hand Cursor (Bigger than normal: 48px)
    return (
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        className="filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] transition-transform duration-200 scale-95"
      >
        <path
          d="M7 11V8C7 6.9 7.9 6 9 6C10.1 6 11 6.9 11 8V10H12V8.5C12 7.4 12.9 6.5 14 6.5C15.1 6.5 16 7.4 16 8.5V10H17V9.5C17 8.4 17.9 7.5 19 7.5C20.1 7.5 21 8.4 21 9.5V14C21 17.87 17.87 21 14 21H11C7.13 21 4 17.87 4 14V11.5C4 10.4 4.9 9.5 6 9.5C7.1 9.5 7 10.4 7 11.5V11Z"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 11V13M14 11V13M17 11V13"
          stroke="#0F172A"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Open / Hover Hand Pointer (Bigger than normal: 48px)
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      className="filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] transition-transform duration-200"
    >
      <path
        d="M8.5 11V3.5C8.5 2.67 9.17 2 10 2C10.83 2 11.5 2.67 11.5 3.5V11H12.5V5.5C12.5 4.67 13.17 4 14 4C14.83 4 15.5 4.67 15.5 5.5V11H16.5V7.5C16.5 6.67 17.17 6 18 6C18.83 6 19.5 6.67 19.5 7.5V13.5C19.5 17.64 16.14 21 12 21H11C7.45 21 4.5 18.27 4.07 14.76L3.5 10.2C3.39 9.38 4.03 8.65 4.86 8.56C5.58 8.48 6.27 8.95 6.46 9.65L8.5 17V11Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Single Card View Component
function TaskCardView({
  task,
  isGhost = false,
  isFloating = false,
}: {
  task: HeroTask;
  isGhost?: boolean;
  isFloating?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 sm:p-3 transition-all select-none ${
        isGhost
          ? "opacity-30 border-dashed border-primary bg-primary/5"
          : isFloating
          ? "bg-card border-primary/80 shadow-2xl scale-[1.03] rotate-1 ring-2 ring-primary/40"
          : "bg-card border-border/70 shadow-xs hover:border-border hover:shadow-sm"
      }`}
    >
      {/* Title */}
      <h4 className="text-xs sm:text-[13px] font-semibold text-foreground leading-snug tracking-tight mb-1 truncate">
        {task.title}
      </h4>

      {/* Description with ellipsis pattern */}
      <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mb-2">
        {task.description}
      </p>

      {/* Tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {task.tags.map((tag, idx) => (
          <span
            key={idx}
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${tag.bg} ${tag.text}`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Footer: Due date, hours, avatars */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-muted-foreground/80" />
            <span>{task.dueDate}</span>
          </div>
          <div className="inline-flex items-center gap-1 font-medium text-foreground/80">
            <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
            <span>{task.estimatedHours}</span>
          </div>
        </div>

        {/* Assigned Avatar Display */}
        <div className="shrink-0 flex items-center">
          {task.assignees.length === 1 ? (
            /* Single User: Full round profile logo without name */
            <div className="w-5 h-5 rounded-full overflow-hidden ring-1.5 ring-card shadow-2xs">
              {task.assignees[0].avatarUrl ? (
                <img
                  src={task.assignees[0].avatarUrl}
                  alt="Assignee"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full ${task.assignees[0].bgColor} text-white flex items-center justify-center text-[9px] font-bold`}
                >
                  {task.assignees[0].initials}
                </div>
              )}
            </div>
          ) : (
            /* Multiple Users (2 or max 3): Attached circles showing ~70% of each */
            <div className="flex -space-x-1.5 overflow-hidden items-center">
              {task.assignees.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="w-5 h-5 rounded-full overflow-hidden ring-1.5 ring-card shadow-2xs shrink-0"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Assignee"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${user.bgColor} text-white flex items-center justify-center text-[8px] font-bold`}
                    >
                      {user.initials}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroKanbanBoard() {
  const [tasks, setTasks] = useState<HeroTask[]>(INITIAL_TASKS);
  const [countdown, setCountdown] = useState<number>(20);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activeTargetStage, setActiveTargetStage] = useState<Stage | null>(null);

  // Simulated drag states
  const [dragState, setDragState] = useState<{
    task: HeroTask;
    currentPos: { x: number; y: number };
    cardSize: { width: number; height: number };
    isGrabbing: boolean;
    isCardVisible: boolean;
    opacity: number;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<Stage, HTMLDivElement | null>>({
    todo: null,
    ongoing: null,
    onhold: null,
    completed: null,
  });
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Cycle counter to step through transitions systematically
  const stepIndexRef = useRef<number>(0);

  // Perform full visual simulated drag-and-drop animation
  const triggerDragAndDropAnimation = useCallback(() => {
    if (isAnimating || !boardRef.current) return;

    // Determine which task to move and to which target stage
    const currentTasks = tasks;
    const todoTasks = currentTasks.filter((t) => t.stage === "todo");
    const ongoingTasks = currentTasks.filter((t) => t.stage === "ongoing");
    const onHoldTasks = currentTasks.filter((t) => t.stage === "onhold");
    const completedTasks = currentTasks.filter((t) => t.stage === "completed");

    let movingTask: HeroTask | null = null;
    let targetStage: Stage = "ongoing";

    const step = stepIndexRef.current % 4;
    stepIndexRef.current += 1;

    if (step === 0 && todoTasks.length > 0) {
      movingTask = todoTasks[0];
      targetStage = "ongoing";
    } else if (step === 1 && ongoingTasks.length > 0) {
      movingTask = ongoingTasks[0];
      targetStage = "completed";
    } else if (step === 2 && onHoldTasks.length > 0) {
      movingTask = onHoldTasks[0];
      targetStage = "ongoing";
    } else if (completedTasks.length > 0) {
      movingTask = completedTasks[0];
      targetStage = "todo";
    } else if (todoTasks.length > 0) {
      movingTask = todoTasks[0];
      targetStage = "ongoing";
    }

    if (!movingTask) return;

    const sourceCardElem = cardRefs.current[movingTask.id];
    const targetColElem = columnRefs.current[targetStage];

    if (!sourceCardElem || !targetColElem) {
      // Direct fallback update if elements aren't measured
      setTasks((prev) =>
        prev.map((t) => (t.id === movingTask!.id ? { ...t, stage: targetStage } : t))
      );
      return;
    }

    setIsAnimating(true);

    const boardRect = boardRef.current.getBoundingClientRect();
    const sourceRect = sourceCardElem.getBoundingClientRect();
    const targetRect = targetColElem.getBoundingClientRect();

    const startX = sourceRect.left - boardRect.left;
    const startY = sourceRect.top - boardRect.top;
    const cardWidth = sourceRect.width;
    const cardHeight = sourceRect.height;

    // Target position inside destination column
    const endX = targetRect.left - boardRect.left + 12;
    const endY = targetRect.top - boardRect.top + 48;

    // Phase 1: Cursor enters over the card (Hand appears)
    setDragState({
      task: movingTask,
      currentPos: { x: startX + cardWidth / 2 + 30, y: startY + cardHeight / 2 + 30 },
      cardSize: { width: cardWidth, height: cardHeight },
      isGrabbing: false,
      isCardVisible: false,
      opacity: 0,
    });

    // 1a. Move cursor smoothly onto card center & fade in
    setTimeout(() => {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentPos: { x: startX + cardWidth / 2, y: startY + cardHeight / 2 },
              opacity: 1,
            }
          : null
      );
    }, 50);

    // Phase 2: Grab the card (Hand clenches, floating card lifts)
    setTimeout(() => {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              isGrabbing: true,
              isCardVisible: true,
            }
          : null
      );
    }, 450);

    // Phase 3: Drag smoothly across to target column (950ms ease glide)
    setTimeout(() => {
      setActiveTargetStage(targetStage);
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentPos: { x: endX + cardWidth / 2, y: endY + cardHeight / 2 },
            }
          : null
      );
    }, 750);

    // Phase 4: Drop card into column (Hand opens, dropzone pulses)
    setTimeout(() => {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              isGrabbing: false,
              isCardVisible: false,
            }
          : null
      );

      // Settle card into new stage state
      setTasks((prev) =>
        prev.map((t) => (t.id === movingTask!.id ? { ...t, stage: targetStage } : t))
      );
      setActiveTargetStage(null);
    }, 1800);

    // Phase 5: Fade out hand cursor and complete
    setTimeout(() => {
      setDragState((prev) => (prev ? { ...prev, opacity: 0 } : null));
    }, 2100);

    setTimeout(() => {
      setDragState(null);
      setIsAnimating(false);
      setCountdown(20);
    }, 2450);
  }, [isAnimating, tasks]);

  // 20-second automatic timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAnimating) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          triggerDragAndDropAnimation();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnimating, triggerDragAndDropAnimation]);

  const handleReset = () => {
    setTasks(INITIAL_TASKS);
    setCountdown(20);
    setDragState(null);
    setIsAnimating(false);
  };

  return (
    <div ref={boardRef} className="w-full relative select-none">
      {/* Decorative ambient background blur */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-60 dark:opacity-30 pointer-events-none" />

      {/* Main Kanban Frame */}
      <div className="relative rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Top Window Navigation Bar */}
        <div className="px-3 sm:px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2">
          {/* Traffic lights & Board title */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-3.5 w-px bg-border/80" />
            <span className="text-xs font-semibold text-foreground tracking-tight">
              Sprint Board
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              Auto-syncs every 20s
            </span>
          </div>

          {/* Action & Countdown Trigger */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                if (!isAnimating) {
                  triggerDragAndDropAnimation();
                }
              }}
              disabled={isAnimating}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 text-[11px] font-medium transition-colors disabled:opacity-50"
              title="Click to trigger animated drag & drop now"
            >
              <Play className="w-2.5 h-2.5 text-primary fill-primary" />
              <span>Next move in {countdown}s</span>
            </button>

            <button
              onClick={handleReset}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Reset board"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 4 Funnels Grid */}
        <div className="p-3 sm:p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map((col) => {
            const columnTasks = tasks.filter((t) => t.stage === col.id);
            const isHighlightedDrop = activeTargetStage === col.id;

            return (
              <div
                key={col.id}
                ref={(el) => {
                  columnRefs.current[col.id] = el;
                }}
                className={`flex flex-col rounded-xl bg-muted/25 border p-2 sm:p-2.5 transition-all duration-300 min-h-[220px] ${
                  isHighlightedDrop
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border/50"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-bold text-foreground">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-muted text-foreground border border-border/60">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="flex flex-col gap-2 flex-1">
                  {columnTasks.map((task) => {
                    const isBeingDragged =
                      dragState?.isCardVisible && dragState?.task.id === task.id;

                    return (
                      <div
                        key={task.id}
                        ref={(el) => {
                          cardRefs.current[task.id] = el;
                        }}
                      >
                        <TaskCardView task={task} isGhost={isBeingDragged} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Animated Dragged Card & Oversized Hand Cursor */}
        {dragState && (
          <div
            className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300"
            style={{ opacity: dragState.opacity }}
          >
            {/* The Floating Card being dragged */}
            {dragState.isCardVisible && (
              <div
                className="absolute transition-all duration-900 ease-in-out"
                style={{
                  left: `${dragState.currentPos.x - dragState.cardSize.width / 2}px`,
                  top: `${dragState.currentPos.y - dragState.cardSize.height / 2}px`,
                  width: `${dragState.cardSize.width}px`,
                }}
              >
                <TaskCardView task={dragState.task} isFloating />
              </div>
            )}

            {/* The Oversized Hand Cursor */}
            <div
              className="absolute transition-all duration-900 ease-in-out"
              style={{
                left: `${dragState.currentPos.x - 14}px`,
                top: `${dragState.currentPos.y - 12}px`,
              }}
            >
              <BigHandCursor isGrabbing={dragState.isGrabbing} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
