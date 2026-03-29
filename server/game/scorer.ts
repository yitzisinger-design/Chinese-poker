import {
  Submission,
  HeadToHeadResult,
  RoundResult,
  HandPosition,
  HandEvaluation,
} from "../../shared/types.js";
import { compareHands } from "./evaluator.js";

/**
 * Score a round of Chinese Poker.
 *
 * Scoring rules:
 * - Each pair of players compares front vs front, middle vs middle, back vs back
 * - Win a row = +1 point from that opponent
 * - Lose a row = -1 point to that opponent
 * - Tie = 0 points
 * - Sweep (win all 3 rows vs one opponent) = +3 bonus (6 total instead of 3)
 * - Foul = automatic loss of all 3 rows to every opponent (counts as sweep against you)
 */
export function scoreRound(submissions: Submission[]): RoundResult {
  const headToHead: HeadToHeadResult[] = [];
  const pointChanges: Record<string, number> = {};

  // Initialize point changes
  for (const sub of submissions) {
    pointChanges[sub.playerId] = 0;
  }

  // Compare each pair of players
  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const p1 = submissions[i];
      const p2 = submissions[j];

      const result = compareSubmissions(p1, p2);
      headToHead.push(result);

      pointChanges[p1.playerId] += result.player1Points;
      pointChanges[p2.playerId] += result.player2Points;
    }
  }

  return { headToHead, pointChanges, submissions };
}

function compareSubmissions(p1: Submission, p2: Submission): HeadToHeadResult {
  const rows: HandPosition[] = ["front", "middle", "back"];
  let p1Wins = 0;
  let p2Wins = 0;

  const rowResults: HeadToHeadResult["rows"] = {
    front: { winnerId: null, p1Eval: p1.evaluations.front, p2Eval: p2.evaluations.front },
    middle: { winnerId: null, p1Eval: p1.evaluations.middle, p2Eval: p2.evaluations.middle },
    back: { winnerId: null, p1Eval: p1.evaluations.back, p2Eval: p2.evaluations.back },
  };

  // Handle fouls
  if (p1.isFoul && p2.isFoul) {
    // Both foul: no points exchanged, all ties
    return {
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      rows: rowResults,
      player1RowsWon: 0,
      player2RowsWon: 0,
      player1Points: 0,
      player2Points: 0,
      isSweep: false,
    };
  }

  if (p1.isFoul) {
    // P1 fouls: P2 wins all rows, treated as sweep
    for (const row of rows) {
      rowResults[row].winnerId = p2.playerId;
    }
    return {
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      rows: rowResults,
      player1RowsWon: 0,
      player2RowsWon: 3,
      player1Points: -6,
      player2Points: 6,
      isSweep: true,
    };
  }

  if (p2.isFoul) {
    for (const row of rows) {
      rowResults[row].winnerId = p1.playerId;
    }
    return {
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      rows: rowResults,
      player1RowsWon: 3,
      player2RowsWon: 0,
      player1Points: 6,
      player2Points: -6,
      isSweep: true,
    };
  }

  // Normal comparison
  for (const row of rows) {
    const p1Eval = p1.evaluations[row];
    const p2Eval = p2.evaluations[row];
    const cmp = compareHands(p1Eval, p2Eval);

    if (cmp > 0) {
      rowResults[row].winnerId = p1.playerId;
      p1Wins++;
    } else if (cmp < 0) {
      rowResults[row].winnerId = p2.playerId;
      p2Wins++;
    }
    // cmp === 0: tie, winnerId stays null
  }

  let p1Points = p1Wins - p2Wins;
  let p2Points = p2Wins - p1Wins;
  const isSweep = p1Wins === 3 || p2Wins === 3;

  // Sweep bonus: +3 additional points
  if (p1Wins === 3) {
    p1Points += 3;
    p2Points -= 3;
  } else if (p2Wins === 3) {
    p2Points += 3;
    p1Points -= 3;
  }

  return {
    player1Id: p1.playerId,
    player2Id: p2.playerId,
    rows: rowResults,
    player1RowsWon: p1Wins,
    player2RowsWon: p2Wins,
    player1Points: p1Points,
    player2Points: p2Points,
    isSweep,
  };
}
