"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Card as CardType, HandPosition } from "../../../../shared/types";
import { useSocket } from "@/hooks/useSocket";
import { SESSION_KEYS } from "@/lib/constants";
import { evaluate3Card, evaluate5Card, compareEvals } from "@/lib/evaluate";
import { DraggableCard, CardDisplay } from "@/components/Card";
import { HandZone } from "@/components/HandZone";
import { PlayerSlot } from "@/components/PlayerSlot";
import { Scoreboard } from "@/components/Scoreboard";
import { ResultsView } from "@/components/ResultsView";

type Arrangement = {
  front: CardType[];
  middle: CardType[];
  back: CardType[];
  unassigned: CardType[];
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const {
    connected,
    roomState,
    myCards,
    roundResult,
    submittedPlayers,
    submitHand,
    nextRound,
    joinRoom,
  } = useSocket();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [arrangement, setArrangement] = useState<Arrangement>({
    front: [],
    middle: [],
    back: [],
    unassigned: [],
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeDragCard, setActiveDragCard] = useState<CardType | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Restore session
  useEffect(() => {
    const savedId = sessionStorage.getItem(SESSION_KEYS.PLAYER_ID);
    const savedCode = sessionStorage.getItem(SESSION_KEYS.ROOM_CODE);
    const savedName = sessionStorage.getItem(SESSION_KEYS.PLAYER_NAME);

    if (savedId && savedCode === code) {
      setPlayerId(savedId);
      if (connected && savedName) {
        joinRoom(code, savedName, savedId).catch(() => {
          router.push("/");
        });
      }
    } else {
      router.push("/");
    }
  }, [code, connected, joinRoom, router]);

  // When new cards arrive, reset arrangement
  useEffect(() => {
    if (myCards.length > 0) {
      setArrangement({
        front: [],
        middle: [],
        back: [],
        unassigned: [...myCards],
      });
      setHasSubmitted(false);
      setError("");
      setSelectedCardId(null);
    }
  }, [myCards]);

  // Navigate to lobby if phase goes back to lobby
  useEffect(() => {
    if (roomState?.phase === "lobby") {
      router.push(`/lobby/${code}`);
    }
  }, [roomState?.phase, code, router]);

  // Find which zone a card is in
  const findCardZone = useCallback(
    (cardId: string): keyof Arrangement | null => {
      for (const zone of ["front", "middle", "back", "unassigned"] as const) {
        if (arrangement[zone].some((c) => c.id === cardId)) return zone;
      }
      return null;
    },
    [arrangement]
  );

  const zoneLimits: Record<string, number> = { front: 3, middle: 5, back: 5, unassigned: 13 };

  // Handle card click (tap-to-place mode)
  const handleCardClick = useCallback(
    (card: CardType) => {
      if (hasSubmitted) return;

      if (selectedCardId === card.id) {
        setSelectedCardId(null);
        return;
      }

      if (selectedCardId) {
        // Move selected card to the zone of the clicked card, swap if needed
        setSelectedCardId(null);
        return;
      }

      setSelectedCardId(card.id);
    },
    [selectedCardId, hasSubmitted]
  );

  // Handle clicking a zone when a card is selected
  const handleZoneClick = useCallback(
    (targetZone: HandPosition | "unassigned") => {
      if (!selectedCardId || hasSubmitted) return;

      const sourceZone = findCardZone(selectedCardId);
      if (!sourceZone || sourceZone === targetZone) {
        setSelectedCardId(null);
        return;
      }

      const card = arrangement[sourceZone].find((c) => c.id === selectedCardId);
      if (!card) return;

      const limit = zoneLimits[targetZone];
      if (arrangement[targetZone].length >= limit) {
        setSelectedCardId(null);
        return;
      }

      setArrangement((prev) => ({
        ...prev,
        [sourceZone]: prev[sourceZone].filter((c) => c.id !== selectedCardId),
        [targetZone]: [...prev[targetZone], card],
      }));
      setSelectedCardId(null);
    },
    [selectedCardId, arrangement, findCardZone, hasSubmitted]
  );

  // Drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as CardType;
    setActiveDragCard(card);
    setSelectedCardId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const sourceZone = findCardZone(cardId);
    if (!sourceZone) return;

    // Determine target zone from droppable id
    const overId = over.id as string;
    let targetZone: keyof Arrangement | null = null;

    if (overId.startsWith("zone-")) {
      targetZone = overId.replace("zone-", "") as keyof Arrangement;
    } else {
      // Dropped on another card - find its zone
      targetZone = findCardZone(overId);
    }

    if (!targetZone || targetZone === sourceZone) return;

    const limit = zoneLimits[targetZone];
    if (arrangement[targetZone].length >= limit) return;

    const card = arrangement[sourceZone].find((c) => c.id === cardId);
    if (!card) return;

    setArrangement((prev) => ({
      ...prev,
      [sourceZone]: prev[sourceZone].filter((c) => c.id !== cardId),
      [targetZone!]: [...prev[targetZone!], card],
    }));
  };

  // Auto-sort: sort cards by rank within each zone
  const autoSort = useCallback(() => {
    setArrangement((prev) => ({
      front: [...prev.front].sort((a, b) => b.rank - a.rank),
      middle: [...prev.middle].sort((a, b) => b.rank - a.rank),
      back: [...prev.back].sort((a, b) => b.rank - a.rank),
      unassigned: [...prev.unassigned].sort((a, b) => b.rank - a.rank),
    }));
  }, []);

  // Auto-arrange: simple algorithm to arrange cards
  const autoArrange = useCallback(() => {
    const allCards = [
      ...arrangement.front,
      ...arrangement.middle,
      ...arrangement.back,
      ...arrangement.unassigned,
    ].sort((a, b) => b.rank - a.rank);

    // Simple strategy: strongest 5 in back, next 5 in middle, weakest 3 in front
    const back = allCards.slice(0, 5);
    const middle = allCards.slice(5, 10);
    const front = allCards.slice(10, 13);

    setArrangement({ front, middle, back, unassigned: [] });
  }, [arrangement]);

  // Reset all cards to unassigned
  const resetArrangement = useCallback(() => {
    const allCards = [
      ...arrangement.front,
      ...arrangement.middle,
      ...arrangement.back,
      ...arrangement.unassigned,
    ];
    setArrangement({ front: [], middle: [], back: [], unassigned: allCards });
    setSelectedCardId(null);
  }, [arrangement]);

  // Validation warnings using real hand evaluation
  const warnings = useMemo(() => {
    const w: Record<HandPosition, string | null> = { front: null, middle: null, back: null };

    const frontFull = arrangement.front.length === 3;
    const middleFull = arrangement.middle.length === 5;
    const backFull = arrangement.back.length === 5;

    if (frontFull && middleFull) {
      const frontEval = evaluate3Card(arrangement.front);
      const middleEval = evaluate5Card(arrangement.middle);
      if (middleEval.rank < frontEval.rank || (middleEval.rank === frontEval.rank && compareEvals(middleEval, frontEval) < 0)) {
        w.front = `Front (${frontEval.label}) is stronger than middle (${middleEval.label}) — FOUL`;
      }
    }

    if (middleFull && backFull) {
      const middleEval = evaluate5Card(arrangement.middle);
      const backEval = evaluate5Card(arrangement.back);
      if (compareEvals(backEval, middleEval) < 0) {
        w.middle = `Middle (${middleEval.label}) is stronger than back (${backEval.label}) — FOUL`;
      }
    }

    return w;
  }, [arrangement]);

  const canSubmit =
    arrangement.front.length === 3 &&
    arrangement.middle.length === 5 &&
    arrangement.back.length === 5 &&
    arrangement.unassigned.length === 0;

  const handleSubmit = async () => {
    if (!playerId || !canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await submitHand(code, playerId, {
        front: arrangement.front,
        middle: arrangement.middle,
        back: arrangement.back,
      });
      setHasSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextRound = async () => {
    if (!playerId) return;
    try {
      await nextRound(code, playerId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start next round");
    }
  };

  const currentPlayer = roomState?.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const isResults = roomState?.phase === "results";

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">
                Chinese Poker
                <span className="text-white/40 text-sm ml-3 font-mono">{code}</span>
              </h1>
              <span className="text-white/40 text-sm">Round {roomState?.round || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main game area */}
            <div className="lg:col-span-3">
              {isResults && roundResult ? (
                <div className="space-y-4">
                  <ResultsView
                    result={roundResult}
                    players={roomState?.players || []}
                    currentPlayerId={playerId || ""}
                    scores={roomState?.scores || {}}
                  />

                  {isHost ? (
                    <button
                      onClick={handleNextRound}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                    >
                      Next Round
                    </button>
                  ) : (
                    <div className="text-center py-3 text-white/40 animate-soft-pulse">
                      Waiting for host to start next round...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Hand zones - Back, Middle, Front (top to bottom = strongest to weakest) */}
                  <div onClick={() => handleZoneClick("back")}>
                    <HandZone
                      position="back"
                      cards={arrangement.back}
                      maxCards={5}
                      onCardClick={handleCardClick}
                      selectedCardId={selectedCardId}
                      isActive={!hasSubmitted}
                      readOnly={hasSubmitted}
                      label="Back Hand"
                      sublabel={arrangement.back.length === 5 ? evaluate5Card(arrangement.back).label : "strongest, 5 cards"}
                      warning={warnings.back}
                    />
                  </div>

                  <div onClick={() => handleZoneClick("middle")}>
                    <HandZone
                      position="middle"
                      cards={arrangement.middle}
                      maxCards={5}
                      onCardClick={handleCardClick}
                      selectedCardId={selectedCardId}
                      isActive={!hasSubmitted}
                      readOnly={hasSubmitted}
                      label="Middle Hand"
                      sublabel={arrangement.middle.length === 5 ? evaluate5Card(arrangement.middle).label : "5 cards"}
                      warning={warnings.middle}
                    />
                  </div>

                  <div onClick={() => handleZoneClick("front")}>
                    <HandZone
                      position="front"
                      cards={arrangement.front}
                      maxCards={3}
                      onCardClick={handleCardClick}
                      selectedCardId={selectedCardId}
                      isActive={!hasSubmitted}
                      readOnly={hasSubmitted}
                      label="Front Hand"
                      sublabel={arrangement.front.length === 3 ? evaluate3Card(arrangement.front).label : "weakest, 3 cards"}
                      warning={warnings.front}
                    />
                  </div>

                  {/* Unassigned cards */}
                  {!hasSubmitted && arrangement.unassigned.length > 0 && (
                    <div
                      className="bg-black/30 rounded-xl p-3 border border-white/10"
                      onClick={() => handleZoneClick("unassigned")}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-sm font-semibold">
                          Your Cards ({arrangement.unassigned.length} remaining)
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {arrangement.unassigned
                          .sort((a, b) => b.rank - a.rank || a.suit.localeCompare(b.suit))
                          .map((card) => (
                            <DraggableCard
                              key={card.id}
                              card={card}
                              isSelected={selectedCardId === card.id}
                              onClick={() => handleCardClick(card)}
                              size="md"
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  {!hasSubmitted && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={autoArrange}
                        className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-all border border-white/10"
                      >
                        Auto-Arrange
                      </button>
                      <button
                        onClick={autoSort}
                        className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-all border border-white/10"
                      >
                        Sort Cards
                      </button>
                      <button
                        onClick={resetArrangement}
                        className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-all border border-white/10"
                      >
                        Reset
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold px-8 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {submitting ? "Submitting..." : "Lock In"}
                      </button>
                    </div>
                  )}

                  {hasSubmitted && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                      <p className="text-green-400 font-semibold">Hand submitted!</p>
                      <p className="text-white/40 text-sm mt-1 animate-soft-pulse">
                        Waiting for other players...
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Players */}
              <div className="space-y-2">
                {roomState?.players.map((player) => (
                  <PlayerSlot
                    key={player.id}
                    player={player}
                    score={roomState.scores[player.id] || 0}
                    isCurrentPlayer={player.id === playerId}
                    hasSubmitted={submittedPlayers.has(player.id)}
                    seatIndex={player.seatIndex}
                  />
                ))}
              </div>

              {/* Scoreboard */}
              {roomState && (
                <Scoreboard
                  players={roomState.players}
                  scores={roomState.scores}
                  currentPlayerId={playerId || undefined}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragCard && (
          <CardDisplay card={activeDragCard} size="md" className="rotate-3 shadow-2xl" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
