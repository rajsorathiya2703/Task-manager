"use client";

import { useState, useEffect } from "react";
import { 
  Folder, 
  CalendarDays, 
  Check, 
  Trash2, 
  ExternalLink, 
  Shield, 
  Search, 
  ChevronDown, 
  CircleDot, 
  Flag,
  Palette,
  Users
} from "lucide-react";
import { Popover } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { BoundField } from "../access";
import { formatDisplayDate } from "../../lib/utils";
import { fetchTeams } from "../../lib/api";
import { useCompanyPath, CompanyLink } from "../../lib/useCompanyPath";

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

export interface ProjectMainContentProps {
  projectId?: string;
  projectData: any;
  setProjectData: (data: any) => void;
  isEditable: boolean;
  isNew: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ProjectMainContent({
  projectId,
  projectData,
  setProjectData,
  isEditable,
  isNew,
  onDelete,
  isDeleting = false,
}: ProjectMainContentProps) {
  const cp = useCompanyPath();
  const [teams, setTeams] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState("");

  useEffect(() => {
    fetchTeams()
      .then((data) => setTeams(data || []))
      .catch((err) => console.error("Failed to load teams in ProjectMainContent", err));
  }, []);

  const handleChange = (field: string, value: any) => {
    if (!isEditable) return;
    setProjectData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const status = projectData?.status || "To Do";
  const priority = projectData?.priority || "Medium";
  const color = projectData?.color || "#3b82f6";
  const initialLetter = (projectData?.name?.trim() ? projectData.name.trim().charAt(0) : "P").toUpperCase();

  const selectedTeamId = typeof projectData?.teamId === 'object'
    ? (projectData.teamId?._id || projectData.teamId?.id)
    : projectData?.teamId;

  const selectedTeam = teams.find((t) => (t._id || t.id) === selectedTeamId) || 
    (typeof projectData?.teamId === 'object' ? projectData.teamId : null);

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'Completed': return 'bg-emerald-500';
      case 'Doing': return 'bg-blue-500';
      case 'On Hold': return 'bg-red-500';
      default: return 'bg-amber-500';
    }
  };

  const dateRange = {
    from: projectData?.startDate ? new Date(projectData.startDate) : (projectData?.dueDate ? new Date(projectData.dueDate) : undefined),
    to: projectData?.dueDate ? new Date(projectData.dueDate) : undefined,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Color Avatar + Project Title Input */}
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md transition-all mt-1"
          style={{ backgroundColor: color }}
        >
          {initialLetter}
        </div>

        <div className="flex-1 min-w-0">
          <BoundField module="projects" field="name">
            {({ disabled }) => (
              <input
                type="text"
                value={projectData?.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={!isEditable || disabled}
                placeholder="Project Name..."
                className="w-full text-2xl md:text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40 text-foreground p-0 leading-tight tracking-tight disabled:cursor-not-allowed"
              />
            )}
          </BoundField>
          <p className="text-xs text-muted-foreground mt-1">
            {isNew ? "Define project parameters, timeline, and assignment" : "Manage project parameters, stages, and assigned team"}
          </p>
        </div>
      </div>

      {/* Description Field */}
      <BoundField module="projects" field="description">
        {({ disabled }) => (
          <div>
            <textarea
              rows={3}
              value={projectData?.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={!isEditable || disabled}
              placeholder="Add project description, objectives, and scope..."
              className="w-full text-sm bg-muted/20 border border-border/70 rounded-xl p-3 outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50 text-foreground resize-none transition-all disabled:cursor-not-allowed leading-relaxed"
            />
          </div>
        )}
      </BoundField>

      {/* Attributes Grid (2 Columns, matching Task detail styling) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
        {/* Status */}
        <BoundField module="projects" field="status">
          {({ disabled }) => (
            <div className="flex items-center gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 w-28 shrink-0 text-muted-foreground font-medium">
                <CircleDot className="w-4 h-4 text-muted-foreground" />
                <span>Status</span>
              </div>
              <div className="relative flex-1">
                <Popover className="relative">
                  <Popover.Button 
                    disabled={!isEditable || disabled}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/50 text-foreground text-xs font-semibold outline-none transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    <span>{status}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                  </Popover.Button>
                  <Popover.Panel
                    anchor="bottom start"
                    className="w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1 flex flex-col outline-none mt-1.5"
                  >
                    {({ close }) => (
                      <>
                        {["To Do", "Doing", "Completed", "On Hold"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              handleChange("status", st);
                              close();
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors cursor-pointer ${
                              status === st ? "font-bold text-primary bg-primary/5" : "text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(st)}`} />
                              <span>{st}</span>
                            </div>
                            {status === st && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </>
                    )}
                  </Popover.Panel>
                </Popover>
              </div>
            </div>
          )}
        </BoundField>

        {/* Priority */}
        <BoundField module="projects" field="priority">
          {({ disabled }) => (
            <div className="flex items-center gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 w-28 shrink-0 text-muted-foreground font-medium">
                <Flag className="w-4 h-4 text-muted-foreground" />
                <span>Priority</span>
              </div>
              <div className="relative flex-1">
                <Popover className="relative">
                  <Popover.Button 
                    disabled={!isEditable || disabled}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/50 text-foreground text-xs font-semibold outline-none transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      priority === 'High' 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' 
                        : priority === 'Low' 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {priority}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                  </Popover.Button>
                  <Popover.Panel
                    anchor="bottom start"
                    className="w-44 bg-card border border-border rounded-xl shadow-lg z-50 py-1 flex flex-col outline-none mt-1.5"
                  >
                    {({ close }) => (
                      <>
                        {["Low", "Medium", "High"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              handleChange("priority", p);
                              close();
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors cursor-pointer ${
                              priority === p ? "font-bold text-primary bg-primary/5" : "text-foreground"
                            }`}
                          >
                            <span>{p}</span>
                            {priority === p && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </>
                    )}
                  </Popover.Panel>
                </Popover>
              </div>
            </div>
          )}
        </BoundField>

        {/* Timeline / Dates */}
        <BoundField module="projects" field="dueDate">
          {({ disabled }) => (
            <div className="flex items-center gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 w-28 shrink-0 text-muted-foreground font-medium">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span>Timeline</span>
              </div>
              <div className="relative flex-1">
                <Popover className="relative">
                  <Popover.Button 
                    disabled={!isEditable || disabled}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/50 text-foreground text-xs font-semibold outline-none transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      {formatDisplayDate(
                        dateRange.from?.toISOString(), 
                        dateRange.to?.toISOString()
                      ) || "Set timeline..."}
                    </span>
                    {dateRange.from && isEditable && !disabled && (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange("startDate", undefined);
                          handleChange("dueDate", undefined);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-red-500 ml-1 px-1 font-bold"
                        title="Clear timeline"
                      >
                        ×
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                  </Popover.Button>
                  <Popover.Panel
                    anchor="bottom start"
                    className="bg-card border border-border rounded-2xl shadow-xl z-50 p-3 outline-none mt-1.5"
                  >
                    <div className="px-2 py-1 mb-2 text-[11px] font-semibold text-muted-foreground border-b border-border">
                      Select Start Date → Due Date
                    </div>
                    <DayPicker
                      mode="range"
                      selected={dateRange as any}
                      onSelect={(range: any) => {
                        handleChange("startDate", range?.from ? range.from.toISOString() : undefined);
                        handleChange("dueDate", range?.to ? range.to.toISOString() : (range?.from ? range.from.toISOString() : undefined));
                      }}
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
            </div>
          )}
        </BoundField>

        {/* Assigned Team */}
        <BoundField module="projects" field="teamId">
          {({ disabled }) => (
            <div className="flex items-center gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 w-28 shrink-0 text-muted-foreground font-medium">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Assigned Team</span>
              </div>
              <div className="relative flex-1">
                <Popover className="relative">
                  <Popover.Button 
                    disabled={!isEditable || disabled}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/50 text-foreground text-xs font-semibold outline-none transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 max-w-[220px]"
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      selectedTeam ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedTeam ? selectedTeam.name?.charAt(0)?.toUpperCase() : <Shield className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{selectedTeam ? selectedTeam.name : "Select team..."}</span>
                    {selectedTeam && isEditable && !disabled && (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange("teamId", undefined);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-red-500 ml-1 px-1 font-bold"
                        title="Clear team"
                      >
                        ×
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                  </Popover.Button>
                  <Popover.Panel
                    anchor="bottom start"
                    className="w-64 bg-card border border-border rounded-xl shadow-xl z-50 p-2 outline-none mt-1.5 overflow-hidden"
                  >
                    {({ close }) => (
                      <>
                        <div className="p-1 mb-1 border-b border-border/60">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
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
                        <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar p-0.5">
                          {teams
                            .filter((t) => {
                              const q = teamSearch.toLowerCase();
                              return !q || (t.name || "").toLowerCase().includes(q);
                            })
                            .map((t) => {
                              const isSelected = selectedTeamId === (t._id || t.id);
                              return (
                                <button
                                  key={t._id || t.id}
                                  type="button"
                                  onClick={() => {
                                    handleChange("teamId", t._id || t.id);
                                    setTeamSearch("");
                                    close();
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                                  }`}
                                >
                                  <div className="w-5 h-5 rounded-md bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {t.name?.charAt(0)?.toUpperCase() || "T"}
                                  </div>
                                  <div className="flex-1 truncate">
                                    <div className="truncate">{t.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {t.members?.length || 0} members
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })}
                          {teams.length === 0 && (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              No teams created yet.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </Popover.Panel>
                </Popover>
              </div>
            </div>
          )}
        </BoundField>

        {/* Project Color Badge Selection */}
        <BoundField module="projects" field="color">
          {({ disabled }) => (
            <div className="col-span-1 md:col-span-2 flex items-center gap-3 text-xs md:text-sm pt-1">
              <div className="flex items-center gap-2.5 w-28 shrink-0 text-muted-foreground font-medium">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span>Project Color</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    disabled={!isEditable || disabled}
                    onClick={() => handleChange("color", c.value)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                      color === c.value 
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110 shadow-sm" 
                        : "hover:scale-105 opacity-80 hover:opacity-100 disabled:hover:scale-100"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </BoundField>
      </div>

      {/* Horizontal Divider */}
      <div className="border-t border-border/60 my-6" />

      {/* Extra Links & Actions for Existing Project */}
      {!isNew && projectId && (
        <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Project Tasks Board</h4>
              <p className="text-[11px] text-muted-foreground">View and manage all task items scoped to this project.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CompanyLink
              href={`/projects/${projectId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted/60 text-foreground transition-all shadow-xs"
            >
              <span>Open Board</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </CompanyLink>

            {onDelete && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
