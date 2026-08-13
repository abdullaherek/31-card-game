import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { color, font, layout, radius } from '../theme/tokens';

/** LOCAL TESTING ONLY — see src/net/devAuth.ts. Stands in for the Google/Apple
 *  sign-in screen so 2+ simulators/devices can pick distinct names locally. */
export function DevNameEntryScreen({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <View style={styles.frame}>
      <Text style={styles.brand}>31</Text>
      <Text style={styles.subtitle}>DEV MODE — isim gir</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Adın"
        placeholderTextColor={color.neutral600}
        style={styles.input}
        autoFocus
        autoCapitalize="words"
        onSubmitEditing={() => name.trim() && onSubmit(name.trim())}
      />

      <Button
        label="Devam Et"
        variant="primary"
        disabled={!name.trim()}
        onPress={() => onSubmit(name.trim())}
        style={styles.button}
      />
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
    gap: 16,
  },
  brand: {
    fontFamily: font.headingSemi,
    fontSize: 40,
    fontWeight: '600',
    color: color.text,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 0.1 * 12,
    textTransform: 'uppercase',
    color: color.accent700,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: color.neutral400,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: color.text,
    fontFamily: font.body,
  },
  button: {
    width: '100%',
  },
});
