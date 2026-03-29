"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Card as CardType, HandPosition } from "../../shared/types";
import { DraggableCard, CardDisplay } from "./Card";

interface HandZoneProps {
  position: HandPosition;
  cards: CardType[];
  maxCards: number;
  onCardClick?: (card: CardType) => void;
  selectedCardId?: string | null;
  isActive?: boolean;
  label: string;
  sublabel?: string;
  readOnly?: boolean;
  warning?: string | null;
}

export function HandZone({
  position,
  cards,
  maxCards,
  onCardClick,
  selectedCardId,
  isActive = true,
  label,
  sublabel,
  readOnly = false,
  warning,
}: HandZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `zone-${position}`,
    data: { position },
    disabled: !isActive || readOnly,
  });

  const isFull = cards.length >= maxCards;

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl p-3 min-h-[7rem] transition-all duration-200
        ${isOver && !isFull ? "bg-green-900/40 ring-2 ring-green-400" : "bg-black/20"}
        ${isActive && !readOnly ? "border-2 border-dashed border-white/20" : "border-2 border-transparent"}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
            {label}
          </span>
          {sublabel && (
            <span className="text-white/50 text-xs ml-2">({sublabel})</span>
          )}
        </div>
        <span className={`text-xs font-mono ${cards.length === maxCards ? "text-green-400" : "text-white/40"}`}>
          {cards.length}/{maxCards}
        </span>
      </div>

      {warning && (
        <div className="text-yellow-400 text-xs mb-2 flex items-center gap-1">
          <span>!</span> {warning}
        </div>
      )}

      <div className="flex gap-2 flex-wrap min-h-[6.5rem] items-center">
        {cards.map((card) =>
          readOnly ? (
            <CardDisplay key={card.id} card={card} size="md" />
          ) : (
            <DraggableCard
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onClick={() => onCardClick?.(card)}
              size="md"
            />
          )
        )}
        {!readOnly && cards.length < maxCards && (
          <div className="w-[4.5rem] h-[6.5rem] rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
            <span className="text-white/20 text-2xl">+</span>
          </div>
        )}
      </div>
    </div>
  );
}
