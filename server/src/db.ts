import { Pool, type PoolClient } from 'pg';

const DEV_MODE = process.env.DEV_MODE === 'true';

/**
 * Service-role Postgres connection — bypasses RLS entirely (see the migration's RLS
 * comments). This is the ONLY path that ever writes to users.chips or chip_ledger;
 * the Supabase anon/authenticated keys the client uses cannot write to either table.
 * Not constructed at all in DEV_MODE, so a missing DATABASE_URL is a non-issue for
 * local testing (see the in-memory fallback below).
 */
export const pool = DEV_MODE
  ? null
  : new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });

export interface LedgerEntry {
  userId: string;
  delta: number;
  reason: 'HAND_WIN' | 'HAND_LOSS' | 'TABLE_FEE' | 'ADMIN_ADJUST';
  handId?: string;
  counterpartyUserId?: string;
}

export interface HandRecord {
  id: string;
  roomCode: string;
  handNo: number;
  winnerUserId: string | null;
  pot: number;
  resultJson: unknown;
}

// ---- DEV_MODE in-memory store — never used unless DEV_MODE=true (see server/.env.example) ----

const devChips = new Map<string, number>();
const devNames = new Map<string, string>();
const devLedger: Array<LedgerEntry & { createdAt: number }> = [];
const devHands: HandRecord[] = [];

function devGetChips(userId: string): number {
  if (!devChips.has(userId)) devChips.set(userId, 1000); // same signup bonus as the real trigger
  return devChips.get(userId)!;
}

// ---- Public API — identical shape regardless of backing store ----

/**
 * Applies every ledger entry for one finished hand plus the hand-history row in a
 * single transaction — either all of it lands or none does. Called once per
 * HAND_OVER from MasaRoom.
 */
export async function recordHandOutcome(entries: LedgerEntry[], hand: HandRecord): Promise<void> {
  if (DEV_MODE) {
    for (const e of entries) {
      devChips.set(e.userId, devGetChips(e.userId) + e.delta);
      devLedger.push({ ...e, createdAt: Date.now() });
    }
    devHands.push(hand);
    return;
  }

  const client: PoolClient = await pool!.connect();
  try {
    await client.query('BEGIN');

    for (const e of entries) {
      await client.query(
        `insert into public.chip_ledger (user_id, delta, reason, hand_id, counterparty_user_id)
         values ($1, $2, $3, $4, $5)`,
        [e.userId, e.delta, e.reason, e.handId ?? null, e.counterpartyUserId ?? null],
      );
      await client.query(`update public.users set chips = chips + $1 where id = $2`, [
        e.delta,
        e.userId,
      ]);
    }

    await client.query(
      `insert into public.hands (id, room_code, hand_no, winner_user_id, pot, result_json)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [hand.id, hand.roomCode, hand.handNo, hand.winnerUserId, hand.pot, hand.resultJson],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Current chip balance — used when seating a player, to enforce the ante-affordability
 *  check before calling createHand (which would otherwise throw a RuleError for everyone). */
export async function getChips(userId: string): Promise<number> {
  if (DEV_MODE) return devGetChips(userId);

  const { rows } = await pool!.query<{ chips: number }>(
    'select chips from public.users where id = $1',
    [userId],
  );
  if (rows.length === 0) throw new Error(`No users row for ${userId}`);
  return rows[0].chips;
}

export async function getDisplayName(userId: string): Promise<string> {
  if (DEV_MODE) return devNames.get(userId) ?? userId;

  const { rows } = await pool!.query<{ display_name: string }>(
    'select display_name from public.users where id = $1',
    [userId],
  );
  return rows[0]?.display_name ?? 'Oyuncu';
}

/** DEV_MODE only — MasaRoom.onAuth's dev token carries the display name straight from
 *  the client, so cache it here the first time we see a given dev user id. */
export function devRegisterName(userId: string, displayName: string): void {
  if (DEV_MODE && !devNames.has(userId)) devNames.set(userId, displayName);
}
