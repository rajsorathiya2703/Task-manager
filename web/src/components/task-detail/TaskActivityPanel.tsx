"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Smile, 
  Paperclip, 
  AtSign, 
  Reply, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  X, 
  File, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  ExternalLink, 
  Download, 
  Loader2,
  Check
} from "lucide-react";
import { Popover, Menu } from "@headlessui/react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { 
  addComment, 
  updateComment, 
  deleteComment, 
  uploadGenericResource, 
  fetchMe, 
  getAttachmentUrl, 
  validateUploadFiles, 
  normalizeUrl, 
  openAttachment, 
  isAuthenticatedFileViewUrl 
} from "../../lib/api";
import { getUserDisplayName } from "../common/Comments";

export interface TaskActivityPanelProps {
  taskId: string;
  comments?: any[];
  updates?: any[];
  setTaskData: any;
  mentionMembers?: { name: string; avatarUrl?: string; email?: string }[];
  canComment?: boolean;
}

function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function TaskActivityPanel({
  taskId,
  comments = [],
  updates = [],
  setTaskData,
  mentionMembers = [],
  canComment = true
}: TaskActivityPanelProps) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'updates'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Comment input state
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mention autocomplete state
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchMe().then(setCurrentUser).catch((err) => console.error("Failed to fetch user in TaskActivityPanel", err));
  }, []);

  // Filter mention members
  const filteredMentionMembers = mentionMembers.filter((m) =>
    m.name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(" ")) {
      const q = textBeforeCursor.slice(lastAt + 1);
      setMentionQuery(q);
      setShowMentionList(true);
      setMentionIndex(lastAt);
    } else {
      setShowMentionList(false);
    }
  };

  const handleSelectMention = (memberName: string) => {
    if (mentionIndex !== -1) {
      const before = commentText.slice(0, mentionIndex);
      const after = commentText.slice(textareaRef.current?.selectionStart || commentText.length);
      const updated = `${before}@${memberName} ${after}`;
      setCommentText(updated);
      setShowMentionList(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = before.length + memberName.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadError(null);
    const files = Array.from(e.target.files);
    const validation = validateUploadFiles(files);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await uploadGenericResource(formData);
      if (res?.resources && Array.isArray(res.resources)) {
        setAttachments((prev) => [...prev, ...res.resources]);
      }
    } catch (err: any) {
      console.error("Failed to upload comment file", err);
      const msg = err.response?.data?.message || err.message || "Upload failed";
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() && attachments.length === 0) return;
    if (isSubmitting || !taskId || taskId === 'new') return;

    try {
      setIsSubmitting(true);
      const mentions = (commentText.match(/@([\w\s]+)/g) || []).map((m) => m.slice(1).trim());
      const updatedTask = await addComment(taskId, {
        content: commentText.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
      });

      if (updatedTask && setTaskData) {
        setTaskData((prev: any) => ({
          ...prev,
          comments: updatedTask.comments || prev.comments,
          updates: updatedTask.updates || prev.updates,
        }));
      }

      setCommentText("");
      setAttachments([]);
      setShowMentionList(false);
    } catch (err: any) {
      console.error("Failed to submit comment", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingContent.trim() || isUpdating) return;
    try {
      setIsUpdating(true);
      const updatedTask = await updateComment(taskId, commentId, { content: editingContent.trim() });
      if (updatedTask && setTaskData) {
        setTaskData((prev: any) => ({
          ...prev,
          comments: updatedTask.comments || prev.comments,
        }));
      }
      setEditingCommentId(null);
      setEditingContent("");
    } catch (err) {
      console.error("Failed to update comment", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const updatedTask = await deleteComment(taskId, commentId);
      if (updatedTask && setTaskData) {
        setTaskData((prev: any) => ({
          ...prev,
          comments: updatedTask.comments || prev.comments,
        }));
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  };

  const handleReplyTo = (authorName: string) => {
    setCommentText((prev) => `@${authorName} ${prev}`);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Combine and sort activities
  const allActivities: Array<{
    kind: 'comment' | 'update';
    id: string;
    timestamp: Date;
    data: any;
  }> = [];

  if (activeTab === 'all' || activeTab === 'comments') {
    comments.forEach((c) => {
      allActivities.push({
        kind: 'comment',
        id: c._id || c.id || String(Math.random()),
        timestamp: new Date(c.createdAt || Date.now()),
        data: c,
      });
    });
  }

  if (activeTab === 'all' || activeTab === 'updates') {
    updates.forEach((u) => {
      allActivities.push({
        kind: 'update',
        id: u._id || String(Math.random()),
        timestamp: new Date(u.timestamp || Date.now()),
        data: u,
      });
    });
  }

  // Sort ascending by time
  allActivities.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const commentsCount = comments.length;
  const updatesCount = updates.length;
  const allCount = commentsCount + updatesCount;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/60">
      {/* Activity Header with Tab Pills */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <h2 className="text-sm font-bold text-foreground">Activity</h2>
        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
              activeTab === 'all'
                ? 'bg-carbon-black text-white dark:bg-white dark:text-carbon-black font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All {allCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
              activeTab === 'comments'
                ? 'bg-carbon-black text-white dark:bg-white dark:text-carbon-black font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Comments {commentsCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
              activeTab === 'updates'
                ? 'bg-carbon-black text-white dark:bg-white dark:text-carbon-black font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Updates {updatesCount}
          </button>
        </div>
      </div>

      {/* Activity Feed (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {allActivities.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-10 italic">
            No activity recorded yet.
          </div>
        ) : (
          <>
            {/* Divider Date */}
            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-border/60 flex-1" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                TODAY
              </span>
              <div className="h-px bg-border/60 flex-1" />
            </div>

            {/* Activities List */}
            {allActivities.map((act) => {
              if (act.kind === 'update') {
                const item = act.data;
                const userName = getUserDisplayName(item.user);
                const initial = userName.charAt(0).toUpperCase() || 'U';
                const timeAgo = formatRelativeTime(act.timestamp);

                return (
                  <div key={act.id} className="flex items-center gap-2.5 text-xs py-1">
                    <div className="w-6 h-6 rounded-md bg-carbon-black text-white dark:bg-muted dark:text-bright-snow font-bold text-[10px] flex items-center justify-center shrink-0 border border-border/50">
                      {initial}
                    </div>
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <div className="truncate">
                        <span className="font-semibold text-foreground mr-1.5">{userName}</span>
                        <span className="text-muted-foreground">{item.message}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2 whitespace-nowrap">
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                );
              }

              // Comment item
              const comment = act.data;
              const userName = getUserDisplayName(comment.user);
              const initial = userName.charAt(0).toUpperCase() || 'U';
              const timeAgo = formatRelativeTime(act.timestamp);
              const isMine = !!(
                currentUser &&
                (
                  (currentUser.id && (currentUser.id === comment.user?.userId || currentUser.id === comment.user?._id)) ||
                  (currentUser.email && comment.user?.email && currentUser.email.toLowerCase() === comment.user.email.toLowerCase())
                )
              );

              const isEditing = editingCommentId === act.id;

              return (
                <div key={act.id} className="flex items-start gap-2.5 text-xs py-1.5 group">
                  <div className="w-6 h-6 rounded-md bg-carbon-black text-white dark:bg-muted dark:text-bright-snow font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0 bg-card border border-border/80 rounded-xl p-3 shadow-xs">
                    {/* Top Row: User & Time & Options */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{userName}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                      </div>

                      {/* Options menu */}
                      <Menu as="div" className="relative">
                        <Menu.Button className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 top-full mt-1 w-28 bg-card border border-border rounded-lg shadow-lg z-50 py-1 outline-none">
                          {isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(act.id);
                                    setEditingContent(comment.content);
                                  }}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs w-full text-left cursor-pointer ${active ? 'bg-muted/60' : ''}`}
                                >
                                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </Menu.Item>
                          )}
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(act.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs w-full text-left text-red-500 cursor-pointer ${active ? 'bg-red-500/10' : ''}`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Menu>
                    </div>

                    {/* Content or Edit Form */}
                    {isEditing ? (
                      <div className="space-y-2 mt-1">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleUpdateComment(act.id);
                            }
                          }}
                          rows={2}
                          className="w-full text-xs p-2 bg-muted/40 border border-border rounded-lg outline-none focus:border-primary text-foreground resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateComment(act.id)}
                            disabled={isUpdating || !editingContent.trim()}
                            className="px-2.5 py-1 text-[11px] bg-primary text-primary-foreground font-semibold rounded-md disabled:opacity-50"
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-foreground text-xs leading-relaxed break-words whitespace-pre-wrap">
                        {comment.content}
                      </div>
                    )}

                    {/* Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
                        {comment.attachments.map((att: any, idx: number) => {
                          const fileUrl = att.type === 'link' ? normalizeUrl(att.url) : getAttachmentUrl(att.url, att.name);
                          const isAuthFile = isAuthenticatedFileViewUrl(fileUrl);
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target={isAuthFile ? undefined : "_blank"}
                              rel={isAuthFile ? undefined : "noopener noreferrer"}
                              download={att.type === 'link' || isAuthFile ? undefined : att.name}
                              onClick={(e) => {
                                if (isAuthFile) {
                                  e.preventDefault();
                                  openAttachment(fileUrl, att.name, false);
                                }
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground border border-border/50 transition-colors"
                            >
                              <File className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate max-w-[120px]">{att.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                      <Popover className="relative">
                        <Popover.Button className="flex items-center gap-1 hover:text-foreground text-[11px] cursor-pointer outline-none">
                          <Smile className="w-3.5 h-3.5" />
                          <span>+</span>
                        </Popover.Button>
                        <Popover.Panel className="absolute left-0 bottom-full mb-1 z-50">
                          <EmojiPicker
                            theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                            onEmojiClick={(emojiData) => {
                              // Append emoji to comment
                              setEditingContent(prev => prev + emojiData.emoji);
                            }}
                            width={300}
                            height={350}
                          />
                        </Popover.Panel>
                      </Popover>

                      <button
                        type="button"
                        onClick={() => handleReplyTo(userName)}
                        className="flex items-center gap-1 hover:text-foreground text-[11px] cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom Comment Composer Box */}
      <div className="p-4 border-t border-border/60 bg-background/50 shrink-0">
        {canComment ? (
          <div className="relative border border-border/80 rounded-xl bg-card p-3 shadow-xs focus-within:border-primary/80 transition-colors">
            {/* Mention autocomplete dropdown */}
            {showMentionList && filteredMentionMembers.length > 0 && (
              <div className="absolute left-3 bottom-full mb-2 w-56 max-h-40 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 p-1">
                {filteredMentionMembers.map((m) => (
                  <button
                    key={m.email || m.name}
                    type="button"
                    onClick={() => handleSelectMention(m.name)}
                    className="flex items-center gap-2 w-full text-left p-1.5 hover:bg-muted/60 rounded-md text-xs cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                      {m.name.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (showMentionList && filteredMentionMembers.length > 0) {
                    e.preventDefault();
                    handleSelectMention(filteredMentionMembers[0].name);
                    return;
                  }
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Write a comment... Type @ to mention"
              rows={2}
              className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 resize-none p-0 text-foreground leading-relaxed"
            />

            {/* Selected attachments chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 my-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded text-[10px] font-medium text-foreground border border-border/50"
                  >
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadError && (
              <div className="text-[10px] text-red-500 my-1">{uploadError}</div>
            )}

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  title="Mention member"
                  onClick={() => {
                    setCommentText(prev => prev + "@");
                    setShowMentionList(true);
                    setMentionIndex(commentText.length);
                    textareaRef.current?.focus();
                  }}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  <AtSign className="w-4 h-4" />
                </button>

                <Popover className="relative">
                  <Popover.Button
                    type="button"
                    title="Add emoji"
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors outline-none"
                  >
                    <Smile className="w-4 h-4" />
                  </Popover.Button>
                  <Popover.Panel className="absolute left-0 bottom-full mb-2 z-50">
                    <EmojiPicker
                      theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                      onEmojiClick={(emojiData) => {
                        setCommentText(prev => prev + emojiData.emoji);
                      }}
                      width={280}
                      height={320}
                    />
                  </Popover.Panel>
                </Popover>

                <button
                  type="button"
                  title="Attach file"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>

                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,application/pdf,.pdf"
                />
              </div>

              {/* Submit button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || isUploading || (!commentText.trim() && attachments.length === 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-carbon-black text-white hover:bg-gunmetal dark:bg-bright-snow dark:text-carbon-black dark:hover:bg-platinum font-semibold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>Comment</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2 italic">
            You do not have permission to post comments on this task.
          </div>
        )}
      </div>
    </div>
  );
}
