"use client";

import type { RoundResult, Player, HandPosition, Card as CardType } from "../../shared/types";
import { CardDisplay } from "./Card";

interface ResultsViewProps {
  result: RoundResult;
  players: Player[];
  currentPlayerId: string;
  scores: Record<string, number>;
}

const ROW_LABELS: Record<HandPosition, string> = {
  front: "Front (3 cards)",
  middle: "Middle (5 cards)",
  back: "Back (5 cards)",
};

export function ResultsView({ result, players, currentPlayerId, scores }: ResultsViewProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* All player hands */}
      <div className="space-y-4">
        <h3 className="text-white text-lg font-semibold">All Hands</h3>
        {result.submissions.map((sub) => {
          const player = playerMap.get(sub.playerId);
          if (!player) return null;
          const isMe = sub.playerId === currentPlayerId;

          return (
            <div
              key={sub.playerId}
              className={`bg-black/30 rounded-xl p-4 border ${isMe ? "border-yellow-400/50" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${isMe ? "text-yellow-400" : "text-white"}`}>
                  {player.name} {isMe ? "(You)" : ""}
                </span>
                <div className="flex items-center gap-2">
                  {sub.isFoul && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded font-medium">
                      FOUL
                    </span>
                  )}
                  <PointBadge points={result.pointChanges[sub.playerId] || 0} />
                </div>
              </div>

              {(["back", "middle", "front"] as HandPosition[]).map((pos) => (
                <div key={pos} className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/50 text-xs uppercase">{pos}</span>
                    <span className="text-white/30 text-xs">
                      {sub.evaluations[pos].label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {sub.hand[pos].map((card: CardType) => (
                      <CardDisplay key={card.id} card={card} size="sm" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Head-to-head results */}
      <div className="space-y-3">
        <h3 className="text-white text-lg font-semibold">Head-to-Head</h3>
        {result.headToHead.map((h2h, i) => {
          const p1 = playerMap.get(h2h.player1Id);
          const p2 = playerMap.get(h2h.player2Id);
          if (!p1 || !p2) return null;

          return (
            <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">{p1.name}</span>
                <span className="text-white/40 text-sm">vs</span>
                <span className="text-white font-medium">{p2.name}</span>
              </div>

              {(["front", "middle", "back"] as HandPosition[]).map((row) => {
                const rowData = h2h.rows[row];
                const p1Won = rowData.winnerId === h2h.player1Id;
                const p2Won = rowData.winnerId === h2h.player2Id;
                const tie = !rowData.winnerId;

                return (
                  <div key={row} className="flex items-center justify-between py-1 text-sm">
                    <span className={p1Won ? "text-green-400 font-medium" : "text-white/50"}>
                      {rowData.p1Eval.label}
                    </span>
                    <span className="text-white/30 text-xs uppercase">{row}</span>
                    <span className={p2Won ? "text-green-400 font-medium" : "text-white/50"}>
                      {rowData.p2Eval.label}
                    </span>
                  </div>
                );
              })}

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <PointBadge points={h2h.player1Points} />
                {h2h.isSweep && (
                  <span className="text-yellow-400 text-xs font-bold uppercase animate-pulse-glow px-2 py-0.5 rounded bg-yellow-400/10">
                    Sweep!
                  </span>
                )}
                <PointBadge points={h2h.player2Points} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Running scoreboard */}
      <div className="bg-black/30 rounded-xl p-4 border border-white/10">
        <h3 className="text-white text-lg font-semibold mb-3">Running Total</h3>
        <div className="space-y-2">
          {[...players]
            .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
            .map((player) => {
              const score = scores[player.id] || 0;
              const change = result.pointChanges[player.id] || 0;
              const isMe = player.id === currentPlayerId;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${isMe ? "bg-yellow-500/10" : ""}`}
                >
                  <span className={`font-medium ${isMe ? "text-yellow-400" : "text-white"}`}>
                    {player.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-white/40"}`}>
                      {change > 0 ? "+" : ""}{change}
                    </span>
                    <span className={`font-bold text-lg ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : "text-white"}`}>
                      {score > 0 ? "+" : ""}{score}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function PointBadge({ points }: { points: number }) {
  return (
    <span
      className={`text-sm font-bold ${
        points > 0 ? "text-green-400" : points < 0 ? "text-red-400" : "text-white/40"
      }`}
    >
      {points > 0 ? "+" : ""}{points}
    </span>
  );
}
