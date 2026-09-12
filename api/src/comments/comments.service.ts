import { Injectable } from '@nestjs/common';

/**
 * CommentsService
 *
 * A shared, model-agnostic service for comment-related logic.
 * Consumed by TasksModule and TeamsModule to avoid duplicating
 * the ownership-check logic in every module.
 */
@Injectable()
export class CommentsService {
  /**
   * Determines whether the requesting user is the author of a comment.
   *
   * Ownership is resolved by checking (in order):
   *  1. userId stored on comment.user.userId vs the requesting userId
   *     — both sides are normalised with .toString() so ObjectId ≠ string
   *     mismatches never produce a false-negative.
   *  2. employeeId stored on comment.user.employeeId vs the requesting
   *     user's employeeId (passed via reqUser.employeeId). Survives email
   *     changes on either side.
   *  3. email stored on comment.user.email vs the requesting email
   *     — both sides are lower-cased before comparison.
   *  4. name stored on comment.user.name vs the requesting user's name
   *     — trimmed and lower-cased (weakest signal, last resort).
   *
   * Any ONE match is sufficient to grant ownership.
   * A check is skipped (not failed) when either side is absent.
   */
  isCommentOwner(
    comment: any,
    userId?: string,
    email?: string,
    reqUser?: any,
  ): boolean {
    if (!comment || !comment.user) return false;

    // ── Normalise requesting-user identifiers ──────────────────────────────
    const reqUserId: string | undefined =
      userId?.toString() ||
      (reqUser?.id ?? reqUser?._id)?.toString() ||
      undefined;

    const reqEmployeeId: string | undefined =
      (reqUser?.employeeId ?? reqUser?.employee?._id)?.toString() || undefined;

    const reqEmail: string | undefined =
      (email ?? reqUser?.email)?.toLowerCase() || undefined;

    const reqName: string | undefined =
      reqUser?.name?.trim().toLowerCase() || undefined;

    // ── Normalise comment-author identifiers ───────────────────────────────
    const commentUserId: string | undefined =
      comment.user?.userId?.toString() || undefined;

    const commentEmployeeId: string | undefined =
      comment.user?.employeeId?.toString() || undefined;

    const commentEmail: string | undefined =
      comment.user?.email?.toLowerCase() || undefined;

    const commentName: string | undefined =
      comment.user?.name?.trim().toLowerCase() || undefined;

    // ── Check 1: User ID ───────────────────────────────────────────────────
    if (reqUserId && commentUserId && reqUserId === commentUserId) return true;

    // ── Check 2: Employee ID ───────────────────────────────────────────────
    if (
      reqEmployeeId &&
      commentEmployeeId &&
      reqEmployeeId === commentEmployeeId
    )
      return true;

    // ── Check 3: Email ─────────────────────────────────────────────────────
    if (reqEmail && commentEmail && reqEmail === commentEmail) return true;

    // ── Check 4: Name (weakest signal — last resort) ───────────────────────
    if (reqName && commentName && reqName === commentName) return true;

    return false;
  }
}
