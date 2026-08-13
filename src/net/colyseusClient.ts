import { Client, Room } from 'colyseus.js';
import type { ClientMessage, ServerMessage } from './protocol';

const COLYSEUS_URL = process.env.EXPO_PUBLIC_COLYSEUS_URL ?? 'ws://localhost:2567';

const client = new Client(COLYSEUS_URL);

/** Joins the single fixed table room, authenticated via the Supabase access token
 *  (verified server-side in MasaRoom.onAuth — see server/src/auth.ts). */
export function joinMasaRoom(accessToken: string): Promise<Room> {
  return client.joinOrCreate('masa', { token: accessToken });
}

/** Resumes a dropped connection within the server's 60s grace window (see MasaRoom's
 *  onLeave/allowReconnection) — same seat, same in-progress hand, no re-auth needed. */
export function reconnectMasaRoom(reconnectionToken: string): Promise<Room> {
  return client.reconnect(reconnectionToken);
}

export function sendMessage(room: Room, message: ClientMessage): void {
  room.send(message.type, message);
}

/** Thin typed wrapper over colyseus.js's per-type onMessage — keeps ServerMessage's
 *  discriminated union as the single source of truth for what a handler receives. */
export function onServerMessage<T extends ServerMessage['type']>(
  room: Room,
  type: T,
  handler: (message: Extract<ServerMessage, { type: T }>) => void,
): void {
  room.onMessage(type, handler as (message: unknown) => void);
}
