"use client";

import type { Player } from "../../shared/types";

interface ScoreboardProps {
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId?: string;
}

export function Scoreboard({ players, scores, currentPlayerId }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return (
    <div className="bg-black/30 rounded-xl p-4 border border-white/10">
      <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
        Scoreboard
      </h3>
      <div className="space-y-2">
        {sorted.map((player, index) => {
          const score = scores[player.id] || 0;
          const isMe = player.id === currentPlayerId;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${isMe ? "bg-yellow-500/10" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm w-5 text-center">
                  {index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : "4th"}
                </span>
                <span className={`text-sm font-medium ${isMe ? "text-yellow-400" : "text-white"}`}>
                  {player.name}
                </span>
              </div>
              <span
                className={`font-bold ${
                  score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white/60"
                }`}
              >
                {score > 0 ? "+" : ""}{score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
