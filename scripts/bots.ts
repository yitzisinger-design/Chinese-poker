/**
 * Bot script — connects N bot players to a room and auto-plays.
 * Usage: npx tsx scripts/bots.ts <ROOM_CODE> [NUM_BOTS]
 */
import { io } from "socket.io-client";
import type { Card, ClientRoomState, RoundResult } from "../shared/types";

const ROOM_CODE = process.argv[2]?.toUpperCase();
const NUM_BOTS = parseInt(process.argv[3] || "3", 10);
const SERVER = process.env.SOCKET_URL || "http://localhost:3001";

if (!ROOM_CODE) {
  console.error("Usage: npx tsx scripts/bots.ts <ROOM_CODE> [NUM_BOTS]");
  process.exit(1);
}

const BOT_NAMES = ["Bot Alice", "Bot Bob", "Bot Carol", "Bot Dave"];

interface BotState {
  name: string;
  playerId: string | null;
  cards: Card[];
  submitted: boolean;
}

function arrangCards(cards: Card[]): { front: Card[]; middle: Card[]; back: Card[] } {
  // Sort by rank descending
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  // Simple strategy: strongest 5 in back, next 5 in middle, weakest 3 in front
  const back = sorted.slice(0, 5);
  const middle = sorted.slice(5, 10);
  const front = sorted.slice(10, 13);
  return { front, middle, back };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startBot(index: number) {
  const bot: BotState = {
    name: BOT_NAMES[index] || `Bot ${index + 1}`,
    playerId: null,
    cards: [],
    submitted: false,
  };

  const socket = io(SERVER, {
    reconnection: true,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log(`[${bot.name}] Connected`);

    // Join the room
    socket.emit("room:join", { code: ROOM_CODE, playerName: bot.name }, (res: any) => {
      if (res.ok) {
        bot.playerId = res.playerId;
        console.log(`[${bot.name}] Joined room ${ROOM_CODE}`);
      } else {
        console.error(`[${bot.name}] Failed to join: ${res.error}`);
      }
    });
  });

  socket.on("game:cards", async (cards: Card[]) => {
    bot.cards = cards;
    bot.submitted = false;
    console.log(`[${bot.name}] Received ${cards.length} cards`);

    // Wait a random delay (1-4 seconds) to feel more natural
    const waitTime = 1000 + Math.random() * 3000;
    await delay(waitTime);

    // Arrange and submit
    const hand = arrangCards(cards);
    socket.emit(
      "game:submit",
      { code: ROOM_CODE, playerId: bot.playerId, hand },
      (res: any) => {
        if (res.ok) {
          bot.submitted = true;
          console.log(`[${bot.name}] Submitted hand`);
        } else {
          console.error(`[${bot.name}] Submit failed: ${res.error}`);
        }
      }
    );
  });

  socket.on("game:round-result", (result: RoundResult) => {
    const points = result.pointChanges[bot.playerId!] || 0;
    console.log(`[${bot.name}] Round result: ${points > 0 ? "+" : ""}${points} points`);
  });

  socket.on("room:state", (state: ClientRoomState) => {
    // Reset submitted flag on new round
    if (state.phase === "playing" && bot.submitted) {
      bot.submitted = false;
    }
  });

  socket.on("disconnect", () => {
    console.log(`[${bot.name}] Disconnected`);
  });
}

console.log(`Starting ${NUM_BOTS} bots for room ${ROOM_CODE}...`);
for (let i = 0; i < NUM_BOTS; i++) {
  startBot(i);
}
