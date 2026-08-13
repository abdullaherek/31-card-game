import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../theme/tokens';
import { Button } from './Button';

/** Resuming is a single unilateral tap — only pausing needs a vote. */
export function PausedOverlay({ onResume }: { onResume: () => void }) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        <Text style={styles.title}>OYUN DURAKLATILDI</Text>
        <Text style={styles.sub}>Devam etmek için hazır olduğunuzda dokunun.</Text>
        <Button label="Devam Et" variant="primary" onPress={onResume} style={styles.button} />
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
    zIndex: 50,
    backgroundColor: 'rgba(45, 43, 43, 0.62)',
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
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  title: {
    fontFamily: font.headingSemi,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.04 * 22,
    color: color.text,
  },
  sub: {
    fontSize: 13,
    color: color.neutral700,
    textAlign: 'center',
  },
  button: {
    minWidth: 160,
  },
});
