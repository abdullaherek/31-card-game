import { Client, Room } from '@colyseus/core';
import {
  Action,
  applyAction,
  computeHierarchy,
  createHand,
  HandState,
  legalActions,
  owed,
  PublicPlayerView,
  redactFor,
  RuleError,
} from '../../../src/game/bettingEngine';
import { ECONOMY } from '../../../src/game/handEvaluator';
import { verifySupabaseToken } from '../auth';
import { devRegisterName, getChips, getDisplayName, recordHandOutcome, type LedgerEntry } from '../db';
import type { ClientMessage, LobbyState, ServerMessage, TableStatePayload } from '../protocol';
import { cryptoRand } from '../rand';

const TURN_SECONDS = 28; // "25-30 saniye" — round-enough middle value.
const REDEAL_DELAY_MS = 3600; // matches the hot-seat client's existing pacing.
const MAX_SEATS = 5;
const MIN_SEATS = 2;

interface SeatInfo {
  userId: string;
  displayName: string;
}

function send(client: Client, message: ServerMessage) {
  client.send(message.type, message);
}

/**
 * One Colyseus room = one table. Deliberately does NOT use Colyseus's automatic
 * schema state sync — HandState (including everyone's closed cards) lives only in
 * this room's memory, and each client only ever receives their own redactFor() view
 * via client.send(). See plan: /Users/mac/.claude/plans/tidy-noodling-journal.md
 */
export class MasaRoom extends Room {
  seats: SeatInfo[] = [];
  pendingRequests = new Map<string, { name: string }>();
  clientsByUserId = new Map<string, Client>();
  status: LobbyState['status'] = 'LOBBY';
  hand: HandState | null = null;
  handNo = 0;
  pauseVote: { askedByUserId: string; answered: Set<string> } | null = null;
  turnTimer: ReturnType<Room['clock']['setTimeout']> | null = null;
  redealTimer: ReturnType<Room['clock']['setTimeout']> | null = null;

  onCreate() {
    this.maxClients = 10; // connection cap, decoupled from the 5-seat game cap
    this.autoDispose = false; // one persistent table — don't drop state when empty

    this.onMessage('request_seat', (client) => this.handleRequestSeat(client));
    this.onMessage('respond_join', (client, msg: ClientMessage & { type: 'respond_join' }) =>
      this.handleRespondJoin(client, msg.requesterId, msg.admit),
    );
    this.onMessage('start_table', (client) => this.handleStartTable(client));
    this.onMessage('action', (client, msg: ClientMessage & { type: 'action' }) =>
      this.handleAction(client, msg.action),
    );
    this.onMessage('request_pause', (client) => this.handleRequestPause(client));
    this.onMessage('vote_answer', (client, msg: ClientMessage & { type: 'vote_answer' }) =>
      this.handleVoteAnswer(client, msg.sayYes),
    );
    this.onMessage('resume', (client) => this.handleResume(client));
  }

  async onAuth(_client: Client, options: { token?: string }) {
    if (!options.token) throw new Error('Token eksik');
    return verifySupabaseToken(options.token); // throws -> Colyseus rejects the join
  }

  async onJoin(client: Client, _options: unknown, auth: { userId: string; displayName: string }) {
    this.clientsByUserId.set(auth.userId, client);
    devRegisterName(auth.userId, auth.displayName); // no-op outside DEV_MODE

    const alreadySeated = this.seats.some((s) => s.userId === auth.userId);
    if (alreadySeated) {
      // Reconnect landed here instead of via allowReconnection's resolution (e.g. the
      // grace window already lapsed) — just resync them, no re-seating needed.
      this.pushTableState(auth.userId);
      this.broadcastLobbyState();
      return;
    }

    send(client, { type: 'lobby_state', state: this.lobbyState() });
  }

  async onLeave(client: Client, consented: boolean) {
    const userId = this.userIdFor(client);
    if (!userId) return;

    if (consented) {
      this.clientsByUserId.delete(userId);
      return;
    }

    try {
      await this.allowReconnection(client, 60);
      // Reconnected in time — same client/session resumes. Resend a fresh full state
      // in case anything changed while they were gone.
      this.clientsByUserId.set(userId, client);
      this.pushTableState(userId);
      this.broadcastLobbyState();
    } catch {
      // Grace window expired — permanent drop.
      this.clientsByUserId.delete(userId);
      this.dropSeat(userId);
    }
  }

  // ---- Lobby: request/admit/reject/start ----

  private async handleRequestSeat(client: Client) {
    const userId = this.userIdFor(client);
    if (!userId) return;
    if (this.seats.some((s) => s.userId === userId) || this.pendingRequests.has(userId)) return;

    if (this.seats.length >= MAX_SEATS) {
      send(client, { type: 'join_result', result: { admitted: false, reason: 'FULL' } });
      return;
    }

    const name = await getDisplayName(userId);

    // Nobody seated yet — nobody exists to approve a request, so the first person to
    // ask just sits down. Every request after that goes through the normal
    // admit/reject flow below.
    if (this.seats.length === 0) {
      this.seats.push({ userId, displayName: name });
      send(client, { type: 'seat_assigned', seatIndex: 0 });
      this.broadcastLobbyState();
      return;
    }

    this.pendingRequests.set(userId, { name });
    this.broadcastLobbyState();
    this.broadcastToSeated({ type: 'join_request', request: { requesterId: userId, name } });
  }

  private handleRespondJoin(client: Client, requesterId: string, admit: boolean) {
    const responderId = this.userIdFor(client);
    if (!responderId || !this.seats.some((s) => s.userId === responderId)) return; // only seated players decide
    const pending = this.pendingRequests.get(requesterId);
    if (!pending) return; // already resolved by someone else — first response wins

    this.pendingRequests.delete(requesterId);
    const requesterClient = this.clientsByUserId.get(requesterId);

    if (admit && this.seats.length < MAX_SEATS) {
      this.seats.push({ userId: requesterId, displayName: pending.name });
      if (requesterClient) {
        send(requesterClient, { type: 'seat_assigned', seatIndex: this.seats.length - 1 });
      }
    } else if (requesterClient) {
      send(requesterClient, { type: 'join_result', result: { admitted: false, reason: 'REJECTED' } });
    }
    this.broadcastLobbyState();
  }

  private async handleStartTable(client: Client) {
    const userId = this.userIdFor(client);
    if (!userId || !this.seats.some((s) => s.userId === userId)) return;
    if (this.status === 'PLAYING' || this.seats.length < MIN_SEATS) return;

    const players = await Promise.all(
      this.seats.map(async (s) => ({ id: s.userId, stack: await getChips(s.userId), hierarchy: 0 })),
    );
    const order = this.seats.map((s) => s.userId);
    const hierarchy = computeHierarchy(order, order[0]);
    for (const p of players) p.hierarchy = hierarchy[p.id];

    try {
      this.hand = createHand({ players, kutukId: order[0], rand: cryptoRand });
    } catch (e) {
      if (e instanceof RuleError) {
        this.broadcastToSeated({ type: 'error', message: e.message });
        return;
      }
      throw e;
    }
    this.handNo += 1;
    this.status = 'PLAYING';
    this.broadcastLobbyState();
    this.pushTableStateToAll();
    this.scheduleTurnTimer();
  }

  // ---- In-hand actions ----

  private handleAction(client: Client, action: Action) {
    if (!this.hand) return;
    const userId = this.userIdFor(client);
    if (!userId || this.status !== 'PLAYING') return;

    if (this.hand.turn !== userId || !legalActions(this.hand, userId).includes(action.type)) {
      send(client, { type: 'error', message: `Geçersiz aksiyon: ${action.type}` });
      return;
    }

    try {
      this.hand = applyAction(this.hand, userId, action);
    } catch (e) {
      send(client, { type: 'error', message: e instanceof RuleError ? e.message : 'Beklenmeyen hata' });
      return;
    }

    this.pushTableStateToAll();

    if (this.hand.phase === 'HAND_OVER') {
      this.clearTurnTimer();
      void this.settleHandAndScheduleNext();
    } else {
      this.scheduleTurnTimer();
    }
  }

  private scheduleTurnTimer() {
    this.clearTurnTimer();
    if (this.status === 'PAUSED') return;
    this.turnTimer = this.clock.setTimeout(() => this.onTurnTimeout(), TURN_SECONDS * 1000);
  }

  private clearTurnTimer() {
    this.turnTimer?.clear();
    this.turnTimer = null;
  }

  private onTurnTimeout() {
    if (!this.hand || !this.hand.turn) return;
    const playerId = this.hand.turn;
    const action: Action = owed(this.hand, playerId) > 0 ? { type: 'FOLD' } : { type: 'PASS' };
    this.hand = applyAction(this.hand, playerId, action);
    this.pushTableStateToAll();

    if (this.hand.phase === 'HAND_OVER') {
      void this.settleHandAndScheduleNext();
    } else {
      this.scheduleTurnTimer();
    }
  }

  // ---- Hand-over: persist + redeal ----

  private async settleHandAndScheduleNext() {
    const hand = this.hand;
    if (!hand?.result) return;
    const result = hand.result;
    const handId = `${this.roomId}:${this.handNo}`;

    const entries: LedgerEntry[] = hand.players.map((p) => {
      const isWinner = p.id === result.potWonBy;
      const delta = isWinner ? result.potAmount - p.contributed : -p.contributed;
      return {
        userId: p.id,
        delta,
        reason: isWinner ? 'HAND_WIN' : 'HAND_LOSS',
        handId,
        counterpartyUserId: isWinner ? undefined : result.potWonBy ?? undefined,
      };
    });
    if (result.tableFee > 0) {
      entries.push({
        userId: hand.kutukId,
        delta: -result.tableFee,
        reason: 'TABLE_FEE' as const,
        handId,
        counterpartyUserId: undefined,
      });
    }

    await recordHandOutcome(entries, {
      id: handId,
      roomCode: this.roomId,
      handNo: this.handNo,
      winnerUserId: result.potWonBy,
      pot: result.potAmount,
      resultJson: result,
    });

    this.redealTimer = this.clock.setTimeout(() => void this.dealNext(), REDEAL_DELAY_MS);
  }

  private async dealNext() {
    if (this.status === 'PAUSED') return; // resume() re-schedules this once unpaused
    const survivors: SeatInfo[] = [];
    for (const s of this.seats) {
      if ((await getChips(s.userId)) >= ECONOMY.ANTE) survivors.push(s);
    }
    this.seats = survivors;

    if (this.seats.length < MIN_SEATS) {
      this.status = 'LOBBY';
      this.hand = null;
      this.broadcastLobbyState();
      return;
    }

    const players = await Promise.all(
      this.seats.map(async (s) => ({ id: s.userId, stack: await getChips(s.userId), hierarchy: 0 })),
    );
    const order = this.seats.map((s) => s.userId);
    const newKutukId = this.hand?.result?.newKutukId && order.includes(this.hand.result.newKutukId)
      ? this.hand.result.newKutukId
      : order[0];
    const hierarchy = computeHierarchy(order, newKutukId);
    for (const p of players) p.hierarchy = hierarchy[p.id];

    this.hand = createHand({ players, kutukId: newKutukId, rand: cryptoRand });
    this.handNo += 1;
    this.pushTableStateToAll();
    this.scheduleTurnTimer();
  }

  // ---- Pause / resume (simultaneous ask, not sequential — real separate devices) ----

  private handleRequestPause(client: Client) {
    const userId = this.userIdFor(client);
    if (!userId || this.status !== 'PLAYING') return;
    if (this.pauseVote) return;

    const others = this.seats.map((s) => s.userId).filter((id) => id !== userId);
    if (others.length === 0) {
      this.applyPause();
      return;
    }
    this.pauseVote = { askedByUserId: userId, answered: new Set() };
    const askedByName = this.seats.find((s) => s.userId === userId)?.displayName ?? 'Biri';
    for (const otherId of others) {
      const c = this.clientsByUserId.get(otherId);
      if (c) send(c, { type: 'pause_request', askedByName });
    }
  }

  private handleVoteAnswer(client: Client, sayYes: boolean) {
    const userId = this.userIdFor(client);
    if (!userId || !this.pauseVote) return;

    if (sayYes) {
      this.applyPause();
      return;
    }
    this.pauseVote.answered.add(userId);
    const others = this.seats.map((s) => s.userId).filter((id) => id !== this.pauseVote!.askedByUserId);
    if (others.every((id) => this.pauseVote!.answered.has(id))) {
      this.pauseVote = null; // everyone said no — stays unpaused
    }
  }

  private applyPause() {
    this.pauseVote = null;
    this.status = 'PAUSED';
    this.clearTurnTimer();
    this.redealTimer?.clear();
    this.broadcastToSeated({ type: 'paused' });
    this.broadcastLobbyState();
  }

  private handleResume(client: Client) {
    const userId = this.userIdFor(client);
    if (!userId || this.status !== 'PAUSED') return;

    this.status = 'PLAYING';
    this.broadcastToSeated({ type: 'resumed' });
    this.broadcastLobbyState();
    if (this.hand?.phase === 'HAND_OVER') {
      this.redealTimer = this.clock.setTimeout(() => void this.dealNext(), REDEAL_DELAY_MS);
    } else if (this.hand) {
      this.scheduleTurnTimer();
    }
  }

  // ---- Seat/hierarchy maintenance ----

  private dropSeat(userId: string) {
    if (!this.seats.some((s) => s.userId === userId)) {
      this.pendingRequests.delete(userId);
      this.broadcastLobbyState();
      return;
    }
    this.seats = this.seats.filter((s) => s.userId !== userId);
    // Mid-hand: they're simply skipped by the normal turn-timeout path when their turn
    // comes up (same as a live-but-unresponsive player) — no hierarchy recompute until
    // the NEXT deal, which dealNext()/handleStartTable() already handle.
    this.broadcastLobbyState();
  }

  // ---- View helpers ----

  private userIdFor(client: Client): string | null {
    for (const [userId, c] of this.clientsByUserId) if (c === client) return userId;
    return null;
  }

  private lobbyState(): LobbyState {
    return {
      seats: this.seats.map((s) => ({ userId: s.userId, displayName: s.displayName })),
      pendingCount: this.pendingRequests.size,
      canStart: this.status !== 'PLAYING' && this.seats.length >= MIN_SEATS,
      status: this.status,
    };
  }

  private broadcastLobbyState() {
    this.broadcast('lobby_state', { state: this.lobbyState() } satisfies Omit<ServerMessage, 'type'> & {
      state: LobbyState;
    });
  }

  private broadcastToSeated(message: ServerMessage) {
    for (const s of this.seats) {
      const c = this.clientsByUserId.get(s.userId);
      if (c) send(c, message);
    }
  }

  private tableStateFor(viewerId: string): TableStatePayload | null {
    if (!this.hand) return null;
    const redacted = redactFor(this.hand, viewerId);
    return {
      ...redacted,
      players: redacted.players as PublicPlayerView[],
      log: this.hand.log,
      handNo: this.handNo,
    };
  }

  private pushTableState(viewerId: string) {
    const state = this.tableStateFor(viewerId);
    if (!state) return;
    const client = this.clientsByUserId.get(viewerId);
    if (client) send(client, { type: 'table_state', state });
  }

  private pushTableStateToAll() {
    for (const s of this.seats) this.pushTableState(s.userId);
  }
}
