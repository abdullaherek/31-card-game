import type { Room } from 'colyseus.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildMasaViewModel, UiState } from '../screens/buildMasaViewModel';
import type { MasaActions, MasaViewModel } from '../screens/masaTypes';
import type { Action } from '../game/bettingEngine';
import { joinMasaRoom, onServerMessage, reconnectMasaRoom, sendMessage } from '../net/colyseusClient';
import type { JoinRequestPush, JoinResultPush, LobbyState, TableStatePayload } from '../net/protocol';
import { useAuth } from './useAuth';

const TURN_SECONDS = 28; // mirrors server/src/rooms/MasaRoom.ts's TURN_SECONDS — display only.

export interface LobbyViewModel {
  state: LobbyState;
  myUserId: string;
  /** A join request only a seated player can see/answer. */
  incomingRequest: JoinRequestPush | null;
  isSeated: boolean;
  /** True from onRequestSeat() until the server resolves it (seat_assigned or join_result). */
  requestPending: boolean;
  /** Last rejection reason, cleared as soon as another request is made. */
  lastJoinResult: JoinResultPush | null;
}

export interface LobbyActions {
  onRequestSeat: () => void;
  onRespondJoin: (requesterId: string, admit: boolean) => void;
  onStartTable: () => void;
}

export type SessionStatus = 'connecting' | 'lobby' | 'table' | 'error';

const INITIAL_UI: UiState = { raising: false, amount: 10, pick: null, secondsLeft: TURN_SECONDS };

/**
 * Owns the single Colyseus room connection for the whole signed-in session — lobby
 * and table are two views over the same socket, not two separate connections. Sends
 * messages instead of calling applyAction() directly: the server is the only place
 * game rules run (see server/src/rooms/MasaRoom.ts, which imports the same
 * src/game/bettingEngine.ts this app does).
 *
 * `devIdentity` is LOCAL TESTING ONLY (see src/net/devAuth.ts) — when provided, it
 * replaces the real Supabase session entirely, so App.tsx's dev-mode path never needs
 * Supabase configured at all.
 */
export function useOnlineSession(devIdentity?: { userId: string; token: string }) {
  const auth = useAuth();
  const myUserId = devIdentity?.userId ?? auth.session?.user.id ?? null;
  const accessToken = devIdentity?.token ?? auth.accessToken;
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<JoinRequestPush | null>(null);
  const [tableState, setTableState] = useState<TableStatePayload | null>(null);
  const [pauseAskedByName, setPauseAskedByName] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [lastJoinResult, setLastJoinResult] = useState<JoinResultPush | null>(null);
  const [ui, setUi] = useState<UiState>(INITIAL_UI);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    function attach(room: Room) {
      roomRef.current = room;
      setError(null);
      setStatus((prev) => (prev === 'error' ? 'lobby' : prev)); // recovering from a drop

      onServerMessage(room, 'lobby_state', (m) => {
        setLobbyState(m.state);
        if (m.state.status === 'PLAYING' || m.state.status === 'PAUSED') setStatus('table');
        else setStatus('lobby');
      });
      onServerMessage(room, 'join_request', (m) => setIncomingRequest(m.request));
      onServerMessage(room, 'seat_assigned', () => setRequestPending(false));
      onServerMessage(room, 'join_result', (m) => {
        setRequestPending(false);
        setLastJoinResult(m.result);
      });
      onServerMessage(room, 'table_state', (m) => setTableState(m.state));
      onServerMessage(room, 'pause_request', (m) => setPauseAskedByName(m.askedByName));
      onServerMessage(room, 'paused', () => {
        setIsPaused(true);
        setPauseAskedByName(null);
      });
      onServerMessage(room, 'resumed', () => setIsPaused(false));
      onServerMessage(room, 'error', (m) => console.warn('[31] server error:', m.message));

      room.onLeave((code) => {
        if (cancelled) return;
        // 1000 = normal/consented close (e.g. we called leave() ourselves on unmount).
        // Anything else is an unexpected drop — try to resume within the server's 60s
        // reconnection grace window (see MasaRoom.onLeave/allowReconnection) using the
        // token this room handed us before it went away.
        if (code === 1000) return;
        const token = room.reconnectionToken;
        reconnectMasaRoom(token)
          .then((resumed) => {
            if (cancelled) {
              resumed.leave();
              return;
            }
            attach(resumed);
          })
          .catch((e) => {
            if (!cancelled) {
              setError(e instanceof Error ? e.message : 'Bağlantı koptu');
              setStatus('error');
            }
          });
      });
    }

    joinMasaRoom(accessToken)
      .then((room) => {
        if (cancelled) {
          room.leave();
          return;
        }
        attach(room);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Bağlantı kurulamadı');
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      roomRef.current?.leave(true);
      roomRef.current = null;
    };
  }, [accessToken]);

  // Visual-only turn countdown — the server enforces the real timeout independently
  // (see MasaRoom's turn timer); this just drives the TurnIndicator's progress bar.
  useEffect(() => {
    if (!tableState || tableState.phase !== 'BETTING' || isPaused) return;
    setUi((u) => ({ ...u, secondsLeft: TURN_SECONDS }));
    const id = setInterval(() => {
      setUi((u) => ({ ...u, secondsLeft: Math.max(0, u.secondsLeft - 1) }));
    }, 1000);
    return () => clearInterval(id);
  }, [tableState?.turn, tableState?.phase, isPaused]);

  const send = useCallback((message: Parameters<typeof sendMessage>[1]) => {
    if (roomRef.current) sendMessage(roomRef.current, message);
  }, []);

  const handleAction = useCallback(
    (action: Action) => {
      send({ type: 'action', action });
      setUi((u) => ({ ...u, raising: false, pick: null }));
    },
    [send],
  );

  const lobby: LobbyViewModel | null = useMemo(() => {
    if (!lobbyState || !myUserId) return null;
    return {
      state: lobbyState,
      myUserId,
      incomingRequest,
      isSeated: lobbyState.seats.some((s) => s.userId === myUserId),
      requestPending,
      lastJoinResult,
    };
  }, [lobbyState, myUserId, incomingRequest, requestPending, lastJoinResult]);

  const lobbyActions: LobbyActions = useMemo(
    () => ({
      onRequestSeat: () => {
        setLastJoinResult(null);
        setRequestPending(true);
        send({ type: 'request_seat' });
      },
      onRespondJoin: (requesterId, admit) => {
        send({ type: 'respond_join', requesterId, admit });
        // Optimistic: the server never confirms back to the responder specifically —
        // only the requester gets seat_assigned/join_result. Only one incoming request
        // is tracked at a time for v1; a second concurrent request would replace it.
        setIncomingRequest(null);
      },
      onStartTable: () => send({ type: 'start_table' }),
    }),
    [send],
  );

  const vm: MasaViewModel | null = useMemo(() => {
    if (!tableState || !myUserId) return null;
    const seatOrder = lobbyState?.seats.map((s) => s.userId) ?? [myUserId];
    return {
      ...buildMasaViewModel(tableState, myUserId, ui, seatOrder),
      pause: {
        isPaused,
        vote: pauseAskedByName ? { askedName: pauseAskedByName } : null,
      },
    };
  }, [tableState, myUserId, ui, lobbyState, isPaused, pauseAskedByName]);

  const actions: MasaActions = useMemo(
    () => ({
      onPickOption: (total) => setUi((u) => ({ ...u, pick: total })),
      onOpenRaise: () => setUi((u) => ({ ...u, raising: true })),
      onChangeRaiseAmount: (n) => setUi((u) => ({ ...u, amount: Math.round(n) })),
      onCancelRaise: () => setUi((u) => ({ ...u, raising: false })),
      onConfirmRaise: () => handleAction({ type: 'RAISE', amount: ui.amount }),
      onDeclare31: () => handleAction({ type: 'DECLARE_31' }),
      onAction: (type) => {
        if (type === 'RAISE' || type === 'DECLARE_31') return;
        handleAction({ type } as Action);
      },
      onRequestPause: () => send({ type: 'request_pause' }),
      onVoteAnswer: (sayYes) => {
        send({ type: 'vote_answer', sayYes });
        setPauseAskedByName(null);
      },
      onResume: () => send({ type: 'resume' }),
    }),
    [handleAction, ui.amount, send],
  );

  return { status, error, lobby, lobbyActions, vm, actions };
}
