"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientRoomState,
  Card,
  RoundResult,
} from "../../shared/types";

export interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  roomState: ClientRoomState | null;
  myCards: Card[];
  roundResult: RoundResult | null;
  submittedPlayers: Set<string>;
  createRoom: (playerName: string) => Promise<{ code: string; playerId: string }>;
  joinRoom: (code: string, playerName: string, rejoinPlayerId?: string) => Promise<{ playerId: string }>;
  startGame: (code: string, playerId: string) => Promise<void>;
  submitHand: (code: string, playerId: string, hand: { front: Card[]; middle: Card[]; back: Card[] }) => Promise<void>;
  nextRound: (code: string, playerId: string) => Promise<void>;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<ClientRoomState | null>(null);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [submittedPlayers, setSubmittedPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room:state", (state) => {
      setRoomState(state);
      setSubmittedPlayers(new Set(state.submittedPlayerIds));
      if (state.phase === "results" && state.lastRoundResult) {
        setRoundResult(state.lastRoundResult);
      }
      if (state.phase === "playing") {
        setRoundResult(null);
      }
    });

    socket.on("game:cards", (cards) => {
      setMyCards(cards);
      setSubmittedPlayers(new Set());
    });

    socket.on("game:player-submitted", (playerId) => {
      setSubmittedPlayers((prev) => new Set([...prev, playerId]));
    });

    socket.on("game:round-result", (result) => {
      setRoundResult(result);
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnected(true);
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:state");
      socket.off("game:cards");
      socket.off("game:player-submitted");
      socket.off("game:round-result");
    };
  }, []);

  const createRoom = useCallback(async (playerName: string) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Not connected");

    return new Promise<{ code: string; playerId: string }>((resolve, reject) => {
      socket.emit("room:create", { playerName }, (res) => {
        if (res.ok) resolve({ code: res.code, playerId: res.playerId });
        else reject(new Error(res.error));
      });
    });
  }, []);

  const joinRoom = useCallback(async (code: string, playerName: string, rejoinPlayerId?: string) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Not connected");

    return new Promise<{ playerId: string }>((resolve, reject) => {
      socket.emit("room:join", { code: code.toUpperCase(), playerName, rejoinPlayerId }, (res) => {
        if (res.ok) resolve({ playerId: res.playerId });
        else reject(new Error(res.error));
      });
    });
  }, []);

  const startGame = useCallback(async (code: string, playerId: string) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Not connected");

    return new Promise<void>((resolve, reject) => {
      socket.emit("room:start", { code, playerId }, (res) => {
        if (res.ok) resolve();
        else reject(new Error(res.error));
      });
    });
  }, []);

  const submitHand = useCallback(async (code: string, playerId: string, hand: { front: Card[]; middle: Card[]; back: Card[] }) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Not connected");

    return new Promise<void>((resolve, reject) => {
      socket.emit("game:submit", { code, playerId, hand }, (res) => {
        if (res.ok) resolve();
        else reject(new Error(res.error));
      });
    });
  }, []);

  const nextRound = useCallback(async (code: string, playerId: string) => {
    const socket = socketRef.current;
    if (!socket) throw new Error("Not connected");

    return new Promise<void>((resolve, reject) => {
      socket.emit("game:next-round", { code, playerId }, (res) => {
        if (res.ok) resolve();
        else reject(new Error(res.error));
      });
    });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    roomState,
    myCards,
    roundResult,
    submittedPlayers,
    createRoom,
    joinRoom,
    startGame,
    submitHand,
    nextRound,
  };
}
