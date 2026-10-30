"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { cached, peekCache, writeCache, StorageTier } from './cache';

export interface UseCachedQueryOptions<T> {
  key: string;
  loader: () => Promise<T>;
  tags?: string[];
  ttl?: number;
  tier?: StorageTier;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

export interface UseCachedQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: any | null;
  refetch: (fresh?: boolean) => Promise<T | null>;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

/**
 * useCachedQuery — Component-level data caching with Stale-While-Revalidate (SWR).
 *
 * Guarantees:
 * 1. 0ms initial render: Reads synchronously from Memory/SessionStorage on mount.
 * 2. No spinner flash: isLoading is true ONLY if NO cached data exists in any tier.
 * 3. Silent revalidation: Refetches fresh data in the background without layout shifts.
 * 4. Reactive invalidation: Automatically refetches when matching tags are busted.
 */
export function useCachedQuery<T>({
  key,
  loader,
  tags = [],
  ttl = 5 * 60 * 1000,
  tier = 'session',
  enabled = true,
  onSuccess,
  onError,
}: UseCachedQueryOptions<T>): UseCachedQueryResult<T> {
  // Synchronous cache inspection for instant initial state
  const initialCache = typeof window !== 'undefined' ? peekCache<T>(key, tier) : null;
  const hasInitialCache = initialCache !== null && initialCache !== undefined;

  const [data, setInternalData] = useState<T | null>(initialCache);
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !hasInitialCache);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (fresh = false): Promise<T | null> => {
      if (!enabled || !key) return null;

      const hasCached = peekCache<T>(key, tier) !== null;
      if (hasCached) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await cached(key, () => loaderRef.current(), {
          ttl,
          tags,
          fresh,
          tier,
        });

        if (isMountedRef.current) {
          setInternalData(result);
          setIsLoading(false);
          setIsRefetching(false);
          onSuccessRef.current?.(result);
        }
        return result;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err);
          setIsLoading(false);
          setIsRefetching(false);
          onErrorRef.current?.(err);
        }
        return null;
      }
    },
    [key, enabled, ttl, tier, tags.join(',')],
  );

  // Initial fetch / background revalidate on mount or key change
  useEffect(() => {
    if (!enabled || !key) return;

    // Check if key changed and we have a cached value for the new key
    const currentCached = peekCache<T>(key, tier);
    if (currentCached !== null && currentCached !== undefined) {
      setInternalData(currentCached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // Always perform a silent background revalidation to guarantee freshness
    executeFetch(false);
  }, [key, enabled, executeFetch]);

  // Listen to invalidation events
  useEffect(() => {
    if (!enabled || tags.length === 0 || typeof window === 'undefined') return;

    const handleInvalidation = (e: Event) => {
      const customEvent = e as CustomEvent<{ tags?: string[] }>;
      const bustedTags = customEvent.detail?.tags || [];
      const hasMatch = bustedTags.some((t) => tags.includes(t));

      if (hasMatch && isMountedRef.current) {
        // Force fresh re-fetch
        executeFetch(true);
      }
    };

    window.addEventListener('app:cache-invalidated', handleInvalidation);
    return () => {
      window.removeEventListener('app:cache-invalidated', handleInvalidation);
    };
  }, [enabled, tags.join(','), executeFetch]);

  const setData = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      setInternalData((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        writeCache(key, next, { ttl, tags, tier });
        return next;
      });
    },
    [key, ttl, tags, tier],
  );

  return {
    data,
    isLoading,
    isRefetching,
    error,
    refetch: executeFetch,
    setData,
  };
}
