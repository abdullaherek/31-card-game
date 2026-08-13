import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../theme/tokens';

export function Declare31Button({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="31 de! Demezsen 30 sayılır."
    >
      <Text style={styles.title}>
        31 DE!  <Text style={styles.subtitle}>demezsen 30 sayılır</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderWidth: 2,
    borderColor: color.accent,
    backgroundColor: color.accent100,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  title: {
    fontFamily: font.headingSemi,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.06 * 20,
    color: color.accent800,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.02 * 11,
  },
});
