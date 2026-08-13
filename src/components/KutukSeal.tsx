import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '../theme/tokens';

/** 17x17 (or custom) double-ring "K" seal — marks the kütük seat. */
export function KutukSeal({ size = 17, fontSize = 10 }: { size?: number; fontSize?: number }) {
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize }]}>K</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // ports `inset 0 0 0 1.5px bg, inset 0 0 0 2.5px accent-300` — RN 0.74+/New Architecture
    boxShadow: `inset 0 0 0 1.5px ${color.bg}, inset 0 0 0 2.5px ${color.accent300}`,
  },
  letter: {
    fontFamily: font.headingSemi,
    fontWeight: '600',
    color: color.accent700,
  },
});
