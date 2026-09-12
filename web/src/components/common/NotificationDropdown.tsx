"use client";

import { useState, useEffect } from "react";
import { Popover } from "@headlessui/react";
import { Bell, MessageSquare, AtSign } from "lucide-react";
import Link from "next/link";
import { fetchMe, fetchTasks, fetchTeams } from "../../lib/api";
import { getUserDisplayName } from "./Comments";

export interface NotificationItem {
  id: string;
  type: 'mention' | 'comment';
  title: string;
  message: string;
  authorName: string;
  authorAvatar?: string;
  targetUrl: string;
  createdAt: string;
  isRead: boolean;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await fetchMe();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch current user in notifications", err);
      }
    };
    init();
  }, []);

  // Poll tasks & teams every 10s to detect unread comments & mentions globally (grouped by thread)
  useEffect(() => {
    if (!currentUser) return;

    const syncNotifications = async () => {
      try {
        const [tasks, teams] = await Promise.all([
          fetchTasks().catch(() => []),
          fetchTeams().catch(() => []),
        ]);

        const currentUserId = (currentUser.id || currentUser._id)?.toString();
        const currentEmail = currentUser.email?.toLowerCase();
        const currentName = currentUser.name?.trim().toLowerCase();

        const isUserMe = (user: any) => {
          if (!user) return false;
          const uid = (user.userId || user.id || user._id)?.toString();
          const uemail = user.email?.toLowerCase();
          const uname = user.name?.trim().toLowerCase();
          if (currentUserId && uid && currentUserId === uid) return true;
          if (currentEmail && uemail && currentEmail === uemail) return true;
          if (currentName && uname && currentName === uname) return true;
          return false;
        };

        const activeUnreadNotifs: NotificationItem[] = [];

        // Group task comments per task thread
        if (Array.isArray(tasks)) {
          tasks.forEach((task: any) => {
            if (Array.isArray(task.comments) && task.comments.length > 0) {
              const threadKey = `comments_read_${task._id}`;
              const lastReadRaw = localStorage.getItem(threadKey);
              const lastReadAt = lastReadRaw ? parseInt(lastReadRaw, 10) : 0;

              const unreadTaskComments = task.comments.filter((c: any) => {
                if (isUserMe(c.user)) return false;
                const cTime = new Date(c.createdAt).getTime();
                return lastReadAt === 0 ? true : cTime > lastReadAt;
              });

              if (unreadTaskComments.length > 0) {
                const latestComment = unreadTaskComments[unreadTaskComments.length - 1];
                const hasMention = unreadTaskComments.some((c: any) =>
                  c.mentions?.some((m: string) => {
                    const ml = m.toLowerCase();
                    return (currentName && ml.includes(currentName)) || (currentEmail && ml.includes(currentEmail));
                  }) || (currentName && c.content?.toLowerCase().includes(`@${currentName}`))
                );

                const count = unreadTaskComments.length;
                const taskName = task.title || 'Task';
                const titleStr = count === 1
                  ? (hasMention ? `Tagged in ${taskName}` : `New comment on ${taskName}`)
                  : (hasMention ? `Tagged in ${taskName} (+${count - 1} new comments)` : `${count} new comments on ${taskName}`);

                activeUnreadNotifs.push({
                  id: `thread_task_${task._id}`,
                  type: hasMention ? 'mention' : 'comment',
                  title: titleStr,
                  message: latestComment.content || 'Attached file',
                  authorName: getUserDisplayName(latestComment.user),
                  authorAvatar: latestComment.user?.avatarUrl,
                  targetUrl: `/tasks/${task._id}`,
                  createdAt: latestComment.createdAt,
                  isRead: false,
                });
              }
            }
          });
        }

        // Group team comments per team thread
        if (Array.isArray(teams)) {
          teams.forEach((team: any) => {
            if (Array.isArray(team.comments) && team.comments.length > 0) {
              const threadKey = `comments_read_${team._id}`;
              const lastReadRaw = localStorage.getItem(threadKey);
              const lastReadAt = lastReadRaw ? parseInt(lastReadRaw, 10) : 0;

              const unreadTeamComments = team.comments.filter((c: any) => {
                if (isUserMe(c.user)) return false;
                const cTime = new Date(c.createdAt).getTime();
                return lastReadAt === 0 ? true : cTime > lastReadAt;
              });

              if (unreadTeamComments.length > 0) {
                const latestComment = unreadTeamComments[unreadTeamComments.length - 1];
                const hasMention = unreadTeamComments.some((c: any) =>
                  c.mentions?.some((m: string) => {
                    const ml = m.toLowerCase();
                    return (currentName && ml.includes(currentName)) || (currentEmail && ml.includes(currentEmail));
                  }) || (currentName && c.content?.toLowerCase().includes(`@${currentName}`))
                );

                const count = unreadTeamComments.length;
                const teamName = team.name || 'Team';
                const titleStr = count === 1
                  ? (hasMention ? `Tagged in ${teamName}` : `New comment on ${teamName}`)
                  : (hasMention ? `Tagged in ${teamName} (+${count - 1} new comments)` : `${count} new comments on ${teamName}`);

                activeUnreadNotifs.push({
                  id: `thread_team_${team._id}`,
                  type: hasMention ? 'mention' : 'comment',
                  title: titleStr,
                  message: latestComment.content || 'Attached file',
                  authorName: getUserDisplayName(latestComment.user),
                  authorAvatar: latestComment.user?.avatarUrl,
                  targetUrl: `/configuration/team/${team._id}`,
                  createdAt: latestComment.createdAt,
                  isRead: false,
                });
              }
            }
          });
        }

        // Sort newest first
        activeUnreadNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(activeUnreadNotifs);
      } catch (err) {
        console.error("Failed to sync notifications", err);
      }
    };

    syncNotifications();
    const interval = setInterval(syncNotifications, 10000); // 10s sync
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.length;

  const handleNotificationClick = (n: NotificationItem) => {
    // Save read timestamp for thread so notification auto-clears
    const threadId = n.targetUrl.split('/').pop();
    if (threadId) {
      localStorage.setItem(`comments_read_${threadId}`, Date.now().toString());
    }
    setNotifications(prev => prev.filter(item => item.id !== n.id));
  };

  const formatTimeAgo = (iso: string) => {
    if (!iso) return "recently";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              relative p-2 rounded-xl border border-border/50 bg-card hover:bg-muted text-muted-foreground hover:text-foreground
              transition-all focus:outline-none focus:ring-2 focus:ring-primary/20
              ${open ? 'bg-muted text-foreground ring-2 ring-primary/20' : ''}
            `}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Popover.Button>

          <Popover.Panel className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden focus:outline-none">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/15 text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                    <Bell className="w-5 h-5 opacity-50" />
                  </div>
                  <span>No new notifications</span>
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    href={n.targetUrl}
                    onClick={() => handleNotificationClick(n)}
                    className="flex items-start gap-3 p-3 text-xs transition-colors hover:bg-muted/40 block bg-primary/5"
                  >
                    {/* Icon or Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      {n.authorAvatar ? (
                        <img
                          src={n.authorAvatar}
                          alt={n.authorName}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {n.authorName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-card border border-border">
                        {n.type === 'mention' ? (
                          <AtSign className="w-2.5 h-2.5 text-primary" />
                        ) : (
                          <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
                        )}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[11px]">
                        <span className="font-medium text-foreground">{n.authorName}: </span>
                        {n.message}
                      </p>
                    </div>

                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />
                  </Link>
                ))
              )}
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}
