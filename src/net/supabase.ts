import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import 'react-native-url-polyfill/auto';
import { isDevMode } from './devAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// App.tsx imports this module either way (to pick which mode to render), so the
// missing-env-var check below must not fire in DEV_MODE — that path never calls any
// of these exports, but the module still has to load without real Supabase config.
if (!isDevMode && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set — see .env.example',
  );
}

/**
 * Auth only — this client never touches game data. Chip balances live in Postgres
 * behind RLS the anon/authenticated key cannot write through; only the Colyseus
 * server's service-role connection can (see server/src/db.ts).
 *
 * In DEV_MODE with no real project configured, createClient() still needs a
 * syntactically valid URL/key to construct without throwing — these placeholders are
 * never actually called (DevModeApp in App.tsx never touches useAuth/supabase).
 */
export const supabase = createClient(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // handled manually below via WebBrowser
    },
  },
);

const redirectTo = Linking.createURL('auth-callback');

async function signInWithProvider(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase did not return an OAuth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Giriş tamamlanmadı');
  }

  // Supabase's default (PKCE) OAuth flow returns `?code=...` in the query string.
  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code === 'string') {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return;
  }

  // Fallback for a project still on the implicit flow: tokens land in the URL's `#`
  // fragment instead of its query string, which Linking.parse doesn't expose — read
  // it directly off the raw redirect URL.
  const fragment = result.url.split('#')[1];
  const fragmentParams = new URLSearchParams(fragment ?? '');
  const accessToken = fragmentParams.get('access_token');
  const refreshToken = fragmentParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setError) throw setError;
    return;
  }

  throw new Error('OAuth yönlendirmesinde beklenen parametreler yok');
}

export const signInWithGoogle = () => signInWithProvider('google');
export const signInWithApple = () => signInWithProvider('apple');
export const signOut = () => supabase.auth.signOut();
