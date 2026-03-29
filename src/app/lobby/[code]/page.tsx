"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { SESSION_KEYS } from "@/lib/constants";
import { PlayerSlot } from "@/components/PlayerSlot";
import { RoomCodeDisplay } from "@/components/RoomCodeDisplay";

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const { connected, roomState, startGame, joinRoom } = useSocket();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // Restore session
  useEffect(() => {
    const savedId = sessionStorage.getItem(SESSION_KEYS.PLAYER_ID);
    const savedCode = sessionStorage.getItem(SESSION_KEYS.ROOM_CODE);
    const savedName = sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME);

    if (savedId && savedCode === code) {
      setPlayerId(savedId);
      // Rejoin if needed
      if (connected && savedName) {
        joinRoom(code, savedName, savedId).catch(() => {
          // If rejoin fails, go home
          sessionStorage.removeItem(SESSION_KEYS.ROOM_CODE);
          sessionStorage.removeItem(SESSION_KEYS.PLAYER_ID);
          router.push("/");
        });
      }
    } else if (!savedId) {
      router.push("/");
    }
  }, [code, connected, joinRoom, router]);

  // Navigate to game when phase changes
  useEffect(() => {
    if (roomState?.phase === "playing") {
      router.push(`/game/${code}`);
    } else if (roomState?.phase === "results") {
      router.push(`/game/${code}`);
    }
  }, [roomState?.phase, code, router]);

  const handleStart = async () => {
    if (!playerId) return;
    setStarting(true);
    setError("");
    try {
      await startGame(code, playerId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  };

  const currentPlayer = roomState?.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const playerCount = roomState?.players.filter((p) => p.isConnected).length ?? 0;
  const canStart = isHost && playerCount >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Game Lobby</h1>
          <RoomCodeDisplay code={code} />
          <p className="text-white/40 text-sm mt-3">Share this code with friends to join</p>
        </div>

        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-4">
            Players ({playerCount}/4)
          </h2>

          <div className="space-y-3 mb-6">
            {[0, 1, 2, 3].map((seatIndex) => {
              const player = roomState?.players.find((p) => p.seatIndex === seatIndex);
              return (
                <div key={seatIndex} className="animate-fade-in" style={{ animationDelay: `${seatIndex * 100}ms` }}>
                  <PlayerSlot
                    player={player}
                    score={player ? (roomState?.scores[player.id] || 0) : 0}
                    isCurrentPlayer={player?.id === playerId}
                    seatIndex={seatIndex}
                  />
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {starting ? "Starting..." : playerCount < 2 ? "Need at least 2 players" : "Start Game"}
            </button>
          ) : (
            <div className="text-center py-3 text-white/40 animate-soft-pulse">
              Waiting for host to start the game...
            </div>
          )}
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEYS.ROOM_CODE);
            sessionStorage.removeItem(SESSION_KEYS.PLAYER_ID);
            router.push("/");
          }}
          className="w-full mt-4 text-white/30 hover:text-white/60 text-sm py-2 transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
