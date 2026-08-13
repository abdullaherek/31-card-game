import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../theme/tokens';

/** Top-right meta control — not gated by whose turn it is. */
export function PauseButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Oyunu duraklatmayı öner"
    >
      <Text style={styles.label}>Durdur</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: font.headingSemi,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.08 * 11,
    textTransform: 'uppercase',
    color: color.accent700,
  },
});
