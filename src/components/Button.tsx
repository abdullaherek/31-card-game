import React from 'react';
import {
  Insets,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { color, font, radius } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Ports .btn / .btn-primary / .btn-secondary / .btn-ghost from the Classical
 * design system (design-reference/_ds/.../styles.css). Gold is contour-only —
 * never a filled surface — per HANDOFF.md's design rule.
 */
export function Button({
  label,
  variant,
  disabled,
  onPress,
  style,
  textStyle,
  accessibilityHint,
  hitSlop,
}: {
  label: string;
  variant: ButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityHint?: string;
  hitSlop?: Insets | number;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={disabled ? accessibilityHint : undefined}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      <Text style={[styles.label, variantTextStyles[variant], textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  label: {
    fontFamily: font.headingSemi,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 19.2,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    borderColor: color.accent,
    backgroundColor: 'transparent',
  },
  // Bumped from the divider tint (a near-invisible 16%-opacity hairline) to a solid
  // neutral border — legibility pass: secondary actions need to actually read as buttons.
  secondary: {
    borderColor: color.neutral400,
    backgroundColor: 'transparent',
  },
  ghost: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: { color: color.accent },
  secondary: { color: color.text },
  ghost: { color: color.accent },
});
