import { ScopeType } from '../policy.engine';
export type { ScopeType };

/**
 * Subject identity and relational context passed to task resolvers.
 * Matches §4 & §6.2 in ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface TaskSubject {
  userId?: string;
  email?: string;
  employeeId?: string;
  teamIds?: string[];
  leadingTeamIds?: string[];
  isSystemAdmin?: boolean;
}

/**
 * Task record shape accepted by resolvers.
 * Tolerates raw Mongo documents, DTOs, lean queries, and populated fields.
 */
export interface TaskResource {
  _id?: any;
  id?: string;
  userId?: any;
  assignee?: any;
  assigneeId?: any;
  assigneeEmail?: string;
  members?: Array<any>;
  projectId?: any;
  project?: any;
  teamId?: any;
  projectTeamId?: any;
  [key: string]: any;
}

/**
 * Optional contextual project & team info for resolving team-level relationships.
 */
export interface TaskProjectContext {
  teamId?: any;
  project?: {
    _id?: any;
    teamId?: any;
    [key: string]: any;
  };
  team?: {
    _id?: any;
    members?: any[];
    teamLead?: any;
    [key: string]: any;
  };
}

/**
 * Resolved relationship flags for a task record relative to a subject.
 */
export interface TaskRelations {
  isOwner: boolean;
  isAssignee: boolean;
  isMember: boolean;
  isProjectTeamMember: boolean;
  isProjectTeamLead: boolean;
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
 * Helper to normalize email for case-insensitive comparison.
 */
function normalizeEmail(email?: string): string {
  return email ? email.trim().toLowerCase() : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Relationship Resolvers (§6.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the subject is the owner (creator) of the task.
 * True when: `task.userId === subject.userId`
 */
export function isTaskOwner(
  task: TaskResource,
  subject: TaskSubject,
): boolean {
  if (!subject.userId || !task) return false;
  return toIdString(task.userId) === String(subject.userId);
}

/**
 * Checks whether the subject is assigned to the task.
 * True when: task assignee matches subject's employeeId, userId, or email.
 */
export function isTaskAssignee(
  task: TaskResource,
  subject: TaskSubject,
): boolean {
  if (!task || !subject) return false;

  const subjectUserId = subject.userId ? String(subject.userId) : '';
  const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
  const subjectEmail = normalizeEmail(subject.email);

  // 1. Direct assignee field (could be Employee ObjectId, populated Employee, or email)
  if (task.assignee) {
    const assigneeStr = toIdString(task.assignee);
    if (subjectEmpId && assigneeStr === subjectEmpId) return true;
    if (subjectUserId && assigneeStr === subjectUserId) return true;

    // Populated employee object
    if (typeof task.assignee === 'object') {
      if (
        subjectEmpId &&
        toIdString(task.assignee._id) === subjectEmpId
      ) {
        return true;
      }
      if (
        subjectUserId &&
        task.assignee.userId &&
        toIdString(task.assignee.userId) === subjectUserId
      ) {
        return true;
      }
      if (
        subjectEmail &&
        task.assignee.email &&
        normalizeEmail(task.assignee.email) === subjectEmail
      ) {
        return true;
      }
    }
  }

  // 2. assigneeId field
  if (task.assigneeId) {
    const aId = toIdString(task.assigneeId);
    if (subjectEmpId && aId === subjectEmpId) return true;
    if (subjectUserId && aId === subjectUserId) return true;
  }

  // 3. assigneeEmail field
  if (task.assigneeEmail && subjectEmail) {
    if (normalizeEmail(task.assigneeEmail) === subjectEmail) return true;
  }

  return false;
}

/**
 * Checks whether the subject is a member / collaborator on the task.
 * True when: subject's email, userId, or employeeId is in task.members[].
 */
export function isTaskMember(
  task: TaskResource,
  subject: TaskSubject,
): boolean {
  if (!task || !subject || !Array.isArray(task.members)) return false;

  const subjectEmail = normalizeEmail(subject.email);
  const subjectUserId = subject.userId ? String(subject.userId) : '';
  const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';

  for (const m of task.members) {
    if (!m) continue;

    // Member object with email (standard task member schema: { email, name, status })
    if (typeof m === 'object') {
      if (m.email && subjectEmail && normalizeEmail(m.email) === subjectEmail) {
        return true;
      }
      if (
        m.userId &&
        subjectUserId &&
        toIdString(m.userId) === subjectUserId
      ) {
        return true;
      }
      if (
        m._id &&
        ((subjectEmpId && toIdString(m._id) === subjectEmpId) ||
          (subjectUserId && toIdString(m._id) === subjectUserId))
      ) {
        return true;
      }
    } else {
      // String entry (could be email or ID)
      const mStr = String(m);
      if (subjectEmail && normalizeEmail(mStr) === subjectEmail) return true;
      if (subjectUserId && mStr === subjectUserId) return true;
      if (subjectEmpId && mStr === subjectEmpId) return true;
    }
  }

  return false;
}

/**
 * Extracts candidate team ID for the task/project context.
 */
function extractTeamId(
  task: TaskResource,
  context?: TaskProjectContext,
): string {
  if (context?.teamId) return toIdString(context.teamId);
  if (context?.project?.teamId) return toIdString(context.project.teamId);
  if (context?.team?._id) return toIdString(context.team._id);
  if (task?.projectTeamId) return toIdString(task.projectTeamId);
  if (task?.teamId) return toIdString(task.teamId);
  if (task?.project && typeof task.project === 'object' && task.project.teamId) {
    return toIdString(task.project.teamId);
  }
  return '';
}

/**
 * Checks whether the subject's employee is in the project's team.
 * True when: subject.teamIds contains the project's teamId OR subject is in team.members.
 */
export function isProjectTeamMember(
  taskOrContext: TaskResource,
  subject: TaskSubject,
  context?: TaskProjectContext,
): boolean {
  if (!subject) return false;

  const teamId = extractTeamId(taskOrContext, context);

  // 1. Check subject's teamIds
  if (teamId && Array.isArray(subject.teamIds)) {
    if (subject.teamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.members array if provided in context
  const teamObj = context?.team;
  if (teamObj && Array.isArray(teamObj.members)) {
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';

    for (const member of teamObj.members) {
      const memberId = toIdString(member);
      if (subjectEmpId && memberId === subjectEmpId) return true;
      if (subjectUserId && memberId === subjectUserId) return true;
    }
  }

  return false;
}

/**
 * Checks whether the subject's employee is the project's team lead.
 * True when: subject.leadingTeamIds contains the project's teamId OR subject is team.teamLead.
 */
export function isProjectTeamLead(
  taskOrContext: TaskResource,
  subject: TaskSubject,
  context?: TaskProjectContext,
): boolean {
  if (!subject) return false;

  const teamId = extractTeamId(taskOrContext, context);

  // 1. Check subject's leadingTeamIds
  if (teamId && Array.isArray(subject.leadingTeamIds)) {
    if (subject.leadingTeamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.teamLead field if provided in context
  const teamObj = context?.team;
  if (teamObj && teamObj.teamLead) {
    const leadId = toIdString(teamObj.teamLead);
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';

    if (subjectEmpId && leadId === subjectEmpId) return true;
    if (subjectUserId && leadId === subjectUserId) return true;
  }

  return false;
}

/**
 * Computes all relationship flags between a task and a subject in a single evaluation.
 */
export function resolveTaskRelations(
  task: TaskResource,
  subject: TaskSubject,
  context?: TaskProjectContext,
): TaskRelations {
  return {
    isOwner: isTaskOwner(task, subject),
    isAssignee: isTaskAssignee(task, subject),
    isMember: isTaskMember(task, subject),
    isProjectTeamMember: isProjectTeamMember(task, subject, context),
    isProjectTeamLead: isProjectTeamLead(task, subject, context),
  };
}

/**
 * Evaluates whether a task falls within the granted ScopeType (§6.3):
 *   - 'all'  -> true
 *   - 'team' -> own OR project_team_member OR project_team_lead
 *   - 'own'  -> owner OR assignee OR member
 *   - 'none' -> false
 */
export function isTaskInScope(
  scope: ScopeType,
  task: TaskResource,
  subject: TaskSubject,
  context?: TaskProjectContext,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'none') return false;

  const rel = resolveTaskRelations(task, subject, context);
  const isOwn = rel.isOwner || rel.isAssignee || rel.isMember;

  if (scope === 'own') {
    return isOwn;
  }

  if (scope === 'team') {
    return isOwn || rel.isProjectTeamMember || rel.isProjectTeamLead;
  }

  return false;
}
