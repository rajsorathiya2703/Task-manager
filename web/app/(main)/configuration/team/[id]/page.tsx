"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeft, PanelRight, Save, Check, X, Loader2,
  Shield, Users, Trash, Plus, Calendar, Clock,
  ArrowLeft, Hash, UserCheck, ChevronDown, Search
} from "lucide-react";
import { Popover } from "@headlessui/react";
import { useSidebar } from "../../../../../src/components/layout/SidebarContext";
import { fetchTeamById, fetchTeams, createTeam, fetchEmployees, fetchMe, api } from "../../../../../src/lib/api";
import { RecordNavigator } from "../../../../../src/components/common/RecordNavigator";
import { TeamComments } from "../../../../../src/components/team/TeamComments";
import { getUserDisplayName } from "../../../../../src/components/common/Comments";
import { TeamLiveTimeline } from "../../../../../src/components/team/TeamLiveTimeline";
import Link from "next/link";

const EMPTY_TEAM = {
  name: "",
  description: "",
  members: [],
  teamLead: null,
  comments: [],
  createdAt: null,
  updatedAt: null,
};

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Inactive: "bg-muted text-muted-foreground border-border",
};

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { isOpen, toggleSidebar } = useSidebar();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const [originalData, setOriginalData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(EMPTY_TEAM);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [emps, me] = await Promise.all([
          fetchEmployees().catch(() => []),
          fetchMe().catch(() => null),
        ]);
        setAllEmployees(emps || []);
        setCurrentUser(me);

        if (!isNew) {
          const data = await fetchTeamById(id);
          if (data) {
            setTeamData(data);
            setOriginalData(data);
          }
        }
      } catch (err) {
        console.error("Failed to load team data", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [id, isNew]);

  // Check if current logged-in user is a member or team lead of this team
  const isMember = (() => {
    if (isNew) return true;
    if (!currentUser) return true; // optimistic default while loading

    const userIdStr = (currentUser._id || currentUser.id)?.toString();
    const userEmail = currentUser.email ? currentUser.email.trim().toLowerCase() : null;

    const userEmployee = allEmployees.find((e: any) => {
      const empUserId = (e.userId?._id || e.userId)?.toString();
      if (userIdStr && empUserId === userIdStr) return true;
      if (userEmail && e.email && e.email.trim().toLowerCase() === userEmail) return true;
      return false;
    });
    const userEmpIdStr = userEmployee?._id?.toString();

    // Check team lead
    const leadObj = teamData.teamLead;
    if (leadObj) {
      const leadIdStr = (leadObj._id || leadObj).toString();
      if (userEmpIdStr && leadIdStr === userEmpIdStr) return true;
      if (userIdStr && leadIdStr === userIdStr) return true;
      if (userEmail && leadObj.email && leadObj.email.trim().toLowerCase() === userEmail) return true;
    }

    // Check members
    if (Array.isArray(teamData.members)) {
      for (const m of teamData.members) {
        if (!m) continue;
        const memberIdStr = (m._id || m).toString();
        if (userEmpIdStr && memberIdStr === userEmpIdStr) return true;
        if (userIdStr && memberIdStr === userIdStr) return true;
        if (userEmail && m.email && m.email.trim().toLowerCase() === userEmail) return true;
      }
    }

    return false;
  })();

  // Detect changes (ignore comments — they save inline)
  const hasChanges =
    !isNew &&
    originalData &&
    (() => {
      const { comments: c1, ...t1 } = teamData;
      const { comments: c2, ...t2 } = originalData;
      return JSON.stringify(t1) !== JSON.stringify(t2);
    })();

  const [allTeamIds, setAllTeamIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchTeams().then((teams) => {
        if (teams && Array.isArray(teams)) {
          setAllTeamIds(teams.map((t: any) => t._id || t.id));
        }
      }).catch((err) => console.error("Failed to load team list", err));
    }
  }, [isNew]);

  const teamIndex = allTeamIds.indexOf(id);
  const totalTeams = allTeamIds.length;
  const currentTeamNum = teamIndex >= 0 ? teamIndex + 1 : 1;

  const navigateToTeam = (targetId: string) => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard and navigate to the other team?")) {
        return;
      }
    }
    router.push(`/configuration/team/${targetId}`);
  };

  const handlePrevTeam = () => {
    if (teamIndex > 0) {
      navigateToTeam(allTeamIds[teamIndex - 1]);
    }
  };

  const handleNextTeam = () => {
    if (teamIndex >= 0 && teamIndex < totalTeams - 1) {
      navigateToTeam(allTeamIds[teamIndex + 1]);
    }
  };

  const set = (field: string, value: any) =>
    setTeamData((prev: any) => ({ ...prev, [field]: value }));

  // Members helpers
  const getMember = (m: any) =>
    allEmployees.find((e) => e._id === (m._id || m)) || m;

  const teamLeadId =
    teamData.teamLead?._id || teamData.teamLead || null;

  const addMember = (empId: string) => {
    if (!empId) return;
    const emp = allEmployees.find((e) => e._id === empId);
    if (emp && !teamData.members.some((m: any) => (m._id || m) === empId)) {
      set("members", [...teamData.members, emp]);
    }
  };

  const removeMember = (empId: string) => {
    set(
      "members",
      teamData.members.filter((m: any) => (m._id || m) !== empId)
    );
    // Also clear teamLead if that member is removed
    if (teamLeadId === empId) set("teamLead", null);
  };

  const availableToAdd = allEmployees.filter(
    (e) => !teamData.members.some((m: any) => (m._id || m) === e._id)
  );

  const handleSave = async () => {
    if (!teamData.name?.trim()) {
      alert("Team Name is required.");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        ...teamData,
        members: teamData.members.map((m: any) => m._id || m),
        teamLead: teamData.teamLead?._id || teamData.teamLead || null,
      };

      if (isNew) {
        await createTeam(payload);
        setToastMessage("Team created!");
        setTimeout(() => router.push("/configuration/team"), 1000);
      } else {
        const res = await api.patch(`/teams/${id}`, payload);
        const updated = res.data;
        setTeamData({ ...updated, comments: teamData.comments });
        setOriginalData({ ...updated, comments: teamData.comments });
        setToastMessage("Team updated!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save team", err);
      alert("Failed to save team.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (originalData) setTeamData(originalData);
  };

  const displayName = teamData.name || (isNew ? "New Team" : "Team");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Top Toolbar ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background shrink-0 min-h-[60px]">
        <div className="flex items-center gap-2 min-w-0">
          {!isOpen && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm mr-2 shrink-0"
            >
              <PanelLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate">
            <Link
              href="/configuration/team"
              className="hover:text-foreground transition-colors"
            >
              Teams
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold truncate max-w-[220px]">
              {displayName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isNew && totalTeams > 0 && (
            <RecordNavigator
              current={currentTeamNum}
              total={totalTeams}
              onPrev={handlePrevTeam}
              onNext={handleNextTeam}
              hasPrev={teamIndex > 0}
              hasNext={teamIndex >= 0 && teamIndex < totalTeams - 1}
            />
          )}
          {isNew ? (
            <button
              onClick={handleSave}
              disabled={isSaving || !teamData.name?.trim()}
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving..." : "Save Team"}
            </button>
          ) : hasChanges ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={handleDiscard}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md transition-colors bg-primary text-primary-foreground shadow-sm text-xs font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {isSaving ? "Updating..." : "Update Team"}
              </button>
            </div>
          ) : (
            <Link
              href="/configuration/team"
              className="flex items-center gap-1.5 h-7 px-3 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm text-muted-foreground text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          )}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 border border-border rounded-md transition-colors bg-card shadow-sm ml-1 ${
              isRightPanelOpen
                ? "bg-muted text-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden flex">
        {/* ── Left Column ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* ── Hero Card ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
              <div className="px-6 pb-6 -mt-6">
                <div className="flex items-end justify-between gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground shadow-md border-4 border-card shrink-0">
                    <Shield className="w-7 h-7" />
                  </div>
                  {/* Status — custom popover */}
                  <Popover className="relative">
                    <Popover.Button
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border outline-none transition-colors ${
                        STATUS_STYLES[teamData.status || "Active"]
                      }`}
                    >
                      {teamData.status || "Active"}
                      <ChevronDown className="w-3 h-3" />
                    </Popover.Button>
                    <Popover.Panel className="absolute right-0 top-full mt-1.5 w-36 bg-card border border-border rounded-xl shadow-lg z-50 p-1.5 outline-none">
                      {({ close }) => (
                        <>
                          {["Active", "Inactive"].map((s) => (
                            <button
                              key={s}
                              onClick={() => { set("status", s); close(); }}
                              className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                                (teamData.status || "Active") === s
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted text-foreground"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mr-2 inline-block ${
                                s === "Active" ? "bg-emerald-500" : "bg-muted-foreground"
                              }`} />
                              {s}
                              {(teamData.status || "Active") === s && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </>
                      )}
                    </Popover.Panel>
                  </Popover>
                </div>

                {/* Team Name */}
                <div className="mt-4">
                  <input
                    type="text"
                    value={teamData.name || ""}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Team name *"
                    className="w-full text-xl font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors py-1"
                  />
                </div>

                {/* Description */}
                <div className="mt-3">
                  <textarea
                    value={teamData.description || ""}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Add a description for this team..."
                    rows={2}
                    className="w-full text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors py-1 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* ── Team Members Table ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Team Members</h3>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {teamData.members?.length || 0}
                  </span>
                </div>

                {/* Add Member — custom popover */}
                {availableToAdd.length > 0 && (
                  <Popover className="relative">
                    <Popover.Button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary/5 border border-primary/20 text-primary rounded-lg hover:bg-primary/10 transition-colors outline-none">
                      <Plus className="w-3.5 h-3.5" />
                      Add Member
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </Popover.Button>
                    <Popover.Panel className="absolute right-0 top-full mt-1.5 w-72 bg-card border border-border rounded-xl shadow-lg z-50 outline-none overflow-hidden">
                      {({ close }) => (
                        <>
                          {/* Search */}
                          <div className="p-2 border-b border-border">
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <input
                                type="text"
                                placeholder="Search employees..."
                                value={addMemberSearch}
                                onChange={(e) => setAddMemberSearch(e.target.value)}
                                className="bg-transparent outline-none text-xs w-full text-foreground placeholder:text-muted-foreground"
                                autoFocus
                              />
                            </div>
                          </div>
                          {/* Employee list */}
                          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                            {availableToAdd
                              .filter((emp) => {
                                const q = addMemberSearch.toLowerCase();
                                return (
                                  !q ||
                                  `${emp.fullName?.firstName} ${emp.fullName?.lastName}`.toLowerCase().includes(q) ||
                                  (emp.role || "").toLowerCase().includes(q) ||
                                  (emp.department || "").toLowerCase().includes(q)
                                );
                              })
                              .map((emp) => (
                                <button
                                  key={emp._id}
                                  onClick={() => {
                                    addMember(emp._id);
                                    setAddMemberSearch("");
                                    close();
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 rounded-lg transition-colors text-left"
                                >
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-[11px] shrink-0">
                                    {emp.fullName?.firstName?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                      {emp.fullName?.firstName} {emp.fullName?.lastName}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {emp.role}{emp.department ? ` · ${emp.department}` : ""}
                                    </div>
                                  </div>
                                  <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    emp.status === "Active" ? "bg-emerald-500/10 text-emerald-600" :
                                    emp.status === "On Leave" ? "bg-amber-500/10 text-amber-600" :
                                    "bg-red-500/10 text-red-600"
                                  }`}>
                                    {emp.status || "Active"}
                                  </span>
                                </button>
                              ))}
                            {availableToAdd.filter((emp) => {
                              const q = addMemberSearch.toLowerCase();
                              return !q || `${emp.fullName?.firstName} ${emp.fullName?.lastName}`.toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="text-center py-6 text-xs text-muted-foreground">
                                No employees found
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </Popover.Panel>
                  </Popover>
                )}
              </div>

              {teamData.members?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/10 border-b border-border">
                      <tr>
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Department</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Team Lead</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {teamData.members.map((raw: any) => {
                        const m = getMember(raw);
                        const isLead = teamLeadId === (m._id || raw);
                        const memberId = m._id || raw;

                        return (
                          <tr
                            key={memberId}
                            className="hover:bg-muted/20 transition-colors group"
                          >
                            {/* Avatar + Name */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                  {m.fullName?.firstName?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground text-sm">
                                    {m.fullName?.firstName} {m.fullName?.lastName}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {m.email || ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-5 py-3.5 text-sm text-foreground">
                              {m.role || <span className="text-muted-foreground italic text-xs">—</span>}
                            </td>
                            {/* Department */}
                            <td className="px-5 py-3.5 text-sm text-muted-foreground">
                              {m.department || <span className="italic text-xs">—</span>}
                            </td>
                            {/* Status */}
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  m.status === "Active"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : m.status === "On Leave"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-red-500/10 text-red-500"
                                }`}
                              >
                                {m.status || "Active"}
                              </span>
                            </td>
                            {/* Team Lead toggle */}
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() =>
                                  set("teamLead", isLead ? null : memberId)
                                }
                                title={isLead ? "Remove as lead" : "Set as team lead"}
                                className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                                  isLead
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                                    : "bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                                }`}
                              >
                                <Shield className="w-3 h-3" />
                                {isLead ? "Lead" : "Set Lead"}
                              </button>
                            </td>
                            {/* Remove */}
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => removeMember(memberId)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                title="Remove member"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No members yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Use the "Add Member" dropdown above to add employees.
                  </p>
                </div>
              )}
            </div>

            {/* ── Team Comments ── (only for existing teams) */}
            {!isNew && (
              <TeamComments
                teamId={id}
                comments={teamData.comments || []}
                setTeamData={setTeamData}
                isMember={isMember}
                mentionMembers={
                  (teamData.members || []).map((m: any) => ({
                    name: getUserDisplayName(m),
                    avatarUrl: m.avatarUrl || m.avatar,
                    email: m.email,
                  }))
                }
              />
            )}

          </div>
        </div>

        {/* ── Right Sidebar ── */}
        {isRightPanelOpen && (
          <div className="w-72 shrink-0 border-l border-border/50 bg-muted/10 overflow-y-auto custom-scrollbar p-4 space-y-4">

            {/* Team Info */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Team Info</span>
              </div>
              <div className="p-4 space-y-3">
                <SideRow label="Status">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      STATUS_STYLES[teamData.status || "Active"]
                    }`}
                  >
                    {teamData.status || "Active"}
                  </span>
                </SideRow>
                <SideRow label="Members">
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {teamData.members?.length || 0}
                  </div>
                </SideRow>
                <SideRow label="Team Lead">
                  {teamLeadId ? (
                    (() => {
                      const lead = getMember(teamData.teamLead);
                      return (
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {lead?.fullName?.firstName?.charAt(0) || "L"}
                          </div>
                          {lead?.fullName?.firstName} {lead?.fullName?.lastName}
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                  )}
                </SideRow>
                {teamData.createdAt && (
                  <SideRow label="Created">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(teamData.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </SideRow>
                )}
                {teamData.updatedAt && (
                  <SideRow label="Last Updated">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(teamData.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </SideRow>
                )}
                {!isNew && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1">Team ID</div>
                    <span className="text-[10px] font-mono text-muted-foreground break-all">{id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Timeline */}
            {!isNew && (
              <TeamLiveTimeline teamId={id} />
            )}

          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function SideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
