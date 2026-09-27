import { ScopeType } from '../policy.engine';
export type { ScopeType };

/**
 * Subject identity and relational context passed to team resolvers.
 * Matches §4 & §6.2 in ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface TeamSubject {
  userId?: string;
  email?: string;
  employeeId?: string;
  teamIds?: string[];
  leadingTeamIds?: string[];
  isSystemAdmin?: boolean;
}

/**
 * Team record shape accepted by resolvers.
 * Tolerates raw Mongo documents, DTOs, lean queries, and populated fields.
 */
export interface TeamResource {
  _id?: any;
  id?: string;
  name?: string;
  description?: string;
  members?: Array<any>;
  teamLead?: any;
  [key: string]: any;
}

/**
 * Resolved relationship flags for a team record relative to a subject.
 */
export interface TeamRelations {
  isMember: boolean;
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
 * Helper to normalize email for case-insensitive comparison.
 */
function normalizeEmail(email?: string): string {
  return email ? email.trim().toLowerCase() : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Relationship Resolvers (§6.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether the subject is the team lead of the team.
 * True when:
 *   1. `subject.leadingTeamIds` contains team ID
 *   2. OR `team.teamLead` matches subject's employeeId, userId, or email.
 */
export function isTeamLead(
  team: TeamResource,
  subject: TeamSubject,
): boolean {
  if (!team || !subject) return false;

  const teamId = toIdString(team._id || team.id);

  // 1. Check subject's leadingTeamIds
  if (teamId && Array.isArray(subject.leadingTeamIds)) {
    if (subject.leadingTeamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.teamLead field
  if (team.teamLead) {
    const leadId = toIdString(team.teamLead);
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';
    const subjectEmail = normalizeEmail(subject.email);

    if (subjectEmpId && leadId === subjectEmpId) return true;
    if (subjectUserId && leadId === subjectUserId) return true;

    if (typeof team.teamLead === 'object') {
      if (subjectUserId && team.teamLead.userId && toIdString(team.teamLead.userId) === subjectUserId) {
        return true;
      }
      if (subjectEmail && team.teamLead.email && normalizeEmail(team.teamLead.email) === subjectEmail) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether the subject is a member of the team.
 * True when:
 *   1. `subject.teamIds` contains team ID
 *   2. OR any entry in `team.members` matches subject's employeeId, userId, or email
 *   3. OR subject is the teamLead of the team.
 */
export function isTeamMember(
  team: TeamResource,
  subject: TeamSubject,
): boolean {
  if (!team || !subject) return false;

  const teamId = toIdString(team._id || team.id);

  // 1. Check subject's teamIds
  if (teamId && Array.isArray(subject.teamIds)) {
    if (subject.teamIds.map(String).includes(teamId)) {
      return true;
    }
  }

  // 2. Check team.members array
  if (Array.isArray(team.members)) {
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';
    const subjectEmail = normalizeEmail(subject.email);

    for (const member of team.members) {
      if (!member) continue;
      const memberId = toIdString(member);
      if (subjectEmpId && memberId === subjectEmpId) return true;
      if (subjectUserId && memberId === subjectUserId) return true;

      if (typeof member === 'object') {
        if (subjectUserId && member.userId && toIdString(member.userId) === subjectUserId) {
          return true;
        }
        if (subjectEmail && member.email && normalizeEmail(member.email) === subjectEmail) {
          return true;
        }
      }
    }
  }

  // 3. Team lead has implicit member access
  if (isTeamLead(team, subject)) {
    return true;
  }

  return false;
}

/**
 * Computes all relationship flags between a team and a subject in a single evaluation.
 */
export function resolveTeamRelations(
  team: TeamResource,
  subject: TeamSubject,
): TeamRelations {
  return {
    isMember: isTeamMember(team, subject),
    isTeamLead: isTeamLead(team, subject),
  };
}

/**
 * Evaluates whether a team falls within the granted ScopeType (§6.3):
 *   - 'all'  -> true
 *   - 'team' -> isMember OR isTeamLead
 *   - 'own'  -> isMember OR isTeamLead
 *   - 'none' -> false
 */
export function isTeamInScope(
  scope: ScopeType,
  team: TeamResource,
  subject: TeamSubject,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'none') return false;

  const rel = resolveTeamRelations(team, subject);

  if (scope === 'own' || scope === 'team') {
    return rel.isMember || rel.isTeamLead;
  }

  return false;
}
