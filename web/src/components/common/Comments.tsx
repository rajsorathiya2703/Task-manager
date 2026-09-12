"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, Send, Smile, File, Trash, Edit2, X, Download, CheckCheck } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { uploadGenericResource, fetchMe, fetchEmployees, API_URL } from "../../lib/api";

export interface CommentUser {
  name: string;
  avatarUrl?: string;
  userId?: string;
  email?: string;
  /** Employee._id as string — populated by the backend for linked employees.
   *  Used as an additional ownership signal so edit/delete work even after
   *  an email change. */
  employeeId?: string;
}

export interface CommentAttachment {
  name: string;
  url: string;
  type: 'link' | 'file';
}

export interface CommentType {
  _id: string;
  user: CommentUser;
  content: string;
  mentions?: string[];
  attachments?: CommentAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentsProps {
  /** The list of comments to display */
  comments: CommentType[];

  /** Called when user submits a new comment. Consumer handles API call and state update. */
  onAddComment: (data: { content: string; attachments?: CommentAttachment[]; mentions?: string[] }) => Promise<void>;
  /** Called when user edits a comment. Consumer handles API call and state update. */
  onUpdateComment: (commentId: string, data: { content: string }) => Promise<void>;
  /** Called when user deletes a comment. Consumer handles API call and state update. */
  onDeleteComment: (commentId: string) => Promise<void>;

  /** Enable file attachment button (default: true) */
  enableAttachments?: boolean;
  /** Enable emoji picker button (default: true) */
  enableEmoji?: boolean;
  /** Enable @mention autocomplete (default: true) */
  enableMentions?: boolean;

  /** List of members for @mention autocomplete */
  mentionMembers?: { name: string; avatarUrl?: string; email?: string }[];
  /** Header title (default: "Comments") */
  title?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Max height of comment list area (default: "500px") */
  maxHeight?: string;
  /** Unique ID for comment thread to track unread state */
  threadId?: string;
}

/* ─── helpers ────────────────────────────────────────────────── */

/** Helper to format any user/employee object into a clean display name instead of raw email */
export function getUserDisplayName(u: any): string {
  if (!u) return 'User';

  // 1. Check fullName object (firstName, lastName)
  if (u.fullName && typeof u.fullName === 'object') {
    const first = u.fullName.firstName || '';
    const last = u.fullName.lastName || '';
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }

  // 2. Check populated userId object
  if (u.userId && typeof u.userId === 'object') {
    if (u.userId.name && !u.userId.name.includes('@')) return u.userId.name.trim();
    if (u.userId.fullName && typeof u.userId.fullName === 'object') {
      const full = `${u.userId.fullName.firstName || ''} ${u.userId.fullName.lastName || ''}`.trim();
      if (full) return full;
    }
  }

  // 3. Check direct name property if it's not an email
  if (u.name && typeof u.name === 'string' && !u.name.includes('@')) {
    return u.name.trim();
  }

  // 4. Fallback if name is an email address or only email exists
  const emailStr = u.email || (typeof u.name === 'string' && u.name.includes('@') ? u.name : '');
  if (emailStr && typeof emailStr === 'string' && emailStr.includes('@')) {
    const prefix = emailStr.split('@')[0];
    return prefix
      .replace(/[._\-+]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  return (typeof u.name === 'string' && u.name) ? u.name : 'User';
}

/** Formats a timestamp exactly like WhatsApp: "07:10 PM" */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Avatar — works correctly in Edge by using explicit width/height attrs and inline style */
function Avatar({ user, isMine }: { user: CommentUser; isMine: boolean }) {
  const displayName = getUserDisplayName(user);
  const initials = displayName.charAt(0)?.toUpperCase() || 'U';

  // Tooltip wrapper
  return (
    <div className="relative group/av shrink-0 self-end" style={{ width: 32, height: 32 }}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={displayName}
          width={32}
          height={32}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
            border: '1.5px solid var(--border, rgba(0,0,0,0.12))',
          }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            userSelect: 'none',
          }}
          className={isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
        >
          {initials}
        </div>
      )}

      {/* Tooltip — shows name on hover */}
      <div
        className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-lg
                   bg-popover text-popover-foreground border border-border
                   opacity-0 group-hover/av:opacity-100 transition-opacity duration-150"
        style={{
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {displayName}
        {/* arrow */}
        <span
          style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid var(--border, rgba(0,0,0,0.12))',
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function Comments({
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  enableAttachments = true,
  enableEmoji = true,
  enableMentions = true,
  mentionMembers = [],
  title = "Comments",
  placeholder = "Add a comment... (Type @ to mention)",
  maxHeight = "500px",
  threadId,
}: CommentsProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [fetchedEmployees, setFetchedEmployees] = useState<{ name: string; avatarUrl?: string; email?: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Storage key for thread read state
  const storageKey = `comments_read_${threadId || title.replace(/\s+/g, '_')}`;

  const [lastReadAt, setLastReadAt] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        return stored ? parseInt(stored, 10) : 0;
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await fetchMe();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch current user", err);
      }
    };
    loadUser();
  }, []);

  // Automatically fetch employees as fallback if mentionMembers prop is empty
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const emps = await fetchEmployees();
        if (Array.isArray(emps)) {
          setFetchedEmployees(
            emps.map((e: any) => ({
              name: getUserDisplayName(e),
              avatarUrl: e.avatarUrl || e.avatar,
              email: e.email,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch employees for mentions", err);
      }
    };

    if (enableMentions && (!mentionMembers || mentionMembers.length === 0)) {
      loadEmployees();
    }
  }, [enableMentions, mentionMembers]);

  const effectiveMentionMembers = (mentionMembers && mentionMembers.length > 0
    ? mentionMembers
    : fetchedEmployees
  ).map((m: any) => ({
    ...m,
    name: getUserDisplayName(m),
  }));

  const isCommentAuthor = (comment: CommentType): boolean => {
    if (!currentUser) return false;

    // Normalise requesting-user identifiers
    const currentUserId = (currentUser.id || currentUser._id)?.toString() || undefined;
    const currentEmployeeId = (currentUser.employeeId || currentUser.employee?._id)?.toString() || undefined;
    const currentEmail = currentUser.email?.toLowerCase() || undefined;
    const currentName = currentUser.name?.trim().toLowerCase() || undefined;

    // Normalise comment-author identifiers
    const commentUserId = comment.user?.userId?.toString() || undefined;
    const commentEmployeeId = (comment.user as any)?.employeeId?.toString() || undefined;
    const commentEmail = comment.user?.email?.toLowerCase() || undefined;
    const commentName = comment.user?.name?.trim().toLowerCase() || undefined;

    // Check 1: User ID (strongest)
    if (currentUserId && commentUserId && currentUserId === commentUserId) return true;
    // Check 2: Employee ID (survives email changes)
    if (currentEmployeeId && commentEmployeeId && currentEmployeeId === commentEmployeeId) return true;
    // Check 3: Email
    if (currentEmail && commentEmail && currentEmail === commentEmail) return true;
    // Check 4: Name (weakest — last resort)
    if (currentName && commentName && currentName === commentName) return true;

    return false;
  };

  // Calculate unread comments (received after lastReadAt, or all comments from others if never marked read)
  const isUnreadComment = (c: CommentType) => {
    if (!currentUser) return false;
    if (isCommentAuthor(c)) return false;
    const cTime = new Date(c.createdAt).getTime();
    if (lastReadAt === 0) return true;
    return cTime > lastReadAt;
  };

  const unreadComments = comments.filter(isUnreadComment);
  const firstUnreadIndex = comments.findIndex(isUnreadComment);

  const [autoReadCountdown, setAutoReadCountdown] = useState<number>(10);

  const markAllAsRead = () => {
    const now = Date.now();
    setLastReadAt(now);
    try {
      localStorage.setItem(storageKey, now.toString());
    } catch (e) {
      console.error("Failed to save read timestamp", e);
    }
  };

  // Automatically mark unread comments as read 10 seconds after opening the thread
  useEffect(() => {
    if (unreadComments.length === 0) {
      setAutoReadCountdown(10);
      return;
    }

    setAutoReadCountdown(10);
    const timer = setInterval(() => {
      setAutoReadCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          markAllAsRead();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [unreadComments.length, storageKey]);

  // Dispatch app notifications for incoming comments & mentions
  useEffect(() => {
    if (!currentUser || comments.length === 0 || typeof window === 'undefined') return;
    const currentName = currentUser.name?.trim().toLowerCase();
    const currentEmail = currentUser.email?.trim().toLowerCase();

    comments.forEach(c => {
      if (isCommentAuthor(c)) return;
      const notifKey = `notif_pushed_${c._id}`;
      if (localStorage.getItem(notifKey)) return;

      const isMentioned = c.mentions?.some((m: string) => {
        const ml = m.toLowerCase();
        return (currentName && ml.includes(currentName)) || (currentEmail && ml.includes(currentEmail));
      }) || (currentName && c.content?.toLowerCase().includes(`@${currentName}`));

      localStorage.setItem(notifKey, '1');
      const notifEvent = new CustomEvent("app_notification", {
        detail: {
          id: c._id,
          type: isMentioned ? 'mention' : 'comment',
          title: isMentioned ? 'Mentioned in comment' : 'New comment',
          message: c.content || 'Attached document',
          authorName: getUserDisplayName(c.user),
          authorAvatar: c.user?.avatarUrl,
          targetUrl: window.location.pathname,
          createdAt: c.createdAt,
          isRead: false,
        }
      });
      window.dispatchEvent(notifEvent);
    });
  }, [comments, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkMentionTrigger = (val: string, cursorPos: number | null) => {
    if (!enableMentions) {
      setShowMentionList(false);
      return;
    }

    const textBeforeCursor = cursorPos !== null ? val.slice(0, cursorPos) : val;
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && (lastAt === 0 || textBeforeCursor[lastAt - 1] === ' ' || textBeforeCursor[lastAt - 1] === '\n')) {
      const textAfterAt = textBeforeCursor.slice(lastAt + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentionList(true);
        setMentionFilter(textAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    checkMentionTrigger(val, e.target.selectionStart);
  };

  const insertMention = (memberName: string) => {
    if (!inputRef.current) return;
    const cursorPos = inputRef.current.selectionStart || newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const textBeforeAt = textBeforeCursor.slice(0, lastAt);
      const newText = textBeforeAt + `@${memberName} ` + textAfterCursor;
      setNewComment(newText);
      setShowMentionList(false);

      const newCursorPos = (textBeforeAt + `@${memberName} `).length;
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const formData = new FormData();
      Array.from(e.target.files).forEach(file => {
        formData.append('files', file);
      });
      try {
        const uploaded = await uploadGenericResource(formData);
        setAttachments(prev => [...prev, ...uploaded]);
      } catch (err) {
        console.error("Failed to upload file", err);
      }
    }
  };

  const handleSubmit = async () => {
    if ((!newComment.trim() && attachments.length === 0) || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const mentions = effectiveMentionMembers
        .filter(m => newComment.toLowerCase().includes(`@${m.name.toLowerCase()}`))
        .map(m => m.name);

      const data = { content: newComment, attachments, mentions };
      await onAddComment(data);
      markAllAsRead();
      setNewComment("");
      setAttachments([]);
      setShowEmojiPicker(false);
      setShowMentionList(false);
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      await onUpdateComment(commentId, { content: editContent });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update comment", err);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await onDeleteComment(commentId);
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewComment(prev => prev + emojiObject.emoji);
  };

  const filteredMentionMembers = effectiveMentionMembers.filter(m =>
    m.name.toLowerCase().includes(mentionFilter) || (m.email && m.email.toLowerCase().includes(mentionFilter))
  );

  /* ─── render a single comment ─────────────────────────────── */
  const renderComment = (comment: CommentType) => {
    const isMine = isCommentAuthor(comment);
    const hasText = comment.content?.trim().length > 0;
    const hasAttachments = comment.attachments && comment.attachments.length > 0;
    const timeStr = fmtTime(comment.createdAt);

    /* WhatsApp-style tail via inline SVG background — avoids Tailwind purge issues */
    const tailStyle: React.CSSProperties = isMine
      ? {
          /* right-side tail */
          borderRadius: '12px 2px 12px 12px',
        }
      : {
          /* left-side tail */
          borderRadius: '2px 12px 12px 12px',
        };

    return (
      <div
        key={comment._id}
        className={`flex items-end gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar with tooltip */}
        <Avatar user={comment.user} isMine={isMine} />

        {/* Content column */}
        <div className={`flex flex-col gap-1 max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>

          {/* ── Edit mode ── */}
          {editingId === comment._id ? (
            <div className="w-full space-y-2 min-w-[220px]">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-sm bg-muted/30 border border-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
              />
              <div className={`flex items-center gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <button
                  onClick={() => handleEdit(comment._id)}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Text bubble — only rendered when there IS text ── */}
              {hasText && (
                <div
                  style={tailStyle}
                  className={`
                    relative px-3 py-2 text-sm shadow-sm
                    ${isMine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/70 text-foreground border border-border/40'
                    }
                  `}
                >
                  {/* Message text */}
                  <div className="whitespace-pre-wrap break-words leading-relaxed pr-14">
                    {comment.content.split(' ').map((word, i) =>
                      word.startsWith('@')
                        ? (
                          <span
                            key={i}
                            className={`font-semibold ${isMine ? 'text-primary-foreground/75' : 'text-primary'}`}
                          >
                            {word}{' '}
                          </span>
                        )
                        : word + ' '
                    )}
                  </div>

                  {/* Timestamp + actions — inside bubble, bottom-right (WhatsApp style) */}
                  <div className={`flex items-center gap-2 mt-1 justify-end`}>
                    <span className={`text-[10px] select-none ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {timeStr}
                    </span>
                    {isMine && <CheckCheck className={`w-3 h-3 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`} />}
                    {/* Edit / Delete on hover */}
                    {isMine && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}
                          className={`p-0.5 rounded hover:bg-white/20 transition-colors`}
                          title="Edit"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="p-0.5 rounded hover:bg-red-400/30 transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Attachment cards ── */}
              {hasAttachments && (
                <div className={`flex flex-col gap-1 w-full ${isMine ? 'items-end' : 'items-start'}`}>
                  {comment.attachments!.map((att, i) => {
                    const fileUrl = att.url.startsWith('http://') || att.url.startsWith('https://')
                      ? att.url
                      : `${API_URL}${att.url.startsWith('/') ? '' : '/'}${att.url}`;

                    // Determine if this is the last/only item so we show timestamp in it
                    const isLastAtt = i === comment.attachments!.length - 1;
                    const showTimeInCard = !hasText && isLastAtt;

                    return (
                      <a
                        key={i}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.name}
                        style={tailStyle}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 text-sm shadow-sm
                          hover:opacity-90 transition-opacity
                          ${isMine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/70 text-foreground border border-border/40'
                          }
                        `}
                      >
                        {/* File icon */}
                        <div className={`p-1.5 rounded-md ${isMine ? 'bg-white/20' : 'bg-primary/10'}`}>
                          <File className={`w-4 h-4 ${isMine ? 'text-primary-foreground' : 'text-primary'}`} />
                        </div>

                        {/* File name */}
                        <span className="flex-1 min-w-0 truncate font-medium text-xs max-w-[150px]">
                          {att.name}
                        </span>

                        {/* Timestamp + double tick when attachment is the only content */}
                        {showTimeInCard && (
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            {isMine && (
                              <>
                                {/* Edit / Delete on hover */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                                  onClick={e => e.preventDefault()}
                                >
                                  <button
                                    onClick={(e) => { e.preventDefault(); setEditingId(comment._id); setEditContent(comment.content); }}
                                    className="p-0.5 rounded hover:bg-white/20 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); handleDelete(comment._id); }}
                                    className="p-0.5 rounded hover:bg-red-400/30 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </>
                            )}
                            <span className={`text-[10px] select-none ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {timeStr}
                            </span>
                            {isMine && <CheckCheck className="w-3 h-3 text-primary-foreground/60" />}
                          </div>
                        )}

                        {/* Download icon */}
                        <Download className={`w-3.5 h-3.5 shrink-0 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* ── For received (not mine) messages with only attachments — show timestamp below ── */}
              {!isMine && !hasText && hasAttachments && (
                <span className="text-[10px] text-muted-foreground select-none px-1">
                  {timeStr}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  /* ─── main render ────────────────────────────────────────────── */
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{title} ({comments.length})</span>
          {unreadComments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {unreadComments.length} new · auto-reading in {autoReadCountdown}s
            </span>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="px-3 py-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight }}>
        {comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment, index) => (
            <div key={comment._id} className="space-y-3">
              {/* Unread Comments Divider */}
              {index === firstUnreadIndex && firstUnreadIndex !== -1 && (
                <div key="new-comments-divider" className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-primary/30" />
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 shadow-sm flex items-center gap-1.5 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    New Comments ({unreadComments.length}) · Auto-reading in {autoReadCountdown}s
                  </span>
                  <div className="flex-1 h-[1px] bg-primary/30" />
                </div>
              )}
              {renderComment(comment)}
            </div>
          ))
        )}
      </div>

      {/* Pending Attachments Preview (before sending) */}
      {enableAttachments && attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/5 flex gap-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-md text-xs">
              <File className="w-3 h-3 text-blue-500" />
              <span className="max-w-[100px] truncate">{att.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="px-4 py-3 border-t border-border bg-muted/10 relative">
        {enableEmoji && showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 z-50 shadow-xl" ref={pickerRef}>
            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
          </div>
        )}

        {enableMentions && showMentionList && filteredMentionMembers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 z-50 bg-card border border-border rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto custom-scrollbar">
            {filteredMentionMembers.map(member => (
              <button
                key={member.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member.name);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-sm text-left transition-colors cursor-pointer"
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    width={24}
                    height={24}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[11px] font-medium shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs truncate text-foreground">{member.name}</span>
                  {member.email && (
                    <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 text-muted-foreground border border-border rounded-xl px-3 py-2 bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={handleInputChange}
            onClick={(e) => checkMentionTrigger(newComment, (e.target as HTMLTextAreaElement).selectionStart)}
            onKeyUp={(e) => checkMentionTrigger(newComment, (e.target as HTMLTextAreaElement).selectionStart)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent resize-none focus:outline-none min-h-[40px] max-h-[120px] custom-scrollbar py-2 text-foreground"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center gap-1.5 pb-2">
            {enableAttachments && (
              <>
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </>
            )}
            {enableEmoji && (
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={(!newComment.trim() && attachments.length === 0) || isSubmitting}
              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md disabled:opacity-50 disabled:hover:bg-primary/10 transition-colors ml-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
