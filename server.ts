/**
 * Combined Next.js + Socket.io server.
 * Runs both on a single port for easy deployment.
 */
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "./shared/types.js";
import {
  createRoom,
  joinRoom,
  startGame,
  submitHand,
  nextRound,
  handleDisconnect,
  getRoom,
  getPlayerCards,
  getClientState,
} from "./server/rooms/manager.js";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: dev
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : undefined,
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    console.log(`[connect] ${socket.id}`);

    socket.on("room:create", (data, cb) => {
      try {
        const { code, playerId } = createRoom(data.playerName, socket.id);
        socket.join(code);
        const room = getRoom(code)!;
        io.to(code).emit("room:state", getClientState(room));
        cb({ ok: true, code, playerId });
        console.log(`[room:create] ${data.playerName} created room ${code}`);
      } catch (err) {
        cb({ ok: false, error: "Failed to create room" });
      }
    });

    socket.on("room:join", (data, cb) => {
      try {
        const result = joinRoom(data.code, data.playerName, socket.id, data.rejoinPlayerId);
        if ("error" in result) {
          cb({ ok: false, error: result.error });
          return;
        }

        const code = data.code.toUpperCase();
        socket.join(code);
        const room = getRoom(code)!;
        io.to(code).emit("room:state", getClientState(room));

        if (room.phase === "playing") {
          const cards = getPlayerCards(code, result.playerId);
          if (cards) {
            socket.emit("game:cards", cards);
          }
          io.to(code).emit("room:player-reconnected", result.playerId);
        }

        cb({ ok: true, playerId: result.playerId });
        console.log(`[room:join] ${data.playerName} joined room ${code}`);
      } catch (err) {
        cb({ ok: false, error: "Failed to join room" });
      }
    });

    socket.on("room:start", (data, cb) => {
      try {
        const result = startGame(data.code, data.playerId);
        if (result.error) {
          cb({ ok: false, error: result.error });
          return;
        }

        const room = getRoom(data.code)!;
        io.to(data.code).emit("room:state", getClientState(room));

        for (const player of room.players) {
          if (player.isConnected) {
            const cards = getPlayerCards(data.code, player.id);
            if (cards) {
              io.to(player.socketId).emit("game:cards", cards);
            }
          }
        }

        cb({ ok: true });
        console.log(`[room:start] Game started in room ${data.code}, round ${room.round}`);
      } catch (err) {
        cb({ ok: false, error: "Failed to start game" });
      }
    });

    socket.on("game:submit", (data, cb) => {
      try {
        const result = submitHand(data.code, data.playerId, data.hand);
        if (result.error) {
          cb({ ok: false, error: result.error });
          return;
        }

        io.to(data.code).emit("game:player-submitted", data.playerId);

        if (result.allSubmitted && result.result) {
          const room = getRoom(data.code)!;
          io.to(data.code).emit("game:round-result", result.result);
          io.to(data.code).emit("room:state", getClientState(room));
          console.log(`[game:submit] All players submitted in room ${data.code}`);
        }

        cb({ ok: true });
      } catch (err) {
        cb({ ok: false, error: "Failed to submit hand" });
      }
    });

    socket.on("game:next-round", (data, cb) => {
      try {
        const result = nextRound(data.code, data.playerId);
        if (result.error) {
          cb({ ok: false, error: result.error });
          return;
        }

        const room = getRoom(data.code)!;
        io.to(data.code).emit("room:state", getClientState(room));

        for (const player of room.players) {
          if (player.isConnected) {
            const cards = getPlayerCards(data.code, player.id);
            if (cards) {
              io.to(player.socketId).emit("game:cards", cards);
            }
          }
        }

        cb({ ok: true });
        console.log(`[game:next-round] Round ${room.round} started in room ${data.code}`);
      } catch (err) {
        cb({ ok: false, error: "Failed to start next round" });
      }
    });

    socket.on("disconnect", () => {
      const info = handleDisconnect(socket.id);
      if (info) {
        io.to(info.code).emit("room:player-disconnected", info.playerId);
        const room = getRoom(info.code);
        if (room) {
          io.to(info.code).emit("room:state", getClientState(room));
        }
        console.log(`[disconnect] Player ${info.playerId} disconnected from room ${info.code}`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`Chinese Poker running on http://localhost:${port}`);
  });
});
