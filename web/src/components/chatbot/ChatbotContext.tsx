"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const CHATBOT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


export interface TaskItemAction {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "review";
  priority: "Low" | "Medium" | "High" | "Urgent";
  due: string;
  assignee?: string;
}

export interface ChatActionCard {
  type: "task_preview" | "task_list" | "task_summary" | "task_reassign";
  title?: string;
  status?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  assignee?: string;
  dueDate?: string;
  project?: string;
  tags?: string[];
  tasks?: TaskItemAction[];
  executed?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  content: string;
  actionCard?: ChatActionCard;
}

interface ChatbotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleChatbot: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  executeAction: (messageId: string) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    sender: "assistant",
    timestamp: "Just now",
    content: "👋 Hello! I'm your AI Task Copilot. I can execute operations across your tasks, projects, and team workflows directly from your prompt. What would you like to do?",
  }
];

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);

  // Global shortcut to toggle chatbot (Cmd+J or Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleChatbot = () => setIsOpen((prev) => !prev);

  const clearMessages = () => {
    setMessages(INITIAL_MESSAGES);
  };

  const executeAction = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.actionCard) {
          return {
            ...msg,
            actionCard: {
              ...msg.actionCard,
              executed: true,
            },
          };
        }
        return msg;
      })
    );

    // Add confirmation response
    const confirmMessage: ChatMessage = {
      id: `confirm-${Date.now()}`,
      sender: "assistant",
      timestamp: "Just now",
      content: "✅ Operation confirmed and applied to your workspace!",
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: "Just now",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Call the real AI chatbot API
      const res = await fetch(`${CHATBOT_API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends HttpOnly cookie for browser sessions
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`Chatbot API error: ${res.status}`);
      }

      const data = await res.json();

      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        timestamp: "Just now",
        content: data.message || "I completed your request.",
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      // Graceful fallback: show error message in chat
      const errorResponse: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        sender: "assistant",
        timestamp: "Just now",
        content: "⚠️ I couldn't connect to the AI service right now. Please make sure the API server is running and try again.",
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleChatbot,
        messages,
        isTyping,
        sendMessage,
        clearMessages,
        executeAction,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

const defaultContext: ChatbotContextType = {
  isOpen: false,
  setIsOpen: () => {},
  toggleChatbot: () => {},
  messages: [],
  isTyping: false,
  sendMessage: () => {},
  clearMessages: () => {},
  executeAction: () => {},
};

export function useChatbot() {
  const context = useContext(ChatbotContext);
  return context || defaultContext;
}
