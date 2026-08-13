import type { Action } from '../game/bettingEngine';
import type { HandValue, Rank, Suit } from '../game/handEvaluator';
import type { HandOverRow } from '../components/HandOverOverlay';
import type { SeatCardView } from '../components/types';

export interface SeatViewModel {
  name: string;
  isKutuk: boolean;
  isTurn: boolean;
  stack: number;
  contributed: number;
  cards: SeatCardView[];
  statusText: string;
}

export interface HandOverViewModel {
  is31: boolean;
  title: string;
  subtitle: string;
  potAmount: number;
  rows: HandOverRow[];
  kutukLine: string;
}

/**
 * Everything MasaScreen needs to render one frame — computed either from a static
 * fixture (design QA) or from the live bettingEngine (see useHotSeatTable). MasaScreen
 * itself never touches game rules, only this shape.
 */
export interface MasaViewModel {
  roomCode: string;
  handNo: number;
  seats: {
    topLeft: SeatViewModel;
    topRight: SeatViewModel;
    bottomLeft: SeatViewModel;
    bottomRight: SeatViewModel;
  };
  center: {
    deckRemaining: number;
    topCard: { rank: Rank; suit: Suit } | null;
    pot: number;
    kutukName: string;
  };
  own: {
    cards: SeatCardView[];
    stack: number;
    bet: number;
    /** Bu elde bir kez PASS dedi — artık sadece izliyor, kart çekemez. */
    isWatching: boolean;
  };
  handOptions: {
    options: HandValue[];
    pick: number | null;
  } | null;
  raising: boolean;
  raiseAmount: number;
  can31: boolean;
  debt: { visible: boolean; owed: number } | null;
  turn: { pct: number; label: string };
  actionBar: { legalActions: Action['type'][]; owed: number };
  logLine: string;
  handOver: HandOverViewModel | null;
  /** Session-level, not hand-rules — lives outside bettingEngine.ts entirely. */
  pause: {
    isPaused: boolean;
    /** Non-null while asking one specific player whether to pause. */
    vote: { askedName: string } | null;
  };
}

export interface MasaActions {
  onPickOption: (total: number) => void;
  onOpenRaise: () => void;
  onChangeRaiseAmount: (n: number) => void;
  onCancelRaise: () => void;
  onConfirmRaise: () => void;
  onDeclare31: () => void;
  onAction: (type: Action['type']) => void;
  onRequestPause: () => void;
  onVoteAnswer: (sayYes: boolean) => void;
  onResume: () => void;
}
