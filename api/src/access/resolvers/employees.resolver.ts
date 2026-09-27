import { ScopeType } from '../policy.engine';
export type { ScopeType };

/**
 * Subject identity and relational context passed to employee resolvers.
 * Matches §4 & §6.2 in ACCESS_CONTROL_IMPLEMENTATION_PLAN.md.
 */
export interface EmployeeSubject {
  userId?: string;
  email?: string;
  employeeId?: string;
  teamIds?: string[];
  leadingTeamIds?: string[];
  isSystemAdmin?: boolean;
}

/**
 * Employee record shape accepted by resolvers.
 * Tolerates raw Mongo documents, DTOs, lean queries, and populated fields.
 */
export interface EmployeeResource {
  _id?: any;
  id?: string;
  userId?: any;
  email?: string;
  teamIds?: Array<any>;
  [key: string]: any;
}

/**
 * Optional contextual team information for determining same-team relationships.
 */
export interface EmployeeTeamContext {
  targetEmployeeTeamIds?: string[];
  teams?: Array<{
    _id?: any;
    members?: any[];
    teamLead?: any;
    [key: string]: any;
  }>;
}

/**
 * Resolved relationship flags for an employee record relative to a subject.
 */
export interface EmployeeRelations {
  isSelf: boolean;
  isSameTeam: boolean;
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
 * Checks whether the subject is the employee themself (self).
 * True when:
 *   1. `employee.userId === subject.userId`
 *   2. OR `employee._id / employee.id === subject.employeeId`
 *   3. OR `employee.email === subject.email` (case-insensitive).
 */
export function isSelf(
  employee: EmployeeResource,
  subject: EmployeeSubject,
): boolean {
  if (!employee || !subject) return false;

  const subjectUserId = subject.userId ? String(subject.userId) : '';
  const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
  const subjectEmail = normalizeEmail(subject.email);

  if (subjectUserId && employee.userId && toIdString(employee.userId) === subjectUserId) {
    return true;
  }

  const employeeId = toIdString(employee._id || employee.id);
  if (subjectEmpId && employeeId && employeeId === subjectEmpId) {
    return true;
  }

  if (subjectEmail && employee.email && normalizeEmail(employee.email) === subjectEmail) {
    return true;
  }

  return false;
}

/**
 * Checks whether the target employee belongs to the same team as the subject.
 * True when:
 *   1. `context.targetEmployeeTeamIds` intersects with subject's teamIds / leadingTeamIds
 *   2. OR `employee.teamIds` intersects with subject's teamIds / leadingTeamIds
 *   3. OR any team in `context.teams` contains both subject and target employee.
 */
export function isSameTeam(
  employee: EmployeeResource,
  subject: EmployeeSubject,
  context?: EmployeeTeamContext,
): boolean {
  if (!employee || !subject) return false;

  const subjectTeams = new Set<string>();
  if (Array.isArray(subject.teamIds)) {
    subject.teamIds.forEach((t) => {
      const id = toIdString(t);
      if (id) subjectTeams.add(id);
    });
  }
  if (Array.isArray(subject.leadingTeamIds)) {
    subject.leadingTeamIds.forEach((t) => {
      const id = toIdString(t);
      if (id) subjectTeams.add(id);
    });
  }

  // 1. Check context.targetEmployeeTeamIds against subjectTeams
  if (subjectTeams.size > 0 && Array.isArray(context?.targetEmployeeTeamIds)) {
    for (const tId of context.targetEmployeeTeamIds) {
      if (subjectTeams.has(toIdString(tId))) {
        return true;
      }
    }
  }

  // 2. Check employee.teamIds directly against subjectTeams
  if (subjectTeams.size > 0 && Array.isArray(employee.teamIds)) {
    for (const tId of employee.teamIds) {
      if (subjectTeams.has(toIdString(tId))) {
        return true;
      }
    }
  }

  // 3. Check context.teams array if provided
  if (Array.isArray(context?.teams)) {
    const subjectEmpId = subject.employeeId ? String(subject.employeeId) : '';
    const subjectUserId = subject.userId ? String(subject.userId) : '';
    const targetEmpId = toIdString(employee._id || employee.id);
    const targetUserId = employee.userId ? toIdString(employee.userId) : '';
    const targetEmail = normalizeEmail(employee.email);

    for (const team of context.teams) {
      if (!team) continue;
      const teamId = toIdString(team._id || team.id);

      // Check if subject is on this team
      const subjectInTeam =
        (teamId && subjectTeams.has(teamId)) ||
        (subjectEmpId && toIdString(team.teamLead) === subjectEmpId) ||
        (Array.isArray(team.members) &&
          team.members.some((m) => {
            const mId = toIdString(m);
            return (
              (subjectEmpId && mId === subjectEmpId) ||
              (subjectUserId && (mId === subjectUserId || (typeof m === 'object' && toIdString(m.userId) === subjectUserId)))
            );
          }));

      if (!subjectInTeam) continue;

      // Check if target employee is on this team
      const targetInTeam =
        (targetEmpId && toIdString(team.teamLead) === targetEmpId) ||
        (targetUserId && toIdString(team.teamLead) === targetUserId) ||
        (Array.isArray(team.members) &&
          team.members.some((m) => {
            const mId = toIdString(m);
            return (
              (targetEmpId && mId === targetEmpId) ||
              (targetUserId && (mId === targetUserId || (typeof m === 'object' && toIdString(m.userId) === targetUserId))) ||
              (targetEmail && typeof m === 'object' && normalizeEmail(m.email) === targetEmail)
            );
          }));

      if (targetInTeam) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Computes all relationship flags between an employee record and a subject in a single evaluation.
 */
export function resolveEmployeeRelations(
  employee: EmployeeResource,
  subject: EmployeeSubject,
  context?: EmployeeTeamContext,
): EmployeeRelations {
  return {
    isSelf: isSelf(employee, subject),
    isSameTeam: isSameTeam(employee, subject, context),
  };
}

/**
 * Evaluates whether an employee record falls within the granted ScopeType (§6.3):
 *   - 'all'  -> true
 *   - 'team' -> isSelf OR isSameTeam
 *   - 'own'  -> isSelf
 *   - 'none' -> false
 */
export function isEmployeeInScope(
  scope: ScopeType,
  employee: EmployeeResource,
  subject: EmployeeSubject,
  context?: EmployeeTeamContext,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'none') return false;

  const rel = resolveEmployeeRelations(employee, subject, context);

  if (scope === 'own') {
    return rel.isSelf;
  }

  if (scope === 'team') {
    return rel.isSelf || rel.isSameTeam;
  }

  return false;
}
