import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color } from '../theme/tokens';

export function DebtStrip({ owed }: { owed: number }) {
  return (
    <View style={styles.strip}>
      <Text style={styles.kicker}>Borç</Text>
      <Text style={styles.line}>
        Masada {owed} çip borcun var — görmeden başka hiçbir şey yapamazsın.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
    backgroundColor: color.accent100,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.18 * 11,
    textTransform: 'uppercase',
    color: color.accent700,
    flexShrink: 0,
  },
  line: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: color.accent800,
  },
});
