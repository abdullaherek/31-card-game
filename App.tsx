import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  useFonts as useCormorant,
} from '@expo-google-fonts/cormorant-garamond';
import { Lora_400Regular, Lora_600SemiBold, useFonts as useLora } from '@expo-google-fonts/lora';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DevNameEntryScreen } from './src/screens/DevNameEntryScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { MasaScreenContainer } from './src/screens/MasaScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { color, font } from './src/theme/tokens';
import { useAuth } from './src/hooks/useAuth';
import { useDevIdentity } from './src/hooks/useDevIdentity';
import { useHotSeatTable } from './src/hooks/useHotSeatTable';
import { useOnlineSession } from './src/hooks/useOnlineSession';
import { isDevMode, makeDevToken } from './src/net/devAuth';

// Flip to true to bypass Supabase/Colyseus entirely and play single-device hot-seat
// (see src/hooks/useHotSeatTable.ts) — kept working, not wired to any UI toggle since
// it's a dev/offline path, not a user-facing mode.
const USE_HOT_SEAT = false;

export default function App() {
  const [cormorantLoaded] = useCormorant({ CormorantGaramond_400Regular, CormorantGaramond_600SemiBold });
  const [loraLoaded] = useLora({ Lora_400Regular, Lora_600SemiBold });

  if (!cormorantLoaded || !loraLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.root}>
      {USE_HOT_SEAT ? <HotSeatApp /> : isDevMode ? <DevModeApp /> : <OnlineApp />}
      <StatusBar style="light" />
    </View>
  );
}

function HotSeatApp() {
  const table = useHotSeatTable();
  return <MasaScreenContainer vm={table.vm} actions={table.actions} />;
}

/**
 * LOCAL TESTING ONLY (EXPO_PUBLIC_DEV_MODE=true) — replaces Supabase sign-in with a
 * one-time local name entry, and feeds useOnlineSession a fake dev token instead of a
 * real access token. Requires the server running with DEV_MODE=true too (see
 * server/.env.example) — otherwise MasaRoom.onAuth will reject the connection.
 */
function DevModeApp() {
  const identity = useDevIdentity();

  if (!identity.ready) return <View style={styles.loading} />;
  if (!identity.userId || !identity.name) {
    return <DevNameEntryScreen onSubmit={identity.setName} />;
  }
  return <Session devIdentity={{ userId: identity.userId, token: makeDevToken(identity.userId, identity.name) }} />;
}

function OnlineApp() {
  const auth = useAuth();

  if (auth.loading) return <View style={styles.loading} />;
  if (!auth.isSignedIn) {
    return (
      <SignInScreen onGoogle={auth.signInWithGoogle} onApple={auth.signInWithApple} error={auth.error} />
    );
  }
  return <Session />;
}

/** Only mounted once identified (real Supabase session or dev identity) — useOnlineSession
 *  needs some token to connect. */
function Session({ devIdentity }: { devIdentity?: { userId: string; token: string } }) {
  const { status, error, lobby, lobbyActions, vm, actions } = useOnlineSession(devIdentity);

  if (status === 'error') {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{error ?? 'Bağlantı koptu'}</Text>
      </View>
    );
  }
  if (status === 'table' && vm) {
    return <MasaScreenContainer vm={vm} actions={actions} />;
  }
  if (status === 'lobby' && lobby) {
    return <LobbyScreen lobby={lobby} actions={lobbyActions} />;
  }
  return <View style={styles.loading} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: font.body,
    fontSize: 14,
    color: color.cardRed,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
