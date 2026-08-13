import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import type { LobbyActions, LobbyViewModel } from '../hooks/useOnlineSession';
import { color, font, layout, radius } from '../theme/tokens';

export function LobbyScreen({ lobby, actions }: { lobby: LobbyViewModel; actions: LobbyActions }) {
  const { state, incomingRequest, isSeated, requestPending, lastJoinResult } = lobby;

  return (
    <View style={styles.frame}>
      <Text style={styles.brand}>31</Text>
      <Text style={styles.subtitle}>Masa · {state.seats.length}/5 kişi</Text>

      <View style={styles.seatList}>
        {state.seats.map((s) => (
          <View key={s.userId} style={styles.seatChip}>
            <Text style={styles.seatName}>{s.displayName}</Text>
          </View>
        ))}
        {state.seats.length === 0 ? <Text style={styles.empty}>Masada henüz kimse yok</Text> : null}
      </View>

      {incomingRequest ? (
        <View style={styles.requestCard}>
          <Text style={styles.requestText}>{incomingRequest.name} masaya katılmak istiyor</Text>
          <View style={styles.requestButtons}>
            <Button
              label="Reddet"
              variant="secondary"
              onPress={() => actions.onRespondJoin(incomingRequest.requesterId, false)}
              style={styles.requestButton}
            />
            <Button
              label="Kabul Et"
              variant="primary"
              onPress={() => actions.onRespondJoin(incomingRequest.requesterId, true)}
              style={styles.requestButton}
            />
          </View>
        </View>
      ) : null}

      {!isSeated ? (
        <Button
          label={requestPending ? 'Onay bekleniyor…' : 'Masaya Katılmak İstiyorum'}
          variant="primary"
          disabled={requestPending}
          onPress={actions.onRequestSeat}
          style={styles.wideButton}
        />
      ) : null}

      {!isSeated && lastJoinResult && !lastJoinResult.admitted ? (
        <Text style={styles.waiting}>
          {lastJoinResult.reason === 'FULL' ? 'Masa dolu.' : 'İsteğin reddedildi.'}
        </Text>
      ) : null}

      {isSeated && state.canStart ? (
        <Button label="Masayı Başlat" variant="primary" onPress={actions.onStartTable} style={styles.wideButton} />
      ) : null}

      {isSeated && !state.canStart ? (
        <Text style={styles.waiting}>En az 2 kişi olunca masayı başlatabilirsiniz.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: layout.deviceHeight,
    backgroundColor: color.bg,
    alignItems: 'center',
    padding: 24,
    paddingTop: layout.safeTop,
    gap: 18,
  },
  brand: {
    fontFamily: font.headingSemi,
    fontSize: 32,
    fontWeight: '600',
    color: color.text,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 0.1 * 13,
    textTransform: 'uppercase',
    color: color.neutral700,
  },
  seatList: {
    width: '100%',
    gap: 8,
  },
  seatChip: {
    borderWidth: 1.5,
    borderColor: color.accent300,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  seatName: {
    fontFamily: font.headingSemi,
    fontSize: 16,
    fontWeight: '600',
    color: color.text,
  },
  empty: {
    fontSize: 13,
    color: color.neutral700,
    fontStyle: 'italic',
  },
  requestCard: {
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
    backgroundColor: color.accent100,
    padding: 12,
    gap: 10,
  },
  requestText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.accent800,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    flex: 1,
  },
  wideButton: {
    width: '100%',
  },
  waiting: {
    fontSize: 12,
    color: color.neutral700,
    textAlign: 'center',
  },
});
