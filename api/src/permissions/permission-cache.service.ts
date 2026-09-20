import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  groups: any[];
  expiresAt: number;
}

/**
 * PermissionCacheService
 *
 * Provides high-performance in-memory caching of user group documents with a 60-second TTL.
 * Caches lean user group documents per user to eliminate redundant MongoDB queries on guarded endpoints.
 *
 * Multi-instance deployment note:
 * In a multi-instance / clustered deployment, cache invalidations performed in memory on one
 * node will not instantly propagate to peer nodes; those peer instances will rely on the short 60s
 * TTL to expire stale entries unless a distributed cache adapter (such as Redis) is configured.
 */
@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number = 60_000; // 60 seconds TTL

  /**
   * Get cached lean groups for a user.
   * Returns undefined if cache miss or expired.
   */
  get(userId: string): any[] | undefined {
    if (!userId) return undefined;

    const entry = this.cache.get(userId);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return undefined;
    }

    return entry.groups;
  }

  /**
   * Store groups in cache with 60s TTL.
   */
  set(userId: string, groups: any[]): void {
    if (!userId) return;

    this.cache.set(userId, {
      groups,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Invalidate cache for a specific user, or clear all cached entries if no userId provided.
   */
  invalidate(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
      this.logger.debug(`Invalidated permissions cache for user: ${userId}`);
    } else {
      this.cache.clear();
      this.logger.debug('Invalidated entire permissions cache for all users');
    }
  }

  /**
   * Number of active entries in cache (for debugging/metrics).
   */
  size(): number {
    return this.cache.size;
  }
}
