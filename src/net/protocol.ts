/**
 * WebSocket message protocol between the Expo client and MasaRoom.
 * See plan: /Users/mac/.claude/plans/tidy-noodling-journal.md
 *
 * Canonical copy — server/src/protocol.ts re-exports this file by relative path so
 * both sides always agree on the wire shapes; edit only here.
 */
import type { Action, HandResult, PublicPlayerView } from '../game/bettingEngine';
import type { Card } from '../game/handEvaluator';

// ---- Client -> Server ----

export type ClientMessage =
  | { type: 'request_seat' }
  | { type: 'respond_join'; requesterId: string; admit: boolean }
  | { type: 'start_table' }
  | { type: 'action'; action: Action }
  | { type: 'request_pause' }
  | { type: 'vote_answer'; sayYes: boolean }
  | { type: 'resume' };

// ---- Server -> Client ----

export interface LobbySeatView {
  userId: string;
  displayName: string;
}

export interface LobbyState {
  seats: LobbySeatView[];
  pendingCount: number;
  /** True once >=2 seated and no hand is in progress — i.e. someone may call start_table. */
  canStart: boolean;
  status: 'LOBBY' | 'PLAYING' | 'PAUSED';
}

export interface JoinRequestPush {
  requesterId: string;
  name: string;
}

export interface JoinResultPush {
  admitted: boolean;
  reason?: 'FULL' | 'REJECTED';
}

/**
 * Everything buildMasaViewModel needs to render one frame — redactFor()'s output plus
 * the small set of non-secret top-level fields it also reads directly off HandState
 * for the hot-seat path. Never includes another player's closed cards.
 */
export interface TableStatePayload {
  phase: 'BETTING' | 'HAND_OVER';
  pot: number;
  turn: string | null;
  kutukId: string;
  deckRemaining: number;
  faceUp: Card[];
  toCall: number;
  legalActions: Action['type'][];
  result?: HandResult;
  players: PublicPlayerView[];
  log: string[];
  handNo: number;
}

export type ServerMessage =
  | { type: 'lobby_state'; state: LobbyState }
  | { type: 'join_request'; request: JoinRequestPush }
  | { type: 'join_result'; result: JoinResultPush }
  | { type: 'seat_assigned'; seatIndex: number }
  | { type: 'table_state'; state: TableStatePayload }
  | { type: 'pause_request'; askedByName: string }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'error'; message: string };
