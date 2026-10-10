"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { SidebarProvider } from "@/src/components/layout/SidebarContext";
import { ChatbotProvider } from "@/src/components/chatbot/ChatbotContext";
import { TaskChatbot } from "@/src/components/chatbot/TaskChatbot";
import { ChatbotTrigger } from "@/src/components/chatbot/ChatbotTrigger";
import { fetchMe } from "@/src/lib/api";
import { useCompany } from "@/src/contexts/CompanyContext";
import { MobileRestrictionNotice } from "@/src/components/common/MobileRestrictionNotice";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { slug } = useCompany();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!slug) return;

    fetchMe(slug)
      .then((data) => {
        if (!mounted) return;
        const isMember = Boolean(
          data?.membership ||
          data?.memberships?.some(
            (m: any) => m.companySlug?.toLowerCase() === slug.toLowerCase()
          )
        );
        if (!isMember) {
          router.replace(`/${slug}/join`);
          return;
        }
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        if (mounted) {
          console.warn(`Session check failed for ${slug}, redirecting to /${slug}/login`, err);
          router.replace(`/${slug}/login`);
        }
      });

    return () => {
      mounted = false;
    };
  }, [slug, router]);

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
          <MobileRestrictionNotice />
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

