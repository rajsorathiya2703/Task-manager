"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  PanelLeft, 
  PanelRight, 
  Save, 
  Loader2, 
  Check, 
  X,
  FolderPlus
} from "lucide-react";
import { ProjectMainContent } from "@/src/components/projects/ProjectMainContent";
import { ProjectActivityPanel } from "@/src/components/projects/ProjectActivityPanel";
import { createProject } from "@/src/lib/api";
import { useCompanyPath, CompanyLink } from "@/src/lib/useCompanyPath";
import { useAccessControl } from "@/src/contexts/AccessContext";
import { AccessDenied } from "@/src/components/access";
import { useSidebar } from "@/src/components/layout/SidebarContext";

export default function NewProjectPage() {
  const router = useRouter();
  const cp = useCompanyPath();
  const { can, loading: accessLoading } = useAccessControl();
  const { isOpen, toggleSidebar } = useSidebar();
  const canCreate = can("projects", "create");

  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    status: "To Do",
    priority: "Medium",
    color: "#3b82f6",
    teamId: undefined,
    startDate: undefined,
    dueDate: undefined,
    updates: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!canCreate) return;
    if (!projectData.name.trim()) {
      alert("Project name is required.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        status: projectData.status,
        priority: projectData.priority,
        color: projectData.color,
        ...(projectData.teamId ? { teamId: projectData.teamId } : {}),
        ...(projectData.startDate ? { startDate: projectData.startDate } : {}),
        ...(projectData.dueDate ? { dueDate: projectData.dueDate } : {}),
      };

      const created = await createProject(payload);
      const targetId = created?._id || created?.id;
      if (targetId) {
        router.push(cp(`/projects/${targetId}`));
      } else {
        router.push(cp("/projects"));
      }
    } catch (err: any) {
      console.error("Failed to create project", err);
      alert(err?.response?.data?.message || "Failed to create project");
    } finally {
      setIsSaving(false);
    }
  };

  if (!accessLoading && !canCreate) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
        <AccessDenied
          module="projects"
          action="create"
          message="You do not have permission to create projects. Contact your administrator if you need access."
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
            <CompanyLink href="/projects" className="hover:text-foreground transition-colors">
              Projects
            </CompanyLink>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-semibold max-w-[220px] md:max-w-[320px] truncate">
              {projectData.name || "New Project"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CompanyLink
            href="/projects"
            className="flex items-center gap-1.5 h-8 px-3 border border-border/80 rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-xs text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
          >
            <span>Cancel</span>
          </CompanyLink>

          <button
            onClick={handleSave}
            disabled={isSaving || !projectData.name.trim() || !canCreate}
            className="flex items-center gap-1.5 h-8 px-3.5 border border-transparent rounded-lg transition-all bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum shadow-xs text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? "Saving..." : "Create Project"}</span>
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

      {/* Main Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column: Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <ProjectMainContent
              projectData={projectData}
              setProjectData={setProjectData}
              isEditable={canCreate}
              isNew={true}
            />
          </div>
        </div>

        {/* Right Column: Activity Panel (Updates Only) */}
        {isRightPanelOpen && (
          <div className="w-[380px] lg:w-[420px] shrink-0 h-full overflow-hidden">
            <ProjectActivityPanel updates={projectData.updates} />
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
