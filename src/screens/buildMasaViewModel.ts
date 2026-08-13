import type { HandOverRow } from '../components/HandOverOverlay';
import type { SeatCardView } from '../components/types';
import { HandState, PublicPlayerView, redactFor } from '../game/bettingEngine';
import type { TableStatePayload } from '../net/protocol';
import { SEAT_IDS, SEAT_NAMES, SeatId } from './seatConfig';
import type { HandOverViewModel, MasaViewModel, SeatViewModel } from './masaTypes';

/**
 * Hot-seat holds the raw HandState locally (no network) — this is the local
 * equivalent of what a server would send over the wire, so hot-seat can feed the
 * exact same buildMasaViewModel() the online client uses.
 */
export function handStateToPayload(hand: HandState, viewerId: string, handNo: number): TableStatePayload {
  const redacted = redactFor(hand, viewerId);
  return { ...redacted, log: hand.log, handNo };
}

export interface UiState {
  raising: boolean;
  amount: number;
  pick: number | null;
  secondsLeft: number;
}

function cardsForPlayer(view: PublicPlayerView): SeatCardView[] {
  if (view.ownCards) {
    return view.ownCards.map((c) => ({
      state: c.faceUp ? 'seen' : 'own',
      rank: c.rank,
      suit: c.suit,
    }));
  }
  const backCount = view.cardCount - view.visibleCards.length;
  return [
    ...Array.from({ length: Math.max(0, backCount) }, () => ({ state: 'back' as const })),
    ...view.visibleCards.map((c) => ({ state: 'seen' as const, rank: c.rank, suit: c.suit })),
  ];
}

function statusTextFor(phase: TableStatePayload['phase'], view: PublicPlayerView): string {
  if (view.busted) return 'patlak';
  if (view.folded) return 'kaçtı';
  if (phase === 'HAND_OVER' && view.ownValue) return view.ownValue.label;
  if (view.hasPassed) return 'izliyor';
  return '';
}

function seatViewFor(state: TableStatePayload, view: PublicPlayerView): SeatViewModel {
  return {
    name: SEAT_NAMES[view.id as SeatId] ?? view.id,
    isKutuk: state.kutukId === view.id,
    isTurn: state.turn === view.id,
    stack: view.stack,
    contributed: view.contributed,
    cards: cardsForPlayer(view),
    statusText: statusTextFor(state.phase, view),
  };
}

/**
 * At HAND_OVER, redactFor() reveals ownValue/ownCards for every non-folded player to
 * every viewer (see bettingEngine.ts's `reveal = own || (over && !p.folded)`) — so
 * this needs nothing beyond what's already on the wire payload's `players` array.
 */
function buildHandOver(state: TableStatePayload): HandOverViewModel | null {
  const result = state.result;
  if (!result) return null;

  const rows: HandOverRow[] = state.players.map((p) => {
    const isWinner = p.id === result.potWonBy;
    const label = p.busted ? 'patlak' : p.folded ? 'kaçtı' : p.ownValue?.label ?? '—';
    const delta = isWinner ? `+${result.potAmount - p.contributed} ç` : `−${p.contributed} ç`;
    return { name: SEAT_NAMES[p.id as SeatId] ?? p.id, label, delta, isWinner };
  });
  rows.sort((a, b) => (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0));

  const is31 = result.value?.category === 'THIRTY_ONE';
  const winnerName = result.winner ? SEAT_NAMES[result.winner.playerId as SeatId] ?? result.winner.playerId : null;
  const title = is31 ? '31' : result.value?.label ?? 'Herkes patladı';
  const subtitle = result.allBust
    ? `Pot kütüğe kaldı — ${winnerName ?? ''}`
    : winnerName
      ? `${winnerName} potu aldı`
      : 'Kazanan yok';

  const oldKutukName = SEAT_NAMES[state.kutukId as SeatId] ?? state.kutukId;
  const newKutukName = SEAT_NAMES[result.newKutukId as SeatId] ?? result.newKutukId;
  let kutukLine: string;
  if (result.kutukChangesTo && result.kutukChangesTo !== state.kutukId) {
    kutukLine = `Kütük ${oldKutukName} → ${newKutukName} · masa ücreti ${result.tableFee} çip kasaya`;
  } else if (is31) {
    kutukLine = `Kütük ${oldKutukName}'de kaldı — kendi 31'i devir saymaz`;
  } else {
    kutukLine = `Kütük ${oldKutukName}'de kalıyor — devir sadece 31 ile`;
  }

  return { is31, title, subtitle, potAmount: result.potAmount, rows, kutukLine };
}

/**
 * `pause` is session-level, not hand-derived — the caller (useHotSeatTable or
 * useOnlineTable) merges it in separately.
 *
 * `seatOrder` is the fixed set of *other* seat ids to place into the four opponent
 * slots (top-left/top-right/bottom-left/bottom-right), in that order — hot-seat uses
 * the fixed 5-name roster (SEAT_IDS); the online table uses whoever's actually seated.
 * Defaults to SEAT_IDS for hot-seat's existing call sites.
 */
export function buildMasaViewModel(
  state: TableStatePayload,
  viewerId: string,
  ui: UiState,
  seatOrder: readonly string[] = SEAT_IDS,
): Omit<MasaViewModel, 'pause'> {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const ownView = byId.get(viewerId)!;

  const opponentIds = seatOrder.filter((id) => id !== viewerId);
  const opponentViews = opponentIds.map((id) => byId.get(id)).filter((v): v is PublicPlayerView => !!v);
  const [topLeft, topRight, bottomLeft, bottomRight] = opponentViews.map((v) => seatViewFor(state, v));

  const topCard = state.faceUp.length > 0 ? state.faceUp[state.faceUp.length - 1] : null;
  const owedAmount = state.toCall;

  return {
    roomCode: 'K4T9',
    handNo: state.handNo,
    seats: { topLeft, topRight, bottomLeft, bottomRight },
    center: {
      deckRemaining: state.deckRemaining,
      topCard: topCard ? { rank: topCard.rank, suit: topCard.suit } : null,
      pot: state.pot,
      kutukName: SEAT_NAMES[state.kutukId as SeatId] ?? state.kutukId,
    },
    own: {
      cards: cardsForPlayer(ownView),
      stack: ownView.stack,
      bet: ownView.contributed,
      isWatching: state.phase === 'BETTING' && ownView.hasPassed,
    },
    handOptions: ownView.ownOptions
      ? { options: ownView.ownOptions, pick: ui.pick ?? ownView.ownOptions[0]?.total ?? null }
      : null,
    raising: ui.raising,
    raiseAmount: ui.amount,
    can31: state.legalActions.includes('DECLARE_31'),
    debt: owedAmount > 0 ? { visible: true, owed: owedAmount } : null,
    turn: {
      pct: state.phase === 'BETTING' ? Math.round((ui.secondsLeft / 20) * 100) : 0,
      label:
        state.phase === 'HAND_OVER'
          ? 'el bitti'
          : state.turn === viewerId
            ? `sıra sende · ${ui.secondsLeft} sn`
            : `sıra ${SEAT_NAMES[state.turn as SeatId] ?? state.turn}`,
    },
    actionBar: { legalActions: state.legalActions, owed: owedAmount },
    logLine: state.log[state.log.length - 1] ?? '',
    handOver: buildHandOver(state),
  };
}
