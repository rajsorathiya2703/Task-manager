"use client";

import { useEffect } from "react";
import { Comments } from "../common/Comments";
import { addTeamComment, updateTeamComment, deleteTeamComment } from "../../lib/api";
import { useSocket } from "../../contexts/SocketContext";

interface TeamCommentsProps {
  teamId: string;
  comments?: any[];
  setTeamData: any;
  /** Optional list of team members for @mention support */
  mentionMembers?: { name: string; avatarUrl?: string; email?: string }[];
  /** Whether the current logged-in user is a member of this team */
  isMember?: boolean;
}

export function TeamComments({
  teamId,
  comments = [],
  setTeamData,
  mentionMembers = [],
  isMember = true,
}: TeamCommentsProps) {
  const { socket, joinTeam, leaveTeam } = useSocket();

  useEffect(() => {
    if (!teamId) return;
    joinTeam(teamId);

    if (!socket) return;

    const handleCommentCreated = (payload: any) => {
      if (payload?.teamId === teamId && payload?.comments) {
        setTeamData((prev: any) => ({
          ...prev,
          comments: payload.comments,
        }));
      }
    };

    const handleCommentUpdated = (payload: any) => {
      if (payload?.teamId === teamId && payload?.comments) {
        setTeamData((prev: any) => ({
          ...prev,
          comments: payload.comments,
        }));
      }
    };

    const handleCommentDeleted = (payload: any) => {
      if (payload?.teamId === teamId && payload?.comments) {
        setTeamData((prev: any) => ({
          ...prev,
          comments: payload.comments,
        }));
      }
    };

    socket.on("team:comment:created", handleCommentCreated);
    socket.on("team:comment:updated", handleCommentUpdated);
    socket.on("team:comment:deleted", handleCommentDeleted);

    return () => {
      leaveTeam(teamId);
      socket.off("team:comment:created", handleCommentCreated);
      socket.off("team:comment:updated", handleCommentUpdated);
      socket.off("team:comment:deleted", handleCommentDeleted);
    };
  }, [teamId, socket, joinTeam, leaveTeam, setTeamData]);
  const handleAdd = async (data: { content: string; attachments?: any[]; mentions?: string[] }) => {
    const updatedTeam = await addTeamComment(teamId, data);
    if (updatedTeam) {
      setTeamData(updatedTeam);
    }
  };

  const handleUpdate = async (commentId: string, data: { content: string }) => {
    const updatedTeam = await updateTeamComment(teamId, commentId, data);
    if (updatedTeam) {
      setTeamData(updatedTeam);
    }
  };

  const handleDelete = async (commentId: string) => {
    const updatedTeam = await deleteTeamComment(teamId, commentId);
    if (updatedTeam) {
      setTeamData(updatedTeam);
    }
  };

  return (
    <Comments
      comments={comments}
      onAddComment={handleAdd}
      onUpdateComment={handleUpdate}
      onDeleteComment={handleDelete}
      mentionMembers={mentionMembers}
      threadId={teamId}
      title="Team Discussion"
      placeholder="Write a comment... (Type @ to mention)"
      canComment={isMember}
      cannotCommentMessage="Only team members can participate in this discussion."
    />
  );
}
