"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../../src/components/layout/Sidebar";
import { SidebarProvider } from "../../src/components/layout/SidebarContext";
import { ChatbotProvider } from "../../src/components/chatbot/ChatbotContext";
import { TaskChatbot } from "../../src/components/chatbot/TaskChatbot";
import { ChatbotTrigger } from "../../src/components/chatbot/ChatbotTrigger";
import { fetchMe } from "../../src/lib/api";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((data) => {
        if (mounted) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.warn("Session check failed, redirecting to /login", err);
          router.replace("/login");
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ChatbotProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar user={user} />
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
            {children}
          </main>
          <TaskChatbot />
          <ChatbotTrigger />
        </div>
      </ChatbotProvider>
    </SidebarProvider>
  );
}

