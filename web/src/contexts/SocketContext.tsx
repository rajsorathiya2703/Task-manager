"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/src/lib/api";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinTask: (taskId: string) => void;
  leaveTask: (taskId: string) => void;
  joinTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => void;
  joinCompany: (companyId: string) => void;
  leaveCompany: (companyId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinTask: () => {},
  leaveTask: () => {},
  joinTeam: () => {},
  leaveTeam: () => {},
  joinCompany: () => {},
  leaveCompany: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
  user?: any;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, user }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const activeRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token =
      user?.token ||
      user?.accessToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("access_token")
        : undefined);

    const userId = user?._id || user?.id;

    // Normalize API_URL (strip trailing slash)
    const baseUrl = (API_URL || "http://localhost:5000").replace(/\/+$/, "");

    const newSocket = io(baseUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: token || undefined,
        userId: userId || undefined,
      },
      query: {
        token: token || undefined,
        userId: userId || undefined,
      },
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);

      // Re-join active rooms on connect/reconnect
      activeRoomsRef.current.forEach((room) => {
        if (room.startsWith("task:")) {
          newSocket.emit("task:join", { taskId: room.replace("task:", "") });
        } else if (room.startsWith("team:")) {
          newSocket.emit("team:join", { teamId: room.replace("team:", "") });
        } else if (room.startsWith("company:")) {
          newSocket.emit("company:join", { companyId: room.replace("company:", "") });
        }
      });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connection warning:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      activeRoomsRef.current.clear();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?._id, user?.id, user?.token]);

  const joinTask = useCallback((taskId: string) => {
    if (!taskId) return;
    const room = `task:${taskId}`;
    activeRoomsRef.current.add(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("task:join", { taskId });
    }
  }, []);

  const leaveTask = useCallback((taskId: string) => {
    if (!taskId) return;
    const room = `task:${taskId}`;
    activeRoomsRef.current.delete(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("task:leave", { taskId });
    }
  }, []);

  const joinTeam = useCallback((teamId: string) => {
    if (!teamId) return;
    const room = `team:${teamId}`;
    activeRoomsRef.current.add(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("team:join", { teamId });
    }
  }, []);

  const leaveTeam = useCallback((teamId: string) => {
    if (!teamId) return;
    const room = `team:${teamId}`;
    activeRoomsRef.current.delete(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("team:leave", { teamId });
    }
  }, []);

  const joinCompany = useCallback((companyId: string) => {
    if (!companyId) return;
    const room = `company:${companyId}`;
    activeRoomsRef.current.add(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("company:join", { companyId });
    }
  }, []);

  const leaveCompany = useCallback((companyId: string) => {
    if (!companyId) return;
    const room = `company:${companyId}`;
    activeRoomsRef.current.delete(room);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("company:leave", { companyId });
    }
  }, []);

  const companyId = user?.membership?.companyId || user?.companyId;

  useEffect(() => {
    if (companyId) {
      joinCompany(String(companyId));
    }
  }, [companyId, joinCompany]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinTask,
        leaveTask,
        joinTeam,
        leaveTeam,
        joinCompany,
        leaveCompany,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
