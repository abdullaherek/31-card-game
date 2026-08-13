import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMasaViewModel, handStateToPayload, UiState } from '../screens/buildMasaViewModel';
import { SEAT_IDS, SEAT_NAMES, SeatId } from '../screens/seatConfig';
import type { MasaActions, MasaViewModel } from '../screens/masaTypes';
import {
  Action,
  applyAction,
  computeHierarchy,
  createHand,
  HandState,
  owed,
  RuleError,
} from '../game/bettingEngine';
import { ECONOMY } from '../game/handEvaluator';

const TURN_SECONDS = 20;
const REDEAL_DELAY_MS = 3600;

function dealFirstHand(): HandState {
  const kutukId = SEAT_IDS[0];
  const hierarchy = computeHierarchy([...SEAT_IDS], kutukId);
  const players = SEAT_IDS.map((id) => ({
    id,
    stack: ECONOMY.STARTING_CHIPS,
    hierarchy: hierarchy[id],
  }));
  return createHand({ players, kutukId });
}

/** Carries stacks + kütük forward into the next hand; recomputes seating hierarchy
 *  around whoever now holds the kütük. Returns null if fewer than 2 players can pay ante. */
function dealNextHand(prev: HandState): HandState | null {
  const result = prev.result;
  if (!result) return null;
  const survivors = prev.players.filter((p) => p.stack >= ECONOMY.ANTE);
  if (survivors.length < 2) return null;

  const order = SEAT_IDS.filter((id) => survivors.some((p) => p.id === id));
  const newKutukId = order.includes(result.newKutukId as SeatId) ? result.newKutukId : order[0];
  const hierarchy = computeHierarchy(order, newKutukId);
  const players = survivors.map((p) => ({ id: p.id, stack: p.stack, hierarchy: hierarchy[p.id] }));
  return createHand({ players, kutukId: newKutukId });
}

const INITIAL_UI: UiState = { raising: false, amount: 10, pick: null, secondsLeft: TURN_SECONDS };

/**
 * Owns the real HandState (via src/game/bettingEngine) for local pass-and-play:
 * whoever's turn it currently is occupies the "own hand" slot, exactly the perspective
 * redactFor() would give that player over the network. No rule re-implementation here —
 * every legality/scoring decision comes from the engine.
 */
export function useHotSeatTable() {
  const [hand, setHand] = useState<HandState>(dealFirstHand);
  const [handNo, setHandNo] = useState(1);
  const [ui, setUi] = useState<UiState>(INITIAL_UI);
  const lastActorRef = useRef<SeatId>(SEAT_IDS[0]);

  // Session-level pause — deliberately outside HandState/bettingEngine.ts, since it's
  // a meta/table decision, not a hand rule. A single "Evet" anywhere pauses; resuming
  // is a unilateral single tap (see PausedOverlay).
  const [paused, setPaused] = useState(false);
  const [pauseVote, setPauseVote] = useState<{ queue: SeatId[] } | null>(null);

  useEffect(() => {
    if (hand.turn) lastActorRef.current = hand.turn as SeatId;
  }, [hand.turn]);

  const handleAction = useCallback(
    (action: Action) => {
      setHand((prev) => {
        if (prev.phase !== 'BETTING' || !prev.turn) return prev;
        try {
          return applyAction(prev, prev.turn, action);
        } catch (e) {
          if (e instanceof RuleError) {
            console.warn('[31] illegal action ignored:', e.message);
            return prev;
          }
          throw e;
        }
      });
      setUi((u) => ({ ...u, raising: false, pick: null, secondsLeft: TURN_SECONDS }));
    },
    [],
  );

  // Turn timer — resets to 20s every time the active seat changes. Frozen while paused
  // (resumes with a fresh 20s rather than trying to preserve the exact remaining second).
  useEffect(() => {
    if (hand.phase !== 'BETTING' || !hand.turn || paused) return;
    setUi((u) => ({ ...u, secondsLeft: TURN_SECONDS }));
    const id = setInterval(() => {
      setUi((u) => ({ ...u, secondsLeft: u.secondsLeft - 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [hand.turn, hand.phase, paused]);

  // Timer expiry — auto-FOLD if in debt, else auto-PASS, exactly like the design spec.
  useEffect(() => {
    if (ui.secondsLeft > 0) return;
    if (hand.phase !== 'BETTING' || !hand.turn || paused) return;
    handleAction(owed(hand, hand.turn) > 0 ? { type: 'FOLD' } : { type: 'PASS' });
    // hand is intentionally omitted: this fires purely off the secondsLeft-hits-zero edge,
    // and handleAction always re-reads the freshest HandState via its setHand updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.secondsLeft, paused]);

  // Auto-redeal after a hand ends. Frozen while paused.
  useEffect(() => {
    if (hand.phase !== 'HAND_OVER' || paused) return;
    const t = setTimeout(() => {
      const next = dealNextHand(hand);
      if (!next) return; // fewer than 2 players left standing — freeze on the final overlay
      setHand(next);
      setHandNo((n) => n + 1);
      setUi(INITIAL_UI);
    }, REDEAL_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand.phase, hand.result, paused]);

  const viewerId: SeatId = (hand.turn as SeatId) ?? lastActorRef.current;

  const requestPause = useCallback(() => {
    if (paused || pauseVote) return;
    const others = SEAT_IDS.filter((id) => id !== viewerId);
    if (others.length === 0) {
      setPaused(true);
      return;
    }
    setPauseVote({ queue: others });
  }, [paused, pauseVote, viewerId]);

  const answerVote = useCallback((sayYes: boolean) => {
    if (sayYes) {
      setPaused(true);
      setPauseVote(null);
      return;
    }
    setPauseVote((v) => {
      if (!v) return null;
      const rest = v.queue.slice(1);
      return rest.length > 0 ? { queue: rest } : null;
    });
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    setPauseVote(null);
  }, []);

  const vm: MasaViewModel = useMemo(
    () => ({
      ...buildMasaViewModel(handStateToPayload(hand, viewerId, handNo), viewerId, ui),
      pause: {
        isPaused: paused,
        vote: pauseVote ? { askedName: SEAT_NAMES[pauseVote.queue[0]] } : null,
      },
    }),
    [hand, viewerId, ui, handNo, paused, pauseVote],
  );

  const actions: MasaActions = useMemo(
    () => ({
      onPickOption: (total) => setUi((u) => ({ ...u, pick: total })),
      onOpenRaise: () => setUi((u) => ({ ...u, raising: true })),
      onChangeRaiseAmount: (n) => setUi((u) => ({ ...u, amount: Math.round(n) })),
      onCancelRaise: () => setUi((u) => ({ ...u, raising: false })),
      onConfirmRaise: () => handleAction({ type: 'RAISE', amount: ui.amount }),
      onDeclare31: () => handleAction({ type: 'DECLARE_31' }),
      onAction: (type) => {
        if (type === 'RAISE' || type === 'DECLARE_31') return; // routed elsewhere
        handleAction({ type } as Action);
      },
      onRequestPause: requestPause,
      onVoteAnswer: answerVote,
      onResume: resume,
    }),
    [handleAction, ui.amount, requestPause, answerVote, resume],
  );

  return { vm, actions };
}
