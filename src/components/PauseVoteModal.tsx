import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../theme/tokens';
import { Button } from './Button';

/**
 * One player at a time, asked whether to pause. A single "Evet" anywhere in the
 * queue pauses immediately — see useHotSeatTable's onVoteAnswer.
 */
export function PauseVoteModal({ name, onAnswer }: { name: string; onAnswer: (sayYes: boolean) => void }) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>Oylama</Text>
        <Text style={styles.question}>{name}, oyunu duraklatmak ister misin?</Text>
        <View style={styles.row}>
          <Button label="Hayır" variant="secondary" onPress={() => onAnswer(false)} style={styles.btn} />
          <Button label="Evet" variant="primary" onPress={() => onAnswer(true)} style={styles.btn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    backgroundColor: 'rgba(45, 43, 43, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.neutral300,
    borderRadius: radius.md,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2 * 11,
    textTransform: 'uppercase',
    color: color.accent700,
  },
  question: {
    fontFamily: font.headingSemi,
    fontSize: 19,
    fontWeight: '600',
    color: color.text,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
  },
});
