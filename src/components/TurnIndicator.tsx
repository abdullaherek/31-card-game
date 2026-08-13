import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, tabularNums } from '../theme/tokens';

export function TurnIndicator({ pct, label }: { pct: number; label: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: color.divider,
    overflow: 'hidden',
    borderRadius: 2,
  },
  fill: {
    height: '100%',
    backgroundColor: color.accent,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.14 * 11,
    textTransform: 'uppercase',
    color: color.neutral700,
    ...tabularNums,
  },
});
