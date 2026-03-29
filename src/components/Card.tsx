"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Card as CardType } from "../../shared/types";
import { SUIT_SYMBOLS, SUIT_COLORS, rankLabel } from "@/lib/constants";

interface CardProps {
  card: CardType;
  isDragging?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  className?: string;
}

export function CardDisplay({
  card,
  isSelected,
  onClick,
  size = "md",
  faceDown,
  className = "",
}: CardProps) {
  const sizeClasses = {
    sm: "w-14 h-20 text-sm",
    md: "w-[4.5rem] h-[6.5rem] text-base",
    lg: "w-24 h-36 text-lg",
  };

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 border-gray-600 bg-gradient-to-br from-blue-800 to-blue-950 shadow-md flex items-center justify-center ${className}`}
      >
        <div className="w-3/4 h-3/4 rounded border border-blue-600 bg-blue-900 flex items-center justify-center">
          <span className="text-blue-400 text-lg font-bold">?</span>
        </div>
      </div>
    );
  }

  const colorClass = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const label = rankLabel(card.rank);

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]} rounded-lg border-2 bg-white shadow-md cursor-pointer
        select-none relative flex flex-col justify-between p-1.5
        transition-all duration-150
        ${isSelected ? "border-yellow-400 ring-2 ring-yellow-400 -translate-y-2 shadow-lg" : "border-gray-300 hover:border-gray-400 hover:shadow-lg"}
        ${className}
      `}
    >
      <div className={`${colorClass} font-bold leading-none`}>
        <div className="text-[1.1em]">{label}</div>
        <div className="text-[0.8em]">{symbol}</div>
      </div>
      <div className={`${colorClass} text-center text-2xl`}>{symbol}</div>
      <div className={`${colorClass} font-bold leading-none self-end rotate-180`}>
        <div className="text-[1.1em]">{label}</div>
        <div className="text-[0.8em]">{symbol}</div>
      </div>
    </div>
  );
}

interface DraggableCardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export function DraggableCard({ card, isSelected, onClick, size = "md" }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CardDisplay
        card={card}
        isSelected={isSelected}
        onClick={onClick}
        size={size}
        isDragging={isDragging}
      />
    </div>
  );
}
