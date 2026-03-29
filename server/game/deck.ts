import { Card, Suit, Rank } from "../../shared/types.js";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit[0]}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle with crypto-grade randomness */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deal 13 cards to each player */
export function dealCards(playerCount: number): Card[][] {
  const deck = shuffleDeck(createDeck());
  const hands: Card[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.slice(i * 13, (i + 1) * 13));
  }
  return hands;
}

export function suitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    spades: "\u2660",
    hearts: "\u2665",
    diamonds: "\u2666",
    clubs: "\u2663",
  };
  return symbols[suit];
}

export function rankLabel(rank: Rank): string {
  if (rank <= 10) return String(rank);
  const labels: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  return labels[rank];
}
