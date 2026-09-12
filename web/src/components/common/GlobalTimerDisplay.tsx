"use client";

import React, { useState, useEffect } from 'react';
import { useTimer } from '../../contexts/TimerContext';
import { Square, Loader2, Play } from 'lucide-react';
import { stopTaskTimer } from '../../lib/api';
import Link from 'next/link';

export function GlobalTimerDisplay() {
  const { activeTask, isActive, timerStartedAt, refreshTimer, clearTimer } = useTimer();
  const [elapsed, setElapsed] = useState<number>(0);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timerStartedAt) {
      const updateTimer = () => {
        const start = new Date(timerStartedAt).getTime();
        const now = Date.now();
        const seconds = Math.floor((now - start) / 1000);
        setElapsed(seconds > 0 ? seconds : 0);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsed(0);
    }

    return () => clearInterval(interval);
  }, [isActive, timerStartedAt]);

  const handleStop = async () => {
    if (!activeTask?._id || isStopping) return;
    
    setIsStopping(true);
    try {
      await stopTaskTimer(activeTask._id);
      clearTimer(); // instantly remove from context
      await refreshTimer(); // fetch latest state to be sure
    } catch (error) {
      console.error("Failed to stop timer:", error);
    } finally {
      setIsStopping(false);
    }
  };

  if (!isActive || !activeTask) {
    return null;
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md text-red-600 dark:text-red-400 mr-2 shrink-0 animate-in fade-in zoom-in duration-300">
      <Link href={`/tasks/${activeTask._id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <span className="text-xs font-semibold tracking-wider font-mono min-w-[65px] text-center">
          {formatTime(elapsed)}
        </span>
        <span className="text-xs font-medium max-w-[100px] truncate hidden sm:inline-block border-l border-red-500/20 pl-2">
          {activeTask.title}
        </span>
      </Link>
      
      <button 
        onClick={handleStop}
        disabled={isStopping}
        className="ml-1 p-1 hover:bg-red-500/20 rounded transition-colors text-red-600 dark:text-red-400 disabled:opacity-50"
        title="Stop Timer"
      >
        {isStopping ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Square className="w-3.5 h-3.5 fill-current" />
        )}
      </button>
    </div>
  );
}
