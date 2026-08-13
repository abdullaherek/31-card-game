import jwt from 'jsonwebtoken';

export interface AuthedUser {
  userId: string;
  displayName: string;
}

/**
 * Verifies a Supabase-issued access token (HS256, signed with the project's JWT
 * secret — Supabase dashboard: Project Settings > API > JWT Secret). Throws on any
 * invalid/expired token; callers (MasaRoom.onAuth) should let that reject the
 * connection rather than catching it.
 *
 * If your Supabase project has been migrated to asymmetric (RS256/ES256) signing
 * keys, swap this for JWKS verification (e.g. via the `jose` package's
 * createRemoteJWKSet against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
 * instead of a shared secret — the call site in MasaRoom doesn't need to change.
 */
export function verifySupabaseToken(token: string): AuthedUser {
  // DEV_MODE ONLY — never set this in a deployed environment (see DEPLOY.md, which
  // never sets it). Accepts a plain, unverified "dev:<id>:<url-encoded name>" token
  // instead of a real Supabase JWT, so the whole join/admit/play flow can be tested
  // locally with zero external accounts. Both sides check the SAME env var; the
  // client only ever sends this shape when EXPO_PUBLIC_DEV_MODE is set (see
  // src/net/devAuth.ts) — a stray "dev:" token can't reach here in production
  // because that check is what decides whether to trust it at all.
  if (process.env.DEV_MODE === 'true' && token.startsWith('dev:')) {
    const [, userId, encodedName] = token.split(':');
    if (!userId) throw new Error('Geçersiz dev token');
    return { userId, displayName: decodeURIComponent(encodedName ?? '') || 'Oyuncu' };
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET not configured');

  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
  const userId = payload.sub;
  if (!userId) throw new Error('Token has no subject');

  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    'Oyuncu';

  return { userId, displayName };
}
