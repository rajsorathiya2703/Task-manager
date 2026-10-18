"use client";

import { useEffect } from "react";
import { useSocket } from "@/src/contexts/SocketContext";
import { useTimer } from "@/src/contexts/TimerContext";
import { invalidateTags } from "@/src/lib/cache";
import type { CacheTag } from "@/src/lib/cache-rules";

const RULES: [RegExp, CacheTag[]][] = [
  [/^task:/, ["tasks", "dashboard"]],
  [/^team:/, ["teams", "tasks", "dashboard"]],
  [/^project:/, ["projects", "tasks", "dashboard"]],
  [/^employee:/, ["employees", "teams", "tasks", "dashboard"]],
  [/^(leave|dayoff|notification):/, ["dayoff", "dashboard"]],
];

export function RealtimeCacheBridge() {
  const { socket } = useSocket();
  const { refreshTimer } = useTimer();

  useEffect(() => {
    if (!socket) return;

    // onAny listeners fire BEFORE event-specific listeners, so the in-memory cache
    // is already cleared when page handlers refetch.
    const handler = (event: string) => {
      for (const [re, tags] of RULES) {
        if (re.test(event)) {
          invalidateTags(tags);
        }
      }
      if (event === "task:updated" || event === "task:deleted") {
        refreshTimer();
      }
    };

    socket.onAny(handler);

    return () => {
      socket.offAny(handler);
    };
  }, [socket, refreshTimer]);

  return null;
}
