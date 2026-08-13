import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { color } from '../theme/tokens';

export function LogLine({ text }: { text: string }) {
  return <Text style={styles.line}>{text}</Text>;
}

const styles = StyleSheet.create({
  line: {
    fontSize: 12,
    color: color.neutral700,
    lineHeight: 16,
    fontStyle: 'italic',
    minHeight: 30,
  },
});
