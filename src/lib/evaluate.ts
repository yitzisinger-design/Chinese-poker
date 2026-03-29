/**
 * Client-side hand evaluation for live foul warnings.
 * Mirrors the server logic but runs in the browser.
 */
import type { Card } from "../../shared/types";

interface SimpleEval {
  rank: number; // normalized to 5-card scale
  values: number[];
  label: string;
}

export function evaluate3Card(cards: Card[]): SimpleEval {
  if (cards.length !== 3) return { rank: 0, values: [], label: "" };

  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  for (const [rank, count] of counts) {
    if (count === 3) return { rank: 4, values: [rank], label: `Three ${rankName(rank)}s` };
    if (count === 2) {
      const kicker = ranks.find((r) => r !== rank)!;
      return { rank: 2, values: [rank, kicker], label: `Pair of ${rankName(rank)}s` };
    }
  }

  return { rank: 1, values: ranks, label: `${rankName(ranks[0])} High` };
}

export function evaluate5Card(cards: Card[]): SimpleEval {
  if (cards.length !== 5) return { rank: 0, values: [], label: "" };

  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const isNormalStraight = ranks.every((r, i) => i === 0 || ranks[i - 1] - r === 1);
  const isWheel = ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;
  const isStraight = isNormalStraight || isWheel;

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  const quads: number[] = [], trips: number[] = [], pairs: number[] = [];
  for (const [rank, count] of counts) {
    if (count === 4) quads.push(rank);
    else if (count === 3) trips.push(rank);
    else if (count === 2) pairs.push(rank);
  }
  quads.sort((a, b) => b - a);
  trips.sort((a, b) => b - a);
  pairs.sort((a, b) => b - a);

  if (isFlush && isStraight) {
    const high = isWheel ? 5 : ranks[0];
    if (ranks[0] === 14 && ranks[1] === 13 && isNormalStraight) return { rank: 10, values: [14], label: "Royal Flush" };
    return { rank: 9, values: [high], label: `Straight Flush` };
  }
  if (quads.length === 1) {
    const k = ranks.find((r) => r !== quads[0])!;
    return { rank: 8, values: [quads[0], k], label: `Four ${rankName(quads[0])}s` };
  }
  if (trips.length === 1 && pairs.length === 1) {
    return { rank: 7, values: [trips[0], pairs[0]], label: `Full House` };
  }
  if (isFlush) return { rank: 6, values: ranks, label: `Flush` };
  if (isStraight) {
    const high = isWheel ? 5 : ranks[0];
    return { rank: 5, values: [high], label: `Straight` };
  }
  if (trips.length === 1) {
    const kickers = ranks.filter((r) => r !== trips[0]);
    return { rank: 4, values: [trips[0], ...kickers], label: `Three ${rankName(trips[0])}s` };
  }
  if (pairs.length === 2) {
    const k = ranks.find((r) => r !== pairs[0] && r !== pairs[1])!;
    return { rank: 3, values: [pairs[0], pairs[1], k], label: `Two Pair` };
  }
  if (pairs.length === 1) {
    const kickers = ranks.filter((r) => r !== pairs[0]);
    return { rank: 2, values: [pairs[0], ...kickers], label: `Pair of ${rankName(pairs[0])}s` };
  }
  return { rank: 1, values: ranks, label: `${rankName(ranks[0])} High` };
}

export function compareEvals(a: SimpleEval, b: SimpleEval): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    const av = a.values[i] ?? 0;
    const bv = b.values[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function rankName(rank: number): string {
  const names: Record<number, string> = {
    14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "10",
    9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2",
  };
  return names[rank] || String(rank);
}
