import type { Suit, Rank } from "../../shared/types";

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "\u2660",
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: "text-gray-900",
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-gray-900",
};

export function rankLabel(rank: Rank | number): string {
  if (rank <= 10) return String(rank);
  const labels: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  return labels[rank] || String(rank);
}

export const SESSION_KEYS = {
  PLAYER_ID: "cp_player_id",
  PLAYER_NAME: "cp_player_name",
  ROOM_CODE: "cp_room_code",
} as const;
