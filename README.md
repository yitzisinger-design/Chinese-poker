# Chinese Poker

A real-time multiplayer Chinese Poker game built with Next.js, React, TypeScript, Tailwind CSS, and Socket.io.

Players create or join private rooms using a short room code, arrange 13 cards into three hands, and compete head-to-head with full scoring.
## Quick Start

```bash
npm install
npm run dev
```

This starts both the Next.js frontend (port 3000) and the Socket.io server (port 3001) concurrently.

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Game Rules

### Overview

Chinese Poker is played with a standard 52-card deck. Each player receives 13 cards and must arrange them into three hands:

| Hand | Cards | Strength |
|------|-------|----------|
| **Back** | 5 cards | Must be the strongest |
| **Middle** | 5 cards | Must be stronger than Front |
| **Front** | 3 cards | Must be the weakest |

### Hand Rankings

**5-card hands** (Back and Middle) use standard poker rankings:

1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight (A-2-3-4-5 "wheel" is the lowest straight)
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

**3-card hands** (Front) only recognize:

1. Three of a Kind
2. One Pair
3. High Card

No straights or flushes are counted in the 3-card front hand.

### Fouls

If a player's hand ordering is invalid (e.g., front is stronger than middle, or middle is stronger than back), the hand is a **foul**. A fouled hand automatically loses all three rows to every opponent, scored as a sweep (-6 points per opponent).

### Scoring

After all players submit, each player is compared head-to-head against every other player:

- **Win a row**: +1 point from that opponent
- **Lose a row**: -1 point to that opponent
- **Tie**: 0 points
- **Sweep** (win all 3 rows): +3 bonus points (6 total instead of 3)
- **Double foul** (both players foul): 0 points exchanged

Points are zero-sum across each head-to-head comparison. Running totals are tracked across rounds.

## Multiplayer Architecture

```
Browser (Next.js)  <──Socket.io──>  Node.js Server
                                       │
                                   Room Manager
                                   (in-memory)
                                       │
                                   Game Engine
                                  ┌────┬────┬────┐
                                Deck  Eval  Valid Score
```

### Server Authority

The server is the single source of truth for all game state:

- **Deck shuffling and dealing** happens server-side only. Players receive their 13 cards via a private socket event.
- **Hand validation** runs on the server. The server verifies that submitted cards match the dealt cards, counts are correct (3/5/5), and no cards are duplicated.
- **Foul detection** is computed server-side. Fouls are accepted but penalized.
- **Scoring** is computed server-side after all players submit. Opponent hands are never revealed until all submissions are in.

### Real-Time Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `room:create` | Client → Server | Create a new room |
| `room:join` | Client → Server | Join an existing room |
| `room:start` | Client → Server | Host starts the game |
| `game:submit` | Client → Server | Player locks in hand |
| `game:next-round` | Client → Server | Host starts next round |
| `room:state` | Server → Client | Full room state update |
| `game:cards` | Server → Client | Private card deal to player |
| `game:player-submitted` | Server → Clients | Notify that a player submitted |
| `game:round-result` | Server → Clients | Scoring results after all submit |

### Anti-Cheat Protections

- Cards are dealt server-side; clients never see the deck
- Submitted cards are verified against the dealt hand
- Opponent arrangements are hidden until all players submit
- Room state broadcasts use a `ClientRoomState` type that excludes secret data (dealt cards, partial submissions)
- All mutations require a valid playerId that matches the socket connection

## Room Codes and Reconnect Logic

### Room Codes

- 4-character alphanumeric codes (e.g., `ABCD`, `X7KP`)
- Character set excludes `I`, `O`, `0`, `1` to avoid visual ambiguity
- Generated randomly; collisions are checked against active rooms
- Rooms expire after 4 hours of inactivity

### Reconnect Logic

When a player disconnects (browser close, network drop):

1. The server marks them as `isConnected: false` but preserves their seat
2. Other players see a "Disconnected" indicator
3. When the player returns, they can rejoin using their stored `playerId` from `sessionStorage`
4. The server restores their seat, re-sends their cards if mid-game, and broadcasts a reconnect event
5. If a player refreshes, the home page detects the saved session and auto-rejoins

Session data stored in `sessionStorage`:
- `cp_player_id` — unique player identifier
- `cp_player_name` — display name
- `cp_room_code` — current room code

## Project Structure

```
chinese-poker/
├── shared/
│   └── types.ts              # Shared TypeScript types (client + server)
├── server/
│   ├── index.ts              # Socket.io server entry point
│   ├── rooms/
│   │   └── manager.ts        # Room lifecycle, player management
│   └── game/
│       ├── deck.ts           # Deck creation, Fisher-Yates shuffle, dealing
│       ├── evaluator.ts      # 3-card and 5-card hand evaluation
│       ├── validator.ts      # Hand validation and foul detection
│       └── scorer.ts         # Head-to-head scoring with sweep bonus
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home — create/join room
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Global styles and animations
│   │   ├── lobby/[code]/
│   │   │   └── page.tsx      # Lobby — player list, start game
│   │   └── game/[code]/
│   │       └── page.tsx      # Game — card arrangement, results
│   ├── components/
│   │   ├── Card.tsx          # Card display + draggable card
│   │   ├── HandZone.tsx      # Droppable zone for front/middle/back
│   │   ├── PlayerSlot.tsx    # Player avatar, status, score
│   │   ├── ResultsView.tsx   # Round results with head-to-head breakdown
│   │   ├── RoomCodeDisplay.tsx # Room code with copy button
│   │   └── Scoreboard.tsx    # Running score rankings
│   ├── hooks/
│   │   └── useSocket.ts      # Socket.io React hook with all game actions
│   └── lib/
│       ├── socket.ts         # Singleton Socket.io client
│       ├── constants.ts      # Suit symbols, rank labels, session keys
│       └── evaluate.ts       # Client-side hand evaluation for live warnings
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.ts
```

## Pages and Flow

### 1. Home (`/`)
- Enter your name
- **Create Room** — generates a new room, redirects to lobby
- **Join Room** — enter a 4-character code, redirects to lobby
- Auto-detects existing sessions and attempts rejoin

### 2. Lobby (`/lobby/[code]`)
- Displays room code with copy-to-clipboard
- Shows 4 player seats (filled or waiting)
- Host badge and connection status indicators
- Host clicks "Start Game" when 2+ players are connected
- Non-host players see a "Waiting for host" message

### 3. Game (`/game/[code]`)
- **Arranging phase**: 13 cards displayed, drag-and-drop or click-to-place into Back/Middle/Front zones
- Live hand evaluation labels (e.g., "Pair of Kings") update as you arrange
- Live foul warnings if hand ordering is invalid
- **Auto-Arrange**: places strongest 5 in back, next 5 in middle, weakest 3 in front
- **Sort**: sorts cards by rank within each zone
- **Reset**: moves all cards back to unassigned
- **Lock In**: submits hand to server (irreversible for the round)
- After submitting, shows "Waiting for other players" with a submitted-player indicator
- Sidebar shows player list with submission status and scoreboard

### 4. Results (same page, results phase)
- All player hands revealed with evaluation labels
- Foul badges shown where applicable
- Head-to-head breakdowns showing row-by-row winners
- Sweep highlights
- Point changes per matchup
- Running total scoreboard
- Host clicks "Next Round" to deal again

## Technical Details

### Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework with file-based routing |
| `react` / `react-dom` | UI library |
| `socket.io` / `socket.io-client` | Real-time bidirectional communication |
| `@dnd-kit/core` / `@dnd-kit/utilities` | Drag-and-drop card arrangement |
| `tailwindcss` | Utility-first CSS |
| `tsx` | TypeScript execution for the server |
| `concurrently` | Run frontend + backend simultaneously |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Socket.io server URL |
| `SOCKET_PORT` | `3001` | Port for the Socket.io server |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in dev mode |
| `npm run dev:client` | Start Next.js dev server only |
| `npm run dev:server` | Start Socket.io server with hot reload |
| `npm run build` | Production build of the Next.js frontend |
| `npm start` | Start both servers in production mode |

## Rule Variations

This implementation uses the following standard ruleset choices:

- **No royalties/bonuses** for specific hand types (e.g., no bonus for four-of-a-kind in back). This keeps scoring simple and consistent.
- **No naturals** — there is no automatic win for receiving a sorted 13-card hand.
- **Front hand uses only High Card, Pair, Three of a Kind** — no straights or flushes in the 3-card hand.
- **Ace-low straight** (A-2-3-4-5, "the wheel") is recognized as the lowest straight.
- **Sweep bonus is +3** — winning all 3 rows against an opponent awards 3 bonus points (6 total net).
- **Fouls are accepted but penalized** — a fouled hand is treated as an automatic sweep loss (-6) to each opponent.
- **Double foul** — if both players in a matchup fouled, neither gains or loses points.
