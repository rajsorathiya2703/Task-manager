import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "../../src/components/layout/Sidebar";
import { SidebarProvider } from "../../src/components/layout/SidebarContext";
import { ChatbotProvider } from "../../src/components/chatbot/ChatbotContext";
import { TaskChatbot } from "../../src/components/chatbot/TaskChatbot";
import { ChatbotTrigger } from "../../src/components/chatbot/ChatbotTrigger";
import { API_URL } from "../../src/lib/api";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  let user = null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Cookie: `access_token=${token}`,
      },
    });
    
    if (!res.ok) {
      throw new Error("Unauthorized");
    }
    
    user = await res.json();
  } catch (err) {
    redirect("/login");
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
