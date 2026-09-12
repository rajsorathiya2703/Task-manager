"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  Tag, 
  ArrowRight, 
  Layers, 
  ChevronRight,
  ChevronLeft,
  Flame,
  Check,
  Zap,
  SlidersHorizontal,
  FolderGit2
} from "lucide-react";
import { useChatbot, ChatMessage, TaskItemAction } from "./ChatbotContext";

const SUGGESTED_OPERATIONS = [
  { label: "⚡ Create urgent task", prompt: "Create urgent task: Fix OAuth Google token expiration" },
  { label: "📋 Show overdue tasks", prompt: "Show all overdue tasks across all projects" },
  { label: "📊 Summarize sprint", prompt: "Summarize current tasks progress and blockers" },
  { label: "🔄 Rebalance workload", prompt: "Reassign pending tickets to balance team workload" },
];

export function TaskChatbot() {
  const { isOpen, setIsOpen, messages, isTyping, sendMessage, clearMessages, executeAction } = useChatbot();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return null;
  }

  const getPriorityBadge = (priority: TaskItemAction["priority"] | string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "High":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "Medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "done":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "in_progress":
      case "in progress":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "review":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
        onClick={() => setIsOpen(false)}
      />

      {/* Full-Height Right-Side Chatbot Panel */}
      <aside 
        className="fixed lg:static inset-y-0 right-0 z-50 w-full sm:w-[380px] lg:w-[400px] h-screen bg-card border-l border-border flex flex-col shadow-2xl lg:shadow-none shrink-0 transition-all duration-300 ease-in-out select-none"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border/70 flex items-center justify-between bg-card/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-sm">
              <Bot className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm text-foreground tracking-tight truncate">
                  AI Task Copilot
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 font-medium bg-primary/10 text-primary rounded-full uppercase tracking-wider">
                  Ops
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Interactive workspace operator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearMessages}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Collapse AI Copilot"
            >
              <ChevronRight className="w-4 h-4 hidden sm:block" />
              <X className="w-4 h-4 sm:hidden" />
            </button>
          </div>
        </div>

        {/* Quick Operations Bar */}
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5">
            {SUGGESTED_OPERATIONS.map((op, i) => (
              <button
                key={i}
                onClick={() => sendMessage(op.prompt)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border border-border/70 bg-card hover:bg-muted hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all shrink-0"
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {/* Message Meta */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                {msg.sender === "assistant" && (
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                )}
                <span>{msg.sender === "assistant" ? "Task Copilot" : "You"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl max-w-[92%] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs shadow-sm"
                    : "bg-muted/70 text-foreground border border-border/50 rounded-bl-xs shadow-xs"
                }`}
              >
                {msg.content}
              </div>

              {/* Action Card Render */}
              {msg.actionCard && (
                <div className="w-full max-w-[95%] mt-2.5 p-3 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-xs text-foreground">
                        {msg.actionCard.title || "Operation Details"}
                      </span>
                    </div>
                    {msg.actionCard.tags && (
                      <div className="flex items-center gap-1">
                        {msg.actionCard.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Task Preview Format */}
                  {msg.actionCard.type === "task_preview" && (
                    <div className="space-y-2 text-xs">
                      <div className="font-medium text-foreground text-sm">
                        {msg.actionCard.title}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 py-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
                          <span>Status:</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getStatusBadge(msg.actionCard.status || "todo")}`}>
                            {msg.actionCard.status || "To Do"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Flame className="w-3 h-3 text-muted-foreground" />
                          <span>Priority:</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${getPriorityBadge(msg.actionCard.priority || "Medium")}`}>
                            {msg.actionCard.priority || "Medium"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate">{msg.actionCard.assignee || "Unassigned"}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate">{msg.actionCard.dueDate || "No date"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-2">
                        {msg.actionCard.executed ? (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 py-1 px-2 bg-emerald-500/10 rounded-md">
                            <Check className="w-3.5 h-3.5" />
                            <span>Created in Workspace</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => executeAction(msg.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-xs"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Confirm & Create</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task List / Summary Format */}
                  {(msg.actionCard.type === "task_list" || msg.actionCard.type === "task_summary" || msg.actionCard.type === "task_reassign") && msg.actionCard.tasks && (
                    <div className="space-y-1.5">
                      {msg.actionCard.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-mono text-muted-foreground">{task.id}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded border font-medium ${getPriorityBadge(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="font-medium text-foreground truncate">{task.title}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-muted-foreground block">{task.due}</span>
                            <span className="text-[10px] text-foreground font-medium truncate block max-w-[80px]">
                              {task.assignee || "Assignee"}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {msg.actionCard.tasks.length} tasks ready
                        </span>
                        {msg.actionCard.executed ? (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 py-1 px-2 bg-emerald-500/10 rounded-md">
                            <Check className="w-3.5 h-3.5" />
                            <span>Changes Applied</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => executeAction(msg.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            <span>Apply Batch Action</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-2xl w-fit border border-border/50">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input & Commands Area */}
        <div className="p-3 border-t border-border/70 bg-card/95 backdrop-blur-md shrink-0">
          <form onSubmit={handleSend} className="space-y-2">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to create, reassign, or list tasks..."
                className="w-full bg-muted/60 hover:bg-muted/80 focus:bg-background border border-border/80 rounded-xl pl-3 pr-10 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="absolute right-1.5 p-1.5 bg-primary text-primary-foreground disabled:opacity-30 disabled:hover:bg-primary rounded-lg transition-all hover:scale-105 active:scale-95"
                title="Send Command"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">⌘J</kbd>
                <span>to toggle anytime</span>
              </span>
              <span>Frontend Action Mockup</span>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
