"use client";

import { useState, useEffect } from "react";
import { fetchTeamActiveTasks } from "../../../src/lib/api";
import { Clock, Play, User } from "lucide-react";

export function TeamLiveTimeline({ teamId }: { teamId: string }) {
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActiveTasks = async () => {
      try {
        const tasks = await fetchTeamActiveTasks(teamId);
        setActiveTasks(tasks || []);
      } catch (err) {
        console.error("Failed to load active tasks", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveTasks();
    const interval = setInterval(loadActiveTasks, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [teamId]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-foreground text-sm">Live Timeline</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Live</span>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {isLoading && activeTasks.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : activeTasks.length > 0 ? (
          activeTasks.map(task => {
            const assigneeName = task.assignee?.fullName 
              ? `${task.assignee.fullName.firstName} ${task.assignee.fullName.lastName}` 
              : (task.assignee?.name || "Member");
            
            // Calculate running time
            const start = new Date(task.timerStartedAt).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - start) / 1000);
            const hours = Math.floor(elapsed / 3600);
            const mins = Math.floor((elapsed % 3600) / 60);

            return (
              <div key={task._id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs mt-1 shrink-0">
                  {assigneeName.charAt(0)}
                </div>
                <div className="flex-1 bg-muted/30 border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-sm text-foreground">{assigneeName}</span>
                      <span className="text-xs text-muted-foreground ml-1">is working on</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Play className="w-3 h-3 fill-emerald-600" />
                      {hours > 0 ? `${hours}h ` : ''}{mins}m
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-medium text-foreground bg-background border border-border px-2 py-1.5 rounded-md inline-block">
                    {task.title}
                  </div>
                  {task.projectId?.name && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Project: {task.projectId.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">No active tasks</p>
            <p className="text-xs mt-1 opacity-70">Team members aren't running any timers right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
