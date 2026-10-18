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
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinTask: () => {},
  leaveTask: () => {},
  joinTeam: () => {},
  leaveTeam: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
  user?: any;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, user }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const activeRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("access_token")
        : undefined;

    const newSocket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: token || undefined,
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);

      // Re-join active rooms on reconnect
      activeRoomsRef.current.forEach((room) => {
        if (room.startsWith("task:")) {
          newSocket.emit("task:join", { taskId: room.replace("task:", "") });
        } else if (room.startsWith("team:")) {
          newSocket.emit("team:join", { teamId: room.replace("team:", "") });
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
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id, user?._id]);

  const joinTask = useCallback(
    (taskId: string) => {
      if (!taskId) return;
      activeRoomsRef.current.add(`task:${taskId}`);
      if (socket && isConnected) {
        socket.emit("task:join", { taskId });
      }
    },
    [socket, isConnected]
  );

  const leaveTask = useCallback(
    (taskId: string) => {
      if (!taskId) return;
      activeRoomsRef.current.delete(`task:${taskId}`);
      if (socket && isConnected) {
        socket.emit("task:leave", { taskId });
      }
    },
    [socket, isConnected]
  );

  const joinTeam = useCallback(
    (teamId: string) => {
      if (!teamId) return;
      activeRoomsRef.current.add(`team:${teamId}`);
      if (socket && isConnected) {
        socket.emit("team:join", { teamId });
      }
    },
    [socket, isConnected]
  );

  const leaveTeam = useCallback(
    (teamId: string) => {
      if (!teamId) return;
      activeRoomsRef.current.delete(`team:${teamId}`);
      if (socket && isConnected) {
        socket.emit("team:leave", { teamId });
      }
    },
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinTask,
        leaveTask,
        joinTeam,
        leaveTeam,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
