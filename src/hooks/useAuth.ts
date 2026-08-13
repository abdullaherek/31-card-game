import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { signInWithApple, signInWithGoogle, signOut, supabase } from '../net/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const withErrorHandling = useCallback(
    (fn: () => Promise<void>) => async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Giriş başarısız');
      }
    },
    [],
  );

  return {
    session,
    loading,
    error,
    isSignedIn: !!session,
    /** Presented to the Colyseus room's onAuth as `options.token` on join. */
    accessToken: session?.access_token ?? null,
    signInWithGoogle: withErrorHandling(signInWithGoogle),
    signInWithApple: withErrorHandling(signInWithApple),
    signOut,
  };
}
