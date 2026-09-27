import { ScopeType } from '../policy.engine';
export type { ScopeType };

/**
 * Subject identity and relational context passed to project resolvers.
 * Matches §4 & §6.2 in ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface ProjectSubject {
  userId?: string;
  email?: string;
  employeeId?: string;
  teamIds?: string[];
  leadingTeamIds?: string[];
  isSystemAdmin?: boolean;
}

/**
 * Project record shape accepted by resolvers.
 * Tolerates raw Mongo documents, DTOs, lean queries, and populated fields.
 */
export interface ProjectResource {
  _id?: any;
  id?: string;
  userId?: any;
  teamId?: any;
  team?: any;
  name?: string;
  [key: string]: any;
}

/**
 * Optional contextual team info for resolving team-level relationships.
 */
export interface ProjectTeamContext {
  team?: {
    _id?: any;
    members?: any[];
    teamLead?: any;
    [key: string]: any;
  };
}

/**
 * Resolved relationship flags for a project record relative to a subject.
 */
export interface ProjectRelations {
  isOwner: boolean;
  isTeamMember: boolean;
  isTeamLead: boolean;
}

/**
 * Safely converts an ObjectId, string, or object with _id/id to string.
 */
function toIdString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val._id) return String(val._id);
    if (val.id) return String(val.id);
  }
  return String(val);
}

/**
 * Extracts candidate team ID from the project and optional context.
 */
function extractTeamId(
  project: ProjectResource,
  context?: ProjectTeamContext,
): string {
  if (context?.team?._id) return toIdString(context.team._id);
  if (project?.teamId) return toIdString(project.teamId);
  if (project?.team?._id) return toIdString(project.team._id);
  return '';
}

/**
 * Extracts candidate Team object containing members and/or teamLead.
 */
function extractTeamObject(
  project: ProjectResource,
  context?: ProjectTeamContext,
): any {
  if (context?.team) return context.team;
  if (project?.team && typeof project.team === 'object') return project.team;
  if (project?.teamId && typeof project.teamId === 'object' && (project.teamId.members || project.teamId.teamLead)) {
    return project.teamId;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Relationship Resolvers (§6.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the subject is the owner (creator) of the project.
 * True when: `project.userId === subject.userId`
 */
export function isProjectOwner(
  project: ProjectResource,
  subject: ProjectSubject,
): boolean {
  if (!subject?.userId || !project) return false;
  return toIdString(project.userId) === String(subject.userId);
}

/**
 * Checks whether the subject is a member of the project's team.
 * True when:
 *   1. `project.teamId` matches an ID in `subject.teamIds`
 *   2. OR subject's employeeId / userId is found in the team's `members` list.
 */
export function isProjectTeamMember(
  project: ProjectResource,
  subject: ProjectSubject,
  context?: ProjectTeamContext,
): boolean {
  if (!subject || !project) return false;

  const teamId = extractTeamId(project, context);

  // 1. Check subject's teamIds
  if (teamId && Array.isArray(subject.teamIds)) {
    if (subject.teamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.members array if team document / context is provided
  const teamObj = extractTeamObject(project, context);
  if (teamObj && Array.isArray(teamObj.members)) {
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';

    for (const member of teamObj.members) {
      if (!member) continue;
      const memberId = toIdString(member);
      if (subjectEmpId && memberId === subjectEmpId) return true;
      if (subjectUserId && memberId === subjectUserId) return true;

      if (typeof member === 'object') {
        if (subjectUserId && member.userId && toIdString(member.userId) === subjectUserId) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks whether the subject is the team lead of the project's team.
 * True when:
 *   1. `project.teamId` matches an ID in `subject.leadingTeamIds`
 *   2. OR subject's employeeId / userId matches the team's `teamLead`.
 */
export function isProjectTeamLead(
  project: ProjectResource,
  subject: ProjectSubject,
  context?: ProjectTeamContext,
): boolean {
  if (!subject || !project) return false;

  const teamId = extractTeamId(project, context);

  // 1. Check subject's leadingTeamIds
  if (teamId && Array.isArray(subject.leadingTeamIds)) {
    if (subject.leadingTeamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.teamLead if team document / context is provided
  const teamObj = extractTeamObject(project, context);
  if (teamObj && teamObj.teamLead) {
    const leadId = toIdString(teamObj.teamLead);
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';

    if (subjectEmpId && leadId === subjectEmpId) return true;
    if (subjectUserId && leadId === subjectUserId) return true;

    if (typeof teamObj.teamLead === 'object') {
      if (subjectUserId && teamObj.teamLead.userId && toIdString(teamObj.teamLead.userId) === subjectUserId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Computes all relationship flags between a project and a subject in a single evaluation.
 */
export function resolveProjectRelations(
  project: ProjectResource,
  subject: ProjectSubject,
  context?: ProjectTeamContext,
): ProjectRelations {
  return {
    isOwner: isProjectOwner(project, subject),
    isTeamMember: isProjectTeamMember(project, subject, context),
    isTeamLead: isProjectTeamLead(project, subject, context),
  };
}

/**
 * Evaluates whether a project falls within the granted ScopeType (§6.3):
 *   - 'all'  -> true
 *   - 'team' -> isOwner OR isTeamMember OR isTeamLead
 *   - 'own'  -> isOwner
 *   - 'none' -> false
 */
export function isProjectInScope(
  scope: ScopeType,
  project: ProjectResource,
  subject: ProjectSubject,
  context?: ProjectTeamContext,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'none') return false;

  const rel = resolveProjectRelations(project, subject, context);

  if (scope === 'own') {
    return rel.isOwner;
  }

  if (scope === 'team') {
    return rel.isOwner || rel.isTeamMember || rel.isTeamLead;
  }

  return false;
}
