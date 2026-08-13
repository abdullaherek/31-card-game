import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { randomDevId } from '../net/devAuth';

const STORAGE_KEY = 'dev-identity-v1';

interface DevIdentity {
  userId: string;
  name: string | null;
}

/** LOCAL TESTING ONLY — see src/net/devAuth.ts. Persists per-install so relaunching
 *  the app on the same simulator/device keeps the same identity and chip balance. */
export function useDevIdentity() {
  const [identity, setIdentity] = useState<DevIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setIdentity(raw ? JSON.parse(raw) : { userId: randomDevId(), name: null });
      setReady(true);
    });
  }, []);

  const setName = useCallback((name: string) => {
    setIdentity((prev) => {
      const next = { userId: prev?.userId ?? randomDevId(), name };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { ready, userId: identity?.userId ?? null, name: identity?.name ?? null, setName };
}
