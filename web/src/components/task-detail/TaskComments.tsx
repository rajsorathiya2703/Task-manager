"use client";

import { Comments } from "../common/Comments";
import { addComment, updateComment, deleteComment } from "../../lib/api";

interface TaskCommentsProps {
  taskId: string;
  comments?: any[];
  setTaskData: any;
  /** Optional list of task members/assignees for @mention support */
  mentionMembers?: { name: string; avatarUrl?: string; email?: string }[];
}

export function TaskComments({ taskId, comments = [], setTaskData, mentionMembers = [] }: TaskCommentsProps) {
  const handleAdd = async (data: { content: string; attachments?: any[]; mentions?: string[] }) => {
    const updatedTask = await addComment(taskId, data);
    if (updatedTask) {
      setTaskData((prev: any) => ({ ...prev, comments: updatedTask.comments }));
    }
  };

  const handleUpdate = async (commentId: string, data: { content: string }) => {
    const updatedTask = await updateComment(taskId, commentId, data);
    if (updatedTask) {
      setTaskData((prev: any) => ({ ...prev, comments: updatedTask.comments }));
    }
  };

  const handleDelete = async (commentId: string) => {
    const updatedTask = await deleteComment(taskId, commentId);
    if (updatedTask) {
      setTaskData((prev: any) => ({ ...prev, comments: updatedTask.comments }));
    }
  };

  return (
    <Comments
      comments={comments}
      onAddComment={handleAdd}
      onUpdateComment={handleUpdate}
      onDeleteComment={handleDelete}
      mentionMembers={mentionMembers}
      threadId={taskId}
      title="Comments"
      placeholder="Add a comment... (Type @ to mention)"
    />
  );
}
