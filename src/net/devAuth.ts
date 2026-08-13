/**
 * LOCAL TESTING ONLY — matches server/src/auth.ts's DEV_MODE branch. Never wired into
 * any production build config (see DEPLOY.md, which never sets EXPO_PUBLIC_DEV_MODE).
 * Lets the whole join/admit/start/play loop be tested on-device with zero Supabase
 * project, zero OAuth setup, zero Postgres — see the server's matching DEV_MODE.
 */
export const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

/** A random-enough local id — this never needs to be cryptographically strong, it's
 *  just a per-install identity for local testing, not a real account. */
function randomDevId(): string {
  return `dev-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeDevToken(userId: string, displayName: string): string {
  return `dev:${userId}:${encodeURIComponent(displayName)}`;
}

export { randomDevId };
