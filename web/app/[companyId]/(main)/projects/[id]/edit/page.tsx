"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  PanelLeft, 
  PanelRight, 
  Check, 
  X, 
  Loader2, 
  Folder, 
  ExternalLink 
} from "lucide-react";
import { ProjectMainContent } from "@/src/components/projects/ProjectMainContent";
import { ProjectActivityPanel } from "@/src/components/projects/ProjectActivityPanel";
import { RecordNavigator } from "@/src/components/common/RecordNavigator";
import { fetchProjectById, fetchProjects, updateProject, deleteProject } from "@/src/lib/api";
import { useCompanyPath, CompanyLink } from "@/src/lib/useCompanyPath";
import { useAccessControl } from "@/src/contexts/AccessContext";
import { AccessDenied } from "@/src/components/access";
import { useSidebar } from "@/src/components/layout/SidebarContext";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const cp = useCompanyPath();
  const { can, loading: accessLoading } = useAccessControl();
  const { isOpen, toggleSidebar } = useSidebar();

  const canUpdate = can("projects", "update");
  const canDelete = can("projects", "delete");

  const [projectData, setProjectData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [allProjectIds, setAllProjectIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [proj, all] = await Promise.all([
        fetchProjectById(id),
        fetchProjects(),
      ]);

      if (!proj) {
        setAccessDenied(true);
        return;
      }

      setProjectData(proj);
      setOriginalData(proj);

      if (Array.isArray(all)) {
        setAllProjectIds(all.map((p: any) => p._id || p.id));
      }
    } catch (err: any) {
      console.error("Failed to load project", err);
      if (err?.response?.status === 403) {
        setAccessDenied(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // Dirty checking
  const hasChanges = Boolean(
    originalData &&
    projectData &&
    canUpdate &&
    (() => {
      if ((projectData.name || "").trim() !== (originalData.name || "").trim()) return true;
      if ((projectData.description || "").trim() !== (originalData.description || "").trim()) return true;
      if ((projectData.status || "To Do") !== (originalData.status || "To Do")) return true;
      if ((projectData.priority || "Medium") !== (originalData.priority || "Medium")) return true;
      if ((projectData.color || "#3b82f6") !== (originalData.color || "#3b82f6")) return true;

      const curTeam = typeof projectData.teamId === 'object' ? (projectData.teamId?._id || projectData.teamId?.id) : projectData.teamId;
      const origTeam = typeof originalData.teamId === 'object' ? (originalData.teamId?._id || originalData.teamId?.id) : originalData.teamId;
      if (String(curTeam || "") !== String(origTeam || "")) return true;

      const curStart = projectData.startDate ? new Date(projectData.startDate).getTime() : null;
      const origStart = originalData.startDate ? new Date(originalData.startDate).getTime() : null;
      if (curStart !== origStart) return true;

      const curDue = projectData.dueDate ? new Date(projectData.dueDate).getTime() : null;
      const origDue = originalData.dueDate ? new Date(originalData.dueDate).getTime() : null;
      if (curDue !== origDue) return true;

      return false;
    })()
  );

  const handleDiscard = () => {
    if (originalData) {
      setProjectData({ ...originalData });
    }
  };

  const handleUpdate = async () => {
    if (!canUpdate || !projectData.name?.trim()) return;

    try {
      setIsSaving(true);
      const updatePayload: any = {};
      if ((projectData.name || "").trim() !== (originalData?.name || "").trim()) {
        updatePayload.name = projectData.name.trim();
      }
      if ((projectData.description || "").trim() !== (originalData?.description || "").trim()) {
        updatePayload.description = projectData.description.trim();
      }
      if ((projectData.status || "To Do") !== (originalData?.status || "To Do")) {
        updatePayload.status = projectData.status;
      }
      if ((projectData.priority || "Medium") !== (originalData?.priority || "Medium")) {
        updatePayload.priority = projectData.priority;
      }
      if ((projectData.color || "#3b82f6") !== (originalData?.color || "#3b82f6")) {
        updatePayload.color = projectData.color;
      }

      const curTeam = typeof projectData.teamId === 'object' ? (projectData.teamId?._id || projectData.teamId?.id) : projectData.teamId;
      const origTeam = typeof originalData?.teamId === 'object' ? (originalData?.teamId?._id || originalData?.teamId?.id) : originalData?.teamId;
      if (String(curTeam || "") !== String(origTeam || "")) {
        updatePayload.teamId = curTeam || null;
      }

      const curStart = projectData.startDate ? new Date(projectData.startDate).getTime() : null;
      const origStart = originalData?.startDate ? new Date(originalData.startDate).getTime() : null;
      if (curStart !== origStart) {
        updatePayload.startDate = projectData.startDate || null;
      }

      const curDue = projectData.dueDate ? new Date(projectData.dueDate).getTime() : null;
      const origDue = originalData?.dueDate ? new Date(originalData.dueDate).getTime() : null;
      if (curDue !== origDue) {
        updatePayload.dueDate = projectData.dueDate || null;
      }

      const updated = await updateProject(id, updatePayload);
      if (updated) {
        setProjectData(updated);
        setOriginalData(updated);
        setToastMessage("Project updated successfully");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Failed to update project", err);
      alert(err?.response?.data?.message || "Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (confirm("Are you sure you want to delete this project? Tasks in this project will remain.")) {
      try {
        setIsDeleting(true);
        await deleteProject(id);
        router.push(cp("/projects"));
      } catch (err: any) {
        console.error("Failed to delete project", err);
        alert(err?.response?.data?.message || "Failed to delete project");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const projectIndex = allProjectIds.indexOf(id);
  const totalProjects = allProjectIds.length;
  const currentProjectNum = projectIndex >= 0 ? projectIndex + 1 : 1;

  const navigateToProject = (targetId: string) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard and navigate to the other project?")) {
        return;
      }
    }
    router.push(cp(`/projects/${targetId}/edit`));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center">
        <AccessDenied
          module="projects"
          action="read"
          message="You do not have permission to view or edit this project."
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
              {projectData?.name || "Edit Project"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalProjects > 1 && (
            <RecordNavigator
              current={currentProjectNum}
              total={totalProjects}
              onPrev={() => navigateToProject(allProjectIds[projectIndex - 1])}
              onNext={() => navigateToProject(allProjectIds[projectIndex + 1])}
              hasPrev={projectIndex > 0}
              hasNext={projectIndex >= 0 && projectIndex < totalProjects - 1}
            />
          )}

          {/* Quick link to project board */}
          <CompanyLink
            href={`/projects/${id}`}
            className="flex items-center gap-1.5 h-8 px-3 border border-border/80 rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-xs text-xs font-semibold text-foreground cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Tasks Board</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </CompanyLink>

          {/* Save / Discard buttons when changes detected */}
          {hasChanges && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button 
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-8 px-3 border border-border/80 rounded-lg hover:bg-muted/50 transition-colors bg-card shadow-xs text-muted-foreground hover:text-foreground text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSaving || !projectData?.name?.trim() || !canUpdate}
                className="flex items-center gap-1.5 h-8 px-3.5 border border-transparent rounded-lg transition-all bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum shadow-xs text-xs font-semibold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? "Updating..." : "Update Project"}</span>
              </button>
            </div>
          )}

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
              projectId={id}
              projectData={projectData}
              setProjectData={setProjectData}
              isEditable={canUpdate}
              isNew={false}
              onDelete={canDelete ? handleDelete : undefined}
              isDeleting={isDeleting}
            />
          </div>
        </div>

        {/* Right Column: Activity Panel (Updates Only) */}
        {isRightPanelOpen && (
          <div className="w-[380px] lg:w-[420px] shrink-0 h-full overflow-hidden">
            <ProjectActivityPanel updates={projectData?.updates || []} projectId={id} />
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
