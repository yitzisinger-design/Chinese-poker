export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string; // e.g. "14s" for Ace of Spades
  suit: Suit;
  rank: Rank;
}

export type HandPosition = "front" | "middle" | "back";

export interface PlayerHand {
  front: Card[]; // 3 cards
  middle: Card[]; // 5 cards
  back: Card[]; // 5 cards
}

export type HandRankType =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush"
  | "royal-flush";

export type FrontHandRankType =
  | "high-card"
  | "pair"
  | "three-of-a-kind";

export interface HandEvaluation {
  type: HandRankType | FrontHandRankType;
  rank: number; // numeric rank for ordering
  values: number[]; // for tiebreaking (descending significance)
  label: string; // human-readable label
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export type RoomPhase = "lobby" | "playing" | "results";

export interface Submission {
  playerId: string;
  hand: PlayerHand;
  evaluations: {
    front: HandEvaluation;
    middle: HandEvaluation;
    back: HandEvaluation;
  };
  isFoul: boolean;
}

export interface RowResult {
  winnerId: string | null; // null = tie
  loserId: string | null;
  row: HandPosition;
  winnerEval: HandEvaluation;
  loserEval: HandEvaluation;
}

export interface HeadToHeadResult {
  player1Id: string;
  player2Id: string;
  rows: {
    front: { winnerId: string | null; p1Eval: HandEvaluation; p2Eval: HandEvaluation };
    middle: { winnerId: string | null; p1Eval: HandEvaluation; p2Eval: HandEvaluation };
    back: { winnerId: string | null; p1Eval: HandEvaluation; p2Eval: HandEvaluation };
  };
  player1RowsWon: number;
  player2RowsWon: number;
  player1Points: number;
  player2Points: number;
  isSweep: boolean;
}

export interface RoundResult {
  headToHead: HeadToHeadResult[];
  pointChanges: Record<string, number>;
  submissions: Submission[];
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  players: Player[];
  scores: Record<string, number>;
  round: number;
  currentHands: Record<string, Card[]>; // dealt cards per player (server only)
  submissions: Record<string, Submission>;
  lastRoundResult: RoundResult | null;
  createdAt: number;
}

// Socket events - Client to Server
export interface ClientToServerEvents {
  "room:create": (data: { playerName: string }, cb: (res: { ok: true; code: string; playerId: string } | { ok: false; error: string }) => void) => void;
  "room:join": (data: { code: string; playerName: string; rejoinPlayerId?: string }, cb: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void) => void;
  "room:start": (data: { code: string; playerId: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  "game:submit": (data: { code: string; playerId: string; hand: PlayerHand }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  "game:next-round": (data: { code: string; playerId: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
}

// Socket events - Server to Client
export interface ServerToClientEvents {
  "room:state": (state: ClientRoomState) => void;
  "game:cards": (cards: Card[]) => void;
  "game:player-submitted": (playerId: string) => void;
  "game:round-result": (result: RoundResult) => void;
  "room:error": (error: string) => void;
  "room:player-disconnected": (playerId: string) => void;
  "room:player-reconnected": (playerId: string) => void;
}

// What the client sees (no secret info)
export interface ClientRoomState {
  code: string;
  phase: RoomPhase;
  players: Player[];
  scores: Record<string, number>;
  round: number;
  submittedPlayerIds: string[];
  lastRoundResult: RoundResult | null;
}
