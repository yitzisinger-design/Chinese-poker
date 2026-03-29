import {
  RoomState,
  Player,
  ClientRoomState,
  PlayerHand,
  Submission,
  RoundResult,
  Card,
} from "../../shared/types.js";
import { dealCards } from "../game/deck.js";
import { evaluate3Card, evaluate5Card } from "../game/evaluator.js";
import { validateHand } from "../game/validator.js";
import { scoreRound } from "../game/scorer.js";

const rooms = new Map<string, RoomState>();
const playerToRoom = new Map<string, string>(); // playerId -> roomCode

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion
const ROOM_CODE_LENGTH = 4;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const ROOM_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

function generateRoomCode(): string {
  let code: string;
  do {
    code = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function generatePlayerId(): string {
  return "p_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function createRoom(playerName: string, socketId: string): { code: string; playerId: string } {
  cleanupExpiredRooms();

  const code = generateRoomCode();
  const playerId = generatePlayerId();

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    isHost: true,
    isConnected: true,
    seatIndex: 0,
  };

  const room: RoomState = {
    code,
    phase: "lobby",
    players: [player],
    scores: { [playerId]: 0 },
    round: 0,
    currentHands: {},
    submissions: {},
    lastRoundResult: null,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  playerToRoom.set(playerId, code);

  return { code, playerId };
}

export function joinRoom(
  code: string,
  playerName: string,
  socketId: string,
  rejoinPlayerId?: string
): { playerId: string } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Room not found" };

  // Handle rejoin
  if (rejoinPlayerId) {
    const existing = room.players.find((p) => p.id === rejoinPlayerId);
    if (existing) {
      existing.socketId = socketId;
      existing.isConnected = true;
      return { playerId: rejoinPlayerId };
    }
  }

  if (room.phase !== "lobby") {
    // Check if this is a disconnect/rejoin by name
    const disconnected = room.players.find(
      (p) => p.name === playerName && !p.isConnected
    );
    if (disconnected) {
      disconnected.socketId = socketId;
      disconnected.isConnected = true;
      return { playerId: disconnected.id };
    }
    return { error: "Game already in progress" };
  }

  if (room.players.length >= MAX_PLAYERS) {
    return { error: "Room is full (max 4 players)" };
  }

  // Check for duplicate names
  if (room.players.some((p) => p.name === playerName)) {
    return { error: "Name already taken in this room" };
  }

  const playerId = generatePlayerId();
  const seatIndex = getNextSeatIndex(room);

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    isHost: false,
    isConnected: true,
    seatIndex,
  };

  room.players.push(player);
  room.scores[playerId] = 0;
  playerToRoom.set(playerId, code);

  return { playerId };
}

export function startGame(code: string, playerId: string): { error?: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room not found" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player?.isHost) return { error: "Only the host can start the game" };

  const connectedCount = room.players.filter((p) => p.isConnected).length;
  if (connectedCount < MIN_PLAYERS) {
    return { error: `Need at least ${MIN_PLAYERS} players to start` };
  }

  // Deal cards
  room.round++;
  room.phase = "playing";
  room.submissions = {};
  room.lastRoundResult = null;

  const activePlayers = room.players.filter((p) => p.isConnected);
  const hands = dealCards(activePlayers.length);

  room.currentHands = {};
  activePlayers.forEach((p, i) => {
    room.currentHands[p.id] = hands[i];
  });

  return {};
}

export function submitHand(
  code: string,
  playerId: string,
  hand: PlayerHand
): { error?: string; allSubmitted?: boolean; result?: RoundResult } {
  const room = rooms.get(code);
  if (!room) return { error: "Room not found" };
  if (room.phase !== "playing") return { error: "Game is not in progress" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not in this room" };

  if (room.submissions[playerId]) {
    return { error: "Already submitted" };
  }

  const dealtCards = room.currentHands[playerId];
  if (!dealtCards) return { error: "No cards dealt to this player" };

  // Validate
  const validation = validateHand(hand, dealtCards);
  if (!validation.valid) {
    return { error: validation.errors.join("; ") };
  }

  // Evaluate hands
  const frontEval = evaluate3Card(hand.front);
  const middleEval = evaluate5Card(hand.middle);
  const backEval = evaluate5Card(hand.back);

  const submission: Submission = {
    playerId,
    hand,
    evaluations: { front: frontEval, middle: middleEval, back: backEval },
    isFoul: validation.isFoul,
  };

  room.submissions[playerId] = submission;

  // Check if all active players have submitted
  const activePlayers = room.players.filter((p) => p.isConnected);
  const allSubmitted = activePlayers.every((p) => room.submissions[p.id]);

  if (allSubmitted) {
    const submissions = activePlayers.map((p) => room.submissions[p.id]);
    const result = scoreRound(submissions);

    // Update scores
    for (const [pid, change] of Object.entries(result.pointChanges)) {
      room.scores[pid] = (room.scores[pid] || 0) + change;
    }

    room.lastRoundResult = result;
    room.phase = "results";

    return { allSubmitted: true, result };
  }

  return { allSubmitted: false };
}

export function nextRound(
  code: string,
  playerId: string
): { error?: string } {
  const room = rooms.get(code);
  if (!room) return { error: "Room not found" };
  if (room.phase !== "results") return { error: "Not in results phase" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player?.isHost) return { error: "Only the host can start the next round" };

  // Deal new cards
  room.round++;
  room.phase = "playing";
  room.submissions = {};
  room.lastRoundResult = null;

  const activePlayers = room.players.filter((p) => p.isConnected);
  const hands = dealCards(activePlayers.length);

  room.currentHands = {};
  activePlayers.forEach((p, i) => {
    room.currentHands[p.id] = hands[i];
  });

  return {};
}

export function handleDisconnect(socketId: string): { code: string; playerId: string } | null {
  for (const [code, room] of rooms) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.isConnected = false;
      return { code, playerId: player.id };
    }
  }
  return null;
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code.toUpperCase());
}

export function getPlayerCards(code: string, playerId: string): Card[] | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  return room.currentHands[playerId];
}

export function getClientState(room: RoomState): ClientRoomState {
  return {
    code: room.code,
    phase: room.phase,
    players: room.players,
    scores: room.scores,
    round: room.round,
    submittedPlayerIds: Object.keys(room.submissions),
    lastRoundResult: room.lastRoundResult,
  };
}

export function getRoomByPlayerId(playerId: string): RoomState | undefined {
  const code = playerToRoom.get(playerId);
  if (!code) return undefined;
  return rooms.get(code);
}

function getNextSeatIndex(room: RoomState): number {
  const taken = new Set(room.players.map((p) => p.seatIndex));
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!taken.has(i)) return i;
  }
  return room.players.length;
}

function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_EXPIRY_MS) {
      for (const player of room.players) {
        playerToRoom.delete(player.id);
      }
      rooms.delete(code);
    }
  }
}
