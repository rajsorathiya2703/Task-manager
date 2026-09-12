"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getActiveTimer } from '../lib/api';

// Public routes that don't require authentication — skip timer fetch on these pages
const PUBLIC_ROUTES = ['/login', '/register', '/'];

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
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname?.startsWith(route + '/'));

  const refreshTimer = async () => {
    // Don't fetch timer on public/unauthenticated pages
    if (isPublicRoute) return;
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
  };

  const clearTimer = () => {
    setActiveTask(null);
  };

  useEffect(() => {
    refreshTimer();
  }, [pathname]); // Re-run when route changes so timer loads after login

  const isActive = !!activeTask?.isTimerRunning;
  const timerStartedAt = activeTask?.timerStartedAt || null;

  return (
    <TimerContext.Provider value={{ activeTask, isActive, timerStartedAt, refreshTimer, clearTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
