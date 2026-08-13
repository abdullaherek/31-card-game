import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { color, font, layout } from '../theme/tokens';

export function SignInScreen({
  onGoogle,
  onApple,
  error,
}: {
  onGoogle: () => void;
  onApple: () => void;
  error: string | null;
}) {
  return (
    <View style={styles.frame}>
      <Text style={styles.brand}>31</Text>
      <Text style={styles.subtitle}>Devam etmek için giriş yap</Text>

      <View style={styles.buttons}>
        <Button label="Google ile devam et" variant="primary" onPress={onGoogle} style={styles.button} />
        {Platform.OS === 'ios' ? (
          <Button label="Apple ile devam et" variant="secondary" onPress={onApple} style={styles.button} />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: layout.deviceHeight,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  brand: {
    fontFamily: font.headingSemi,
    fontSize: 40,
    fontWeight: '600',
    color: color.text,
  },
  subtitle: {
    fontSize: 14,
    color: color.neutral700,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  error: {
    fontSize: 12,
    color: color.cardRed,
    textAlign: 'center',
  },
});
