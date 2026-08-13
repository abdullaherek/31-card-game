import { createRemoteJWKSet, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';

export interface AuthedUser {
  userId: string;
  displayName: string;
}

function extractIdentity(payload: Record<string, unknown>): AuthedUser {
  const userId = payload.sub as string | undefined;
  if (!userId) throw new Error('Token has no subject');

  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    'Oyuncu';

  return { userId, displayName };
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/**
 * Verifies a Supabase-issued access token.
 *
 * New Supabase projects sign auth tokens asymmetrically (ES256/RS256) by default —
 * there is no shared secret to extract at all (see Project Settings > API > JWT Keys:
 * "Once you've moved to using the JWT signing keys feature, extracting the private
 * key or shared secret from Supabase is not possible"). So the primary path here
 * verifies against the project's public JWKS endpoint via `jose`, which handles
 * fetching/caching/rotation automatically. `SUPABASE_JWT_SECRET` is kept only as a
 * fallback for older projects still on legacy HS256 signing — set it and this will
 * use it instead if JWKS verification isn't available.
 */
export async function verifySupabaseToken(token: string): Promise<AuthedUser> {
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

  if (process.env.SUPABASE_URL) {
    const { payload } = await jwtVerify(token, getJwks());
    return extractIdentity(payload as Record<string, unknown>);
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_URL (or legacy SUPABASE_JWT_SECRET) not configured');
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
  return extractIdentity(payload as Record<string, unknown>);
}
