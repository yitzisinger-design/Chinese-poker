"use client";

import type { Player } from "../../shared/types";

interface PlayerSlotProps {
  player?: Player;
  score?: number;
  isCurrentPlayer?: boolean;
  hasSubmitted?: boolean;
  seatIndex: number;
}

const SEAT_COLORS = [
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700",
  "from-orange-500 to-orange-700",
];

export function PlayerSlot({
  player,
  score = 0,
  isCurrentPlayer,
  hasSubmitted,
  seatIndex,
}: PlayerSlotProps) {
  if (!player) {
    return (
      <div className="bg-black/20 rounded-xl p-4 border-2 border-dashed border-white/10 flex items-center justify-center min-h-[80px]">
        <span className="text-white/30 text-sm">Waiting for player...</span>
      </div>
    );
  }

  const colorGradient = SEAT_COLORS[seatIndex % SEAT_COLORS.length];

  return (
    <div
      className={`
        rounded-xl p-4 border-2 transition-all duration-300 min-h-[80px]
        ${isCurrentPlayer ? "border-yellow-400 ring-1 ring-yellow-400/50" : "border-white/10"}
        ${player.isConnected ? "bg-black/30" : "bg-black/50 opacity-60"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
          {player.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{player.name}</span>
            {isCurrentPlayer && (
              <span className="text-yellow-400 text-xs">(You)</span>
            )}
            {player.isHost && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded font-medium">
                Host
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {!player.isConnected && (
              <span className="text-red-400 text-xs">Disconnected</span>
            )}
            {hasSubmitted && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full" />
                Submitted
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/50 text-xs">Score</div>
          <div className={`text-lg font-bold ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white"}`}>
            {score > 0 ? "+" : ""}{score}
          </div>
        </div>
      </div>
    </div>
  );
}
