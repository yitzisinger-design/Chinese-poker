import { Card, HandEvaluation, HandRankType, FrontHandRankType } from "../../shared/types.js";

/**
 * Evaluate a 5-card poker hand.
 * Returns a HandEvaluation with a numeric rank and tiebreak values.
 *
 * Hand rankings (highest to lowest):
 * 10 - Royal Flush
 *  9 - Straight Flush
 *  8 - Four of a Kind
 *  7 - Full House
 *  6 - Flush
 *  5 - Straight
 *  4 - Three of a Kind
 *  3 - Two Pair
 *  2 - One Pair
 *  1 - High Card
 */
export function evaluate5Card(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) throw new Error("Must evaluate exactly 5 cards");

  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = checkStraight(ranks);

  // Special case: A-2-3-4-5 straight (wheel)
  const isWheel = ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;

  const rankCounts = getRankCounts(ranks);
  const groups = getGroups(rankCounts);

  // Straight flush / Royal flush
  if (isFlush && (isStraight || isWheel)) {
    if (ranks[0] === 14 && ranks[1] === 13 && isStraight) {
      return { type: "royal-flush", rank: 10, values: [14], label: "Royal Flush" };
    }
    const highCard = isWheel ? 5 : ranks[0];
    return { type: "straight-flush", rank: 9, values: [highCard], label: `Straight Flush, ${rankName(highCard)} high` };
  }

  // Four of a kind
  if (groups.quads.length === 1) {
    const quad = groups.quads[0];
    const kicker = ranks.find((r) => r !== quad)!;
    return { type: "four-of-a-kind", rank: 8, values: [quad, kicker], label: `Four of a Kind, ${rankName(quad)}s` };
  }

  // Full house
  if (groups.trips.length === 1 && groups.pairs.length === 1) {
    return {
      type: "full-house",
      rank: 7,
      values: [groups.trips[0], groups.pairs[0]],
      label: `Full House, ${rankName(groups.trips[0])}s full of ${rankName(groups.pairs[0])}s`,
    };
  }

  // Flush
  if (isFlush) {
    return { type: "flush", rank: 6, values: ranks, label: `Flush, ${rankName(ranks[0])} high` };
  }

  // Straight
  if (isStraight || isWheel) {
    const highCard = isWheel ? 5 : ranks[0];
    return { type: "straight", rank: 5, values: [highCard], label: `Straight, ${rankName(highCard)} high` };
  }

  // Three of a kind
  if (groups.trips.length === 1) {
    const kickers = ranks.filter((r) => r !== groups.trips[0]);
    return {
      type: "three-of-a-kind",
      rank: 4,
      values: [groups.trips[0], ...kickers],
      label: `Three of a Kind, ${rankName(groups.trips[0])}s`,
    };
  }

  // Two pair
  if (groups.pairs.length === 2) {
    const highPair = Math.max(...groups.pairs);
    const lowPair = Math.min(...groups.pairs);
    const kicker = ranks.find((r) => r !== highPair && r !== lowPair)!;
    return {
      type: "two-pair",
      rank: 3,
      values: [highPair, lowPair, kicker],
      label: `Two Pair, ${rankName(highPair)}s and ${rankName(lowPair)}s`,
    };
  }

  // One pair
  if (groups.pairs.length === 1) {
    const kickers = ranks.filter((r) => r !== groups.pairs[0]);
    return {
      type: "pair",
      rank: 2,
      values: [groups.pairs[0], ...kickers],
      label: `Pair of ${rankName(groups.pairs[0])}s`,
    };
  }

  // High card
  return { type: "high-card", rank: 1, values: ranks, label: `${rankName(ranks[0])} High` };
}

/**
 * Evaluate a 3-card front hand.
 * Only three hand types are possible:
 * 3 - Three of a Kind
 * 2 - One Pair
 * 1 - High Card
 *
 * (No straights or flushes in 3-card front hand per standard Chinese Poker rules)
 */
export function evaluate3Card(cards: Card[]): HandEvaluation {
  if (cards.length !== 3) throw new Error("Must evaluate exactly 3 cards");

  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const rankCounts = getRankCounts(ranks);
  const groups = getGroups(rankCounts);

  // Three of a kind
  if (groups.trips.length === 1) {
    return {
      type: "three-of-a-kind" as FrontHandRankType,
      rank: 3,
      values: [groups.trips[0]],
      label: `Three ${rankName(groups.trips[0])}s`,
    };
  }

  // One pair
  if (groups.pairs.length === 1) {
    const kicker = ranks.find((r) => r !== groups.pairs[0])!;
    return {
      type: "pair" as FrontHandRankType,
      rank: 2,
      values: [groups.pairs[0], kicker],
      label: `Pair of ${rankName(groups.pairs[0])}s`,
    };
  }

  // High card
  return {
    type: "high-card" as FrontHandRankType,
    rank: 1,
    values: ranks,
    label: `${rankName(ranks[0])} High`,
  };
}

/**
 * Compare two hand evaluations.
 * Returns positive if hand1 wins, negative if hand2 wins, 0 for tie.
 */
export function compareHands(a: HandEvaluation, b: HandEvaluation): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  // Compare tiebreak values
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    const aVal = a.values[i] ?? 0;
    const bVal = b.values[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

// --- Helpers ---

function checkStraight(sortedRanks: number[]): boolean {
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) return false;
  }
  return true;
}

function getRankCounts(ranks: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  return counts;
}

function getGroups(counts: Map<number, number>) {
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];

  for (const [rank, count] of counts) {
    if (count === 4) quads.push(rank);
    else if (count === 3) trips.push(rank);
    else if (count === 2) pairs.push(rank);
  }

  quads.sort((a, b) => b - a);
  trips.sort((a, b) => b - a);
  pairs.sort((a, b) => b - a);

  return { quads, trips, pairs };
}

function rankName(rank: number): string {
  const names: Record<number, string> = {
    14: "Ace",
    13: "King",
    12: "Queen",
    11: "Jack",
    10: "Ten",
    9: "Nine",
    8: "Eight",
    7: "Seven",
    6: "Six",
    5: "Five",
    4: "Four",
    3: "Three",
    2: "Two",
  };
  return names[rank] || String(rank);
}
