"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { sessionStore, localStore } from './storage';

export interface UsePersistentStateOptions {
  storage?: 'session' | 'local';
}

/**
 * usePersistentState — Drop-in replacement for useState that automatically
 * persists to SessionStorage (default) or LocalStorage.
 *
 * When navigating across pages and returning, the component immediately restores
 * the exact UI state (filters, active tabs, search query, view mode) with 0ms delay.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  options: UsePersistentStateOptions = { storage: 'session' },
): [T, (value: T | ((prev: T) => T)) => void] {
  const store = options.storage === 'local' ? localStore : sessionStore;

  // Initialize synchronously from storage if available
  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
    const saved = store.get<T>(key);
    if (saved !== null && saved !== undefined) {
      return saved;
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        store.set(keyRef.current, next);
        return next;
      });
    },
    [store],
  );

  return [state, setValue];
}
