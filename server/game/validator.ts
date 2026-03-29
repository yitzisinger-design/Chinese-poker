import { Card, PlayerHand } from "../../shared/types.js";
import { evaluate3Card, evaluate5Card, compareHands } from "./evaluator.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  isFoul: boolean;
}

/**
 * Validate a player's hand arrangement.
 *
 * Rules:
 * 1. Front hand must have exactly 3 cards
 * 2. Middle hand must have exactly 5 cards
 * 3. Back hand must have exactly 5 cards
 * 4. All 13 cards must be from the player's dealt hand
 * 5. No duplicate cards
 * 6. Back hand must be >= middle hand
 * 7. Middle hand must be >= front hand (comparing 5-card eval to 3-card eval by rank)
 *
 * If rule 6 or 7 is violated, the hand is a "foul" but still accepted.
 */
export function validateHand(
  hand: PlayerHand,
  dealtCards: Card[]
): ValidationResult {
  const errors: string[] = [];

  // Check sizes
  if (hand.front.length !== 3) {
    errors.push(`Front hand must have 3 cards, got ${hand.front.length}`);
  }
  if (hand.middle.length !== 5) {
    errors.push(`Middle hand must have 5 cards, got ${hand.middle.length}`);
  }
  if (hand.back.length !== 5) {
    errors.push(`Back hand must have 5 cards, got ${hand.back.length}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, isFoul: false };
  }

  // Check all cards are from dealt hand
  const allCards = [...hand.front, ...hand.middle, ...hand.back];
  const dealtIds = new Set(dealtCards.map((c) => c.id));
  const usedIds = new Set<string>();

  for (const card of allCards) {
    if (!dealtIds.has(card.id)) {
      errors.push(`Card ${card.id} was not dealt to this player`);
    }
    if (usedIds.has(card.id)) {
      errors.push(`Card ${card.id} used more than once`);
    }
    usedIds.add(card.id);
  }

  if (allCards.length !== 13) {
    errors.push(`Must use all 13 cards, used ${allCards.length}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors, isFoul: false };
  }

  // Check hand ordering (foul check)
  const frontEval = evaluate3Card(hand.front);
  const middleEval = evaluate5Card(hand.middle);
  const backEval = evaluate5Card(hand.back);

  let isFoul = false;

  // Back must be >= middle (both 5-card, direct comparison works)
  if (compareHands(backEval, middleEval) < 0) {
    isFoul = true;
  }

  // Middle must be >= front
  // The 3-card and 5-card rank scales differ, so we map the 3-card rank
  // to its equivalent position on the 5-card scale before comparing.
  // 3-card: high-card=1, pair=2, three-of-a-kind=3
  // 5-card: high-card=1, pair=2, two-pair=3, three-of-a-kind=4, ...
  const FRONT_RANK_TO_FIVE_CARD: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
  const normalizedFrontRank = FRONT_RANK_TO_FIVE_CARD[frontEval.rank] ?? frontEval.rank;

  if (middleEval.rank < normalizedFrontRank) {
    isFoul = true;
  } else if (middleEval.rank === normalizedFrontRank) {
    // Same hand category - compare kicker values
    if (compareHands(middleEval, frontEval) < 0) {
      isFoul = true;
    }
  }

  return { valid: true, errors: [], isFoul };
}

/**
 * Verify that the submitted cards match the dealt cards exactly.
 */
export function verifyCardIntegrity(
  submitted: Card[],
  dealt: Card[]
): boolean {
  if (submitted.length !== dealt.length) return false;
  const dealtIds = new Set(dealt.map((c) => c.id));
  const submittedIds = new Set(submitted.map((c) => c.id));
  if (dealtIds.size !== submittedIds.size) return false;
  for (const id of submittedIds) {
    if (!dealtIds.has(id)) return false;
  }
  return true;
}
