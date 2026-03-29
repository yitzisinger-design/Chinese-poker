"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { SESSION_KEYS } from "@/lib/constants";

export default function HomePage() {
  const router = useRouter();
  const { connected, createRoom, joinRoom } = useSocket();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore name from session
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME);
    if (saved) setName(saved);
  }, []);

  // Check for existing session to rejoin
  useEffect(() => {
    const savedCode = sessionStorage.getItem(SESSION_KEYS.ROOM_CODE);
    const savedPlayerId = sessionStorage.getItem(SESSION_KEYS.PLAYER_ID);
    const savedName = sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME);
    if (savedCode && savedPlayerId && savedName && connected) {
      // Attempt rejoin
      joinRoom(savedCode, savedName, savedPlayerId)
        .then(() => {
          router.push(`/lobby/${savedCode}`);
        })
        .catch(() => {
          // Room expired, clear session
          sessionStorage.removeItem(SESSION_KEYS.ROOM_CODE);
          sessionStorage.removeItem(SESSION_KEYS.PLAYER_ID);
        });
    }
  }, [connected, joinRoom, router]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { code, playerId } = await createRoom(name.trim());
      sessionStorage.setItem(SESSION_KEYS.PLAYER_ID, playerId);
      sessionStorage.setItem(SESSION_KEYS.PLAYER_NAME, name.trim());
      sessionStorage.setItem(SESSION_KEYS.ROOM_CODE, code);
      router.push(`/lobby/${code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter room code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { playerId } = await joinRoom(roomCode.trim().toUpperCase(), name.trim());
      sessionStorage.setItem(SESSION_KEYS.PLAYER_ID, playerId);
      sessionStorage.setItem(SESSION_KEYS.PLAYER_NAME, name.trim());
      sessionStorage.setItem(SESSION_KEYS.ROOM_CODE, roomCode.trim().toUpperCase());
      router.push(`/lobby/${roomCode.trim().toUpperCase()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent mb-2">
            Chinese Poker
          </h1>
          <p className="text-white/50">Play with friends in real time</p>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400 animate-pulse"}`} />
          <span className="text-white/40 text-xs">
            {connected ? "Connected" : "Connecting..."}
          </span>
        </div>

        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
          {mode === "menu" && (
            <div className="space-y-4 animate-fade-in">
              {/* Name input */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                />
              </div>

              <button
                onClick={() => setMode("create")}
                disabled={!connected}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Create Room
              </button>

              <button
                onClick={() => setMode("join")}
                disabled={!connected}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
              >
                Join Room
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4 animate-fade-in">
              <button onClick={() => { setMode("menu"); setError(""); }} className="text-white/50 hover:text-white text-sm">
                &larr; Back
              </button>
              <h2 className="text-xl font-semibold text-white">Create Room</h2>
              <div>
                <label className="text-white/60 text-sm mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading || !connected}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? "Creating..." : "Create Room"}
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4 animate-fade-in">
              <button onClick={() => { setMode("menu"); setError(""); }} className="text-white/50 hover:text-white text-sm">
                &larr; Back
              </button>
              <h2 className="text-xl font-semibold text-white">Join Room</h2>
              <div>
                <label className="text-white/60 text-sm mb-1 block">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCD"
                  maxLength={4}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30 transition-all font-mono text-center text-2xl tracking-[0.3em] uppercase"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleJoin}
                disabled={loading || !connected}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? "Joining..." : "Join Room"}
              </button>
            </div>
          )}
        </div>

        {/* Rules hint */}
        <p className="text-white/30 text-xs text-center mt-6">
          2-4 players per room. Arrange 13 cards into Front (3), Middle (5), and Back (5) hands.
        </p>
      </div>
    </div>
  );
}
