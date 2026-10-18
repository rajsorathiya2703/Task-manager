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

    const matchesTeam = (payload: any) => {
      const tid = payload?.teamId || payload?.team?._id || payload?.team?.id || payload?._id || payload?.id;
      return String(tid) === String(teamId);
    };

    const handleCommentCreated = (payload: any) => {
      if (matchesTeam(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTeamData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.comment) {
          setTeamData((prev: any) => {
            const current = prev?.comments || [];
            const commentId = payload.comment._id || payload.comment.id;
            if (current.some((c: any) => (c._id || c.id) === commentId)) return prev;
            return { ...prev, comments: [...current, payload.comment] };
          });
        }
      }
    };

    const handleCommentUpdated = (payload: any) => {
      if (matchesTeam(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTeamData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.comment) {
          const targetId = payload?.commentId || payload.comment._id || payload.comment.id;
          setTeamData((prev: any) => ({
            ...prev,
            comments: (prev?.comments || []).map((c: any) =>
              (c._id || c.id) === targetId ? payload.comment : c
            ),
          }));
        }
      }
    };

    const handleCommentDeleted = (payload: any) => {
      if (matchesTeam(payload)) {
        if (Array.isArray(payload?.comments)) {
          setTeamData((prev: any) => ({
            ...prev,
            comments: payload.comments,
          }));
        } else if (payload?.commentId) {
          setTeamData((prev: any) => ({
            ...prev,
            comments: (prev?.comments || []).filter(
              (c: any) => (c._id || c.id) !== payload.commentId
            ),
          }));
        }
      }
    };

    const handleTeamUpdated = (payload: any) => {
      if (matchesTeam(payload)) {
        const updated = payload?.team || payload;
        setTeamData((prev: any) => ({
          ...prev,
          ...updated,
          comments: updated.comments || prev.comments,
        }));
      }
    };

    socket.on("team:comment:created", handleCommentCreated);
    socket.on("team:comment:updated", handleCommentUpdated);
    socket.on("team:comment:deleted", handleCommentDeleted);
    socket.on("team:updated", handleTeamUpdated);

    return () => {
      leaveTeam(teamId);
      socket.off("team:comment:created", handleCommentCreated);
      socket.off("team:comment:updated", handleCommentUpdated);
      socket.off("team:comment:deleted", handleCommentDeleted);
      socket.off("team:updated", handleTeamUpdated);
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
