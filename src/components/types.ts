import type { Rank, Suit } from '../game/handEvaluator';
import type { CardState } from './PlayingCard';

/** A single rendered card slot — already resolved from the engine's redacted view.
 *  rank/suit are unset for 'back' cards — the engine never sends them to this viewer. */
export interface SeatCardView {
  state: CardState;
  rank?: Rank;
  suit?: Suit;
}
