"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getActiveTimer, getCompanySlug } from '../lib/api';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/about',
  '/services',
  '/pricing',
  '/contact',
  '/help',
  '/register-company',
  '/select-company',
];

/**
 * Public routes that don't require authentication or tenant timer tracking.
 * Treats marketing routes, auth routes, and '/{slug}/login', '/{slug}/join' as public.
 */
const checkIsPublicRoute = (pathname: string | null): boolean => {
  if (!pathname) return true;
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && (segments[1] === 'login' || segments[1] === 'join')) {
    return true;
  }

  return false;
};

interface TimerContextProps {
  activeTask: any | null;
  isActive: boolean;
  timerStartedAt: string | null;
  refreshTimer: () => Promise<void>;
  clearTimer: () => void;
}

const TimerContext = createContext<TimerContextProps>({
  activeTask: null,
  isActive: false,
  timerStartedAt: null,
  refreshTimer: async () => {},
  clearTimer: () => {},
});

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>(() => (typeof window !== 'undefined' ? getCompanySlug() : ''));
  const pathname = usePathname();

  // Listen for company slug updates from CompanyProvider / setCompanySlug
  useEffect(() => {
    const handleSlugChange = (e: any) => {
      const nextSlug = e?.detail || getCompanySlug();
      setCurrentSlug(nextSlug);
    };

    window.addEventListener('companySlugChanged', handleSlugChange);

    // Initial check
    const slug = getCompanySlug();
    if (slug && slug !== currentSlug) {
      setCurrentSlug(slug);
    }

    return () => window.removeEventListener('companySlugChanged', handleSlugChange);
  }, []);

  // Update slug state on pathname navigation (e.g., if setCompanySlug ran during layout render)
  useEffect(() => {
    const slug = getCompanySlug();
    if (slug !== currentSlug) {
      setCurrentSlug(slug);
    }
  }, [pathname]);

  const refreshTimer = useCallback(async () => {
    // 1. Skip on public routes
    if (checkIsPublicRoute(pathname)) {
      setActiveTask(null);
      return;
    }

    // 2. Skip when no company slug is set
    const slug = getCompanySlug() || currentSlug;
    if (!slug) {
      setActiveTask(null);
      return;
    }

    try {
      const task = await getActiveTimer();
      setActiveTask(task || null);
    } catch (error: any) {
      // Silently ignore network errors (e.g. backend not running, no session)
      if (error?.code !== 'ERR_NETWORK' && error?.response?.status !== 401) {
        console.error("Failed to fetch active timer:", error);
      }
      setActiveTask(null);
    }
  }, [pathname, currentSlug]);

  const clearTimer = () => {
    setActiveTask(null);
  };

  // Re-run timer fetch when pathname or company slug changes
  useEffect(() => {
    refreshTimer();
  }, [refreshTimer]);

  const isActive = !!activeTask?.isTimerRunning;
  const timerStartedAt = activeTask?.timerStartedAt || null;

  return (
    <TimerContext.Provider value={{ activeTask, isActive, timerStartedAt, refreshTimer, clearTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
