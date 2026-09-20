"use client";

import { Bot } from "lucide-react";
import { useChatbot } from "./ChatbotContext";

export function ChatbotTrigger() {
  const { isOpen, toggleChatbot } = useChatbot();

  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleChatbot}
        className="group flex items-center gap-2 px-3.5 py-2.5 bg-card/95 backdrop-blur-md border border-border/80 shadow-lg hover:shadow-xl rounded-full text-foreground hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        title="Open AI Task Copilot (Ctrl+J / Cmd+J)"
      >
        <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
          <Bot className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-card animate-pulse" />
        </div>
        <span className="text-xs font-semibold tracking-tight">AI Copilot</span>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded-md hidden sm:inline-block">
          ⌘J
        </span>
      </button>
    </div>
  );
}
