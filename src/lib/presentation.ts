/**
 * Presentation-only helpers layered on top of the rules engine.
 *
 * These do NOT decide winners or legality — they only translate an already-computed
 * HandValue into the ordinal ranking the design uses to teach the hierarchy
 * ("hiyerarşide 12." instead of the raw total). Per design-reference/HANDOFF.md
 * ("Motor sözleşmesi"), this is the one sanctioned exception to "no game logic in the UI",
 * and it is presentation-only: evaluateHand()/resolveShowdown() remain the sole source
 * of who actually wins.
 */
import type { HandValue } from '../game/handEvaluator';

/** 31 → 1, 2-2 → 2, As-3 → 3, 7-7 → 4, 14 → 5, else 5 + (31 - total), patlak → 34. */
export function hierarchyRank(v: HandValue): number {
  switch (v.category) {
    case 'THIRTY_ONE':
      return 1;
    case 'PAIR_TWOS':
      return 2;
    case 'ACE_THREE':
      return 3;
    case 'PAIR_SEVENS':
      return 4;
    case 'FOURTEEN':
      return 5;
    case 'BUST':
      return 34;
    case 'TOTAL':
      return 5 + (31 - v.total);
  }
}

export type HandQualifier = 'özel el' | 'güçlü' | 'orta' | 'zayıf';

export function handQualifier(v: HandValue, rank: number = hierarchyRank(v)): HandQualifier {
  if (v.category === 'FOURTEEN') return 'özel el';
  if (rank <= 8) return 'güçlü';
  if (rank <= 14) return 'orta';
  return 'zayıf';
}
