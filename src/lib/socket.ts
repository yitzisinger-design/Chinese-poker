"use client";

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/types";

// In production, Socket.io connects to the same origin (combined server).
// In dev, connect to the separate Socket.io server on port 3001.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? undefined  // same origin in production
    : "http://localhost:3001"
);

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL || window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}
