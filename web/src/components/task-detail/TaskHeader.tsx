import { useState, useRef } from "react";
import { Calendar, Tag, Paperclip, Link2, FileText, Loader2, File, ExternalLink, Play, Square, Clock, Video, Image as ImageIcon, Lock } from "lucide-react";
import { Popover } from "@headlessui/react";
import { uploadResource, fetchMe, API_URL, getAttachmentUrl, validateUploadFiles } from "../../lib/api";
import { usePermissions } from "../../contexts/PermissionsContext";

import { formatDisplayDate } from "../../lib/utils";
import { useEffect } from "react";

interface TaskHeaderProps {
  taskId?: string;
  taskData?: any;
  setTaskData?: (data: any) => void;
  isEditable?: boolean;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  isTimerLoading?: boolean;
}

export function TaskHeader({ 
  taskId, 
  taskData, 
  setTaskData, 
  isEditable,
  onStartTimer,
  onStopTimer,
  isTimerLoading = false
}: TaskHeaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = taskData?.title ?? "Write API Documentation";
  const description = taskData?.description ?? "Create clear and detailed API documentation to guide developers in using the inventory and sales metrics features effectively.";

  const isTimerRunning = taskData?.isTimerRunning;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (setTaskData && taskData) {
      setTaskData({ ...taskData, title: e.target.value });
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (setTaskData && taskData) {
      setTaskData({ ...taskData, description: e.target.value });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !taskId || taskId === 'new') return;
    
    setUploadError(null);
    const selectedFiles = Array.from(e.target.files);
    const validation = validateUploadFiles(selectedFiles);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      const updatedTask = await uploadResource(taskId, formData);
      if (setTaskData && taskData) {
        setTaskData({
          ...taskData,
          resources: updatedTask.resources
        });
      }
    } catch (err: any) {
      console.error("Failed to upload files", err);
      const msg = err.response?.data?.message || err.message || "Failed to upload files";
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = e.currentTarget.value.trim();
      if (url && setTaskData && taskData) {
        const newResource = { name: url, url, type: 'link' };
        setTaskData({
          ...taskData,
          resources: [...(taskData.resources || []), newResource]
        });
        e.currentTarget.value = '';
      }
    }
  };

  const isNew = !taskId || taskId === 'new';

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await fetchMe();
        setCurrentUser(u);
      } catch (e) {
        console.error("Failed to fetch user in TaskHeader", e);
      }
    };
    loadUser();
  }, []);

  const isAssignee = (() => {
    if (!taskData?.assignee) return true; // If unassigned, allow
    if (!currentUser) return false;

    const currentUserId = (currentUser.id || currentUser._id)?.toString();
    const currentEmail = currentUser.email?.toLowerCase();
    const currentName = currentUser.name?.trim().toLowerCase();

    const assigneeId = (taskData.assignee._id || taskData.assignee.userId || taskData.assignee.id)?.toString();
    const assigneeEmail = taskData.assignee.email?.toLowerCase();
    const assigneeName = (taskData.assignee.name || `${taskData.assignee.fullName?.firstName || ''} ${taskData.assignee.fullName?.lastName || ''}`).trim().toLowerCase();

    if (currentUserId && assigneeId && currentUserId === assigneeId) return true;
    if (currentEmail && assigneeEmail && currentEmail === assigneeEmail) return true;
    if (currentName && assigneeName && currentName === assigneeName) return true;

    return false;
  })();

  const { isFieldEditable } = usePermissions();
  const canEditTitle = isEditable && isFieldEditable('tasks', 'title');
  const canEditDesc = isEditable && isFieldEditable('tasks', 'description');

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          {canEditTitle ? (
            <input 
              type="text" 
              value={title} 
              onChange={handleTitleChange}
              placeholder="Task Title..."
              className="text-2xl font-bold text-foreground w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 p-0"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {isEditable && !canEditTitle && (
                <Lock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              )}
            </div>
          )}
          
          {canEditDesc ? (
            <textarea 
              value={description} 
              onChange={handleDescChange}
              placeholder="Add a description..."
              className="text-muted-foreground text-sm w-full bg-transparent border-none outline-none focus:ring-0 resize-none min-h-[60px] p-0"
            />
          ) : (
            <div className="flex items-start gap-2">
              <p className="text-muted-foreground text-sm flex-1">{description || "No description provided."}</p>
              {isEditable && !canEditDesc && (
                <Lock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
              )}
            </div>
          )}
        </div>

        {/* Start / Stop Timer Button */}
        {!isNew && (
          <div className="shrink-0 pt-1">
            {isTimerRunning ? (
              <button
                onClick={onStopTimer}
                disabled={isTimerLoading || !isAssignee}
                title={!isAssignee ? "Only the assigned user can stop the timer" : "Stop Timer"}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-xs transition-all shadow-sm animate-pulse cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTimerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                <span>Stop Timer</span>
              </button>
            ) : (
              <button
                onClick={onStartTimer}
                disabled={isTimerLoading || !isAssignee}
                title={!isAssignee ? "Only the assigned user can start the timer" : "Start Timer"}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTimerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                <span>Start Timer</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-y-4 items-center text-sm">

        <div className="text-muted-foreground font-medium">Labels</div>
        <div className="flex flex-wrap gap-2">
          {(taskData?.tags || []).map((label: string) => (
            <div key={label} className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full text-foreground font-medium text-xs border border-border/50">
              <Tag className="w-3 h-3 text-muted-foreground" />
              {label}
            </div>
          ))}
          {!(taskData?.tags?.length) && <span className="text-xs text-muted-foreground italic flex items-center h-6">None</span>}
        </div>

        <div className="text-muted-foreground font-medium self-start mt-1.5">Resources</div>
        <div className="flex flex-col gap-2">
          {taskData?.resources?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {taskData.resources.map((res: any, idx: number) => {
                const fileUrl = getAttachmentUrl(res.url, res.name);
                const ext = res.name?.split('.').pop()?.toLowerCase() || '';
                const isPdf = ext === 'pdf';
                const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv', '3gp'].includes(ext);
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'avif'].includes(ext);

                let icon = <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                if (res.type === 'link') icon = <ExternalLink className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
                else if (isPdf) icon = <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />;
                else if (isVideo) icon = <Video className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
                else if (isImage) icon = <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;

                return (
                  <a 
                    key={idx}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={res.name}
                    className="flex items-center gap-1.5 bg-muted/30 hover:bg-muted px-2.5 py-1.5 rounded-md text-foreground font-medium text-xs border border-border/50 transition-colors"
                    title={res.name}
                  >
                    {icon}
                    <span className="truncate max-w-[200px]">{res.name}</span>
                  </a>
                );
              })}
            </div>
          )}

          {uploadError && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-md flex items-center justify-between">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="ml-2 font-bold hover:opacity-75">×</button>
            </div>
          )}

          <Popover className="relative">
            <Popover.Button 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-medium outline-none w-fit cursor-pointer"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              {isUploading ? 'Uploading...' : 'Add document or link...'}
            </Popover.Button>
            <Popover.Panel className="absolute left-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-2 outline-none flex flex-col gap-2">
              {isNew ? (
                <div className="text-xs text-muted-foreground p-2 text-center">
                  Please save the task first before attaching files.
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md text-xs text-left w-full transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Upload Document (PDF, Video, Image)
                  </button>
                  <div className="px-2 pb-1 border-t border-border/50 pt-2 mt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      Attach Link
                    </div>
                    <input 
                      type="url" 
                      placeholder="https://... (Press Enter)"
                      className="w-full text-xs px-2 py-1.5 bg-muted/50 border border-border rounded-md outline-none focus:border-primary"
                      onKeyDown={handleAddLink}
                    />
                  </div>
                </>
              )}
            </Popover.Panel>
          </Popover>
          <input 
            type="file" 
            multiple 
            accept="image/*,video/*,application/pdf,.pdf"
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
        </div>
      </div>
    </div>
  );
}
