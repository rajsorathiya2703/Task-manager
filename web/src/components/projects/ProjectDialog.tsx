"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle, Popover } from "@headlessui/react";
import { 
  X, 
  CalendarDays, 
  Check, 
  Trash2, 
  ExternalLink, 
  Folder, 
  Shield, 
  Search, 
  ChevronDown 
} from "lucide-react";
import { Project } from "../../lib/data";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { formatDisplayDate } from "../../lib/utils";
import { useRouter } from "next/navigation";
import { fetchTeams } from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionsContext";

export const PROJECT_COLORS = [
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500", light: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Indigo", value: "#6366f1", bg: "bg-indigo-500", light: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-500", light: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { name: "Rose", value: "#f43f5e", bg: "bg-rose-500", light: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { name: "Amber", value: "#f59e0b", bg: "bg-amber-500", light: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "Emerald", value: "#10b981", bg: "bg-emerald-500", light: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { name: "Cyan", value: "#06b6d4", bg: "bg-cyan-500", light: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { name: "Slate", value: "#64748b", bg: "bg-slate-500", light: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
];

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  onSave: (projectData: Partial<Project>) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
}

export function ProjectDialog({
  isOpen,
  onClose,
  project,
  onSave,
  onDelete,
}: ProjectDialogProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const isEditing = Boolean(project?.id || (project as any)?._id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("To Do");
  const [priority, setPriority] = useState<string>("Medium");
  const [color, setColor] = useState("#3b82f6");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Teams dropdown state
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTeams()
        .then((data) => setTeams(data || []))
        .catch((err) => console.error("Failed to load teams in ProjectDialog", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStatus(project.status || "To Do");
      setPriority(project.priority || "Medium");
      setColor(project.color || "#3b82f6");
      const teamVal = (project.teamId && typeof project.teamId === 'object') ? project.teamId._id : project.teamId;
      setSelectedTeamId(teamVal || null);
      setDateRange({
        from: project.startDate ? new Date(project.startDate) : (project.dueDate ? new Date(project.dueDate) : undefined),
        to: project.dueDate ? new Date(project.dueDate) : undefined,
      });
    } else {
      setName("");
      setDescription("");
      setStatus("To Do");
      setPriority("Medium");
      setColor("#3b82f6");
      setSelectedTeamId(null);
      setDateRange(undefined);
    }
    setTeamSearch("");
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        status,
        priority,
        color,
        teamId: selectedTeamId || undefined,
        startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
        dueDate: dateRange?.to ? dateRange.to.toISOString() : (dateRange?.from ? dateRange.from.toISOString() : undefined),
      });
      onClose();
    } catch (err) {
      console.error("Failed to save project", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const targetId = project?.id || (project as any)?._id;
    if (!targetId || !onDelete) return;
    if (confirm("Are you sure you want to delete this project? Tasks inside this project will remain.")) {
      try {
        setIsDeleting(true);
        await onDelete(targetId);
        onClose();
      } catch (err) {
        console.error("Failed to delete project", err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleOpenTasks = () => {
    const targetId = project?.id || (project as any)?._id;
    if (targetId) {
      onClose();
      router.push(`/projects/${targetId}`);
    }
  };

  const initialLetter = (name.trim() ? name.trim().charAt(0) : "P").toUpperCase();
  const selectedTeam = teams.find((t) => t._id === selectedTeamId) || (project?.teamId && typeof project.teamId === 'object' ? project.teamId : null);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" />

      {/* Dialog container */}
      <div className="fixed inset-0 z-10 overflow-y-auto flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              {/* Color Avatar Preview */}
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all"
                style={{ backgroundColor: color }}
              >
                {initialLetter}
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {isEditing ? "Project Details" : "Create New Project"}
              </DialogTitle>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. Website Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
              />
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Description
              </label>
              <textarea 
                rows={3}
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-foreground"
              />
            </div>

            {/* Color Mode / Badge Selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Project Color</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Visible as project avatar badge
                </span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      color === c.value 
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110 shadow-sm" 
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned Team Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Assigned Team
                </label>
                {selectedTeamId && (
                  <button
                    type="button"
                    onClick={() => setSelectedTeamId(null)}
                    className="text-[11px] text-muted-foreground hover:text-red-500 font-normal transition-colors"
                  >
                    Clear team
                  </button>
                )}
              </div>
              <Popover className="relative">
                <Popover.Button className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground hover:bg-muted/30 transition-colors outline-none focus:border-primary">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                      selectedTeam ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedTeam ? selectedTeam.name?.charAt(0)?.toUpperCase() : <Shield className="w-3.5 h-3.5" />}
                    </div>
                    {selectedTeam ? (
                      <span className="font-semibold text-foreground truncate">{selectedTeam.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Select team...</span>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                </Popover.Button>

                <Popover.Panel className="absolute left-0 top-full mt-1.5 w-full bg-card border border-border rounded-xl shadow-xl z-50 outline-none overflow-hidden">
                  {({ close }) => (
                    <>
                      {/* Search */}
                      <div className="p-2 border-b border-border">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <input
                            type="text"
                            placeholder="Search teams..."
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            className="bg-transparent outline-none text-xs w-full text-foreground placeholder:text-muted-foreground"
                            autoFocus
                          />
                        </div>
                      </div>
                      {/* Team list */}
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {teams
                          .filter((t) => {
                            const q = teamSearch.toLowerCase();
                            return !q || (t.name || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
                          })
                          .map((t) => {
                            const isSelected = (selectedTeam?._id || selectedTeamId) === t._id;
                            return (
                              <button
                                key={t._id}
                                type="button"
                                onClick={() => {
                                  setSelectedTeamId(t._id);
                                  setTeamSearch("");
                                  close();
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left ${
                                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground'
                                }`}
                              >
                                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                  {t.name?.charAt(0)?.toUpperCase() || "T"}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <div className="text-xs font-semibold truncate">
                                    {t.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {t.members?.length || 0} members {t.teamLead ? `· Lead: ${t.teamLead.fullName?.firstName || ''}` : ''}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        {teams.length === 0 && (
                          <div className="text-center py-5 text-xs text-muted-foreground">
                            No teams available. Create a team in Configuration.
                          </div>
                        )}
                        {teams.length > 0 && teams.filter(t => !teamSearch || (t.name || "").toLowerCase().includes(teamSearch.toLowerCase())).length === 0 && (
                          <div className="text-center py-5 text-xs text-muted-foreground">
                            No matching teams found.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </Popover.Panel>
              </Popover>
            </div>

            {/* Status & Priority Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all text-foreground"
                >
                  <option value="To Do">To Do</option>
                  <option value="Doing">Doing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all text-foreground"
                >
                  <option value="No Priority">No Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">Urgent / High</option>
                </select>
              </div>
            </div>

            {/* Dates (Range Picker) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Timeline / Due Date</label>
              <Popover className="relative">
                <Popover.Button className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground hover:bg-muted/30 transition-colors outline-none focus:border-primary">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {formatDisplayDate(
                        dateRange?.from?.toISOString(), 
                        dateRange?.to?.toISOString()
                      ) || "Select timeline..."}
                    </span>
                  </div>
                  {dateRange?.from && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateRange(undefined);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-red-500 px-1 font-semibold"
                    >
                      Clear
                    </span>
                  )}
                </Popover.Button>
                <Popover.Panel anchor="bottom start" className="bg-card border border-border rounded-xl shadow-xl z-50 p-2 outline-none mt-1">
                  <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-muted-foreground border-b border-border">
                    Select Start Date → Due Date
                  </div>
                  <DayPicker
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range: any) => setDateRange(range)}
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
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
              <div>
                {isEditing && onDelete && can('projects', 'delete') && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleOpenTasks}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                    Open Tasks
                    <ExternalLink className="w-3 h-3 ml-0.5 text-muted-foreground" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
