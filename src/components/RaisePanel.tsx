import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ECONOMY } from '../game/handEvaluator';
import { color, font, radius, tabularNums } from '../theme/tokens';
import { Button } from './Button';

const PRESETS = [2, 5, 10, 25, 50, 100];

export function RaisePanel({
  amount,
  onChangeAmount,
  onCancel,
  onConfirm,
}: {
  amount: number;
  onChangeAmount: (n: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Vuruş</Text>
        <Text style={styles.amount}>
          {amount} <Text style={styles.amountUnit}>çip</Text>
        </Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={ECONOMY.MIN_RAISE}
        maximumValue={ECONOMY.MAX_RAISE}
        step={1}
        value={amount}
        onValueChange={onChangeAmount}
        minimumTrackTintColor={color.accent}
        maximumTrackTintColor={color.neutral300}
        thumbTintColor={color.accent}
      />

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <Button
            key={p}
            label={String(p)}
            variant="ghost"
            onPress={() => onChangeAmount(p)}
            style={styles.presetButton}
            textStyle={styles.presetLabel}
          />
        ))}
      </View>

      <View style={styles.actionRow}>
        <Button label="Vazgeç" variant="secondary" onPress={onCancel} style={styles.cancelButton} textStyle={styles.actionLabel} />
        <Button
          label="Vur ve kapalı çek"
          variant="primary"
          onPress={onConfirm}
          style={styles.confirmButton}
          textStyle={styles.actionLabel}
        />
      </View>

      <Text style={styles.note}>
        Vurulan çip potu büyütür ve sana bir kapalı çekim hakkı verir — masa bu kartı görmez.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1.5,
    borderColor: color.accent300,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.18 * 11,
    textTransform: 'uppercase',
    color: color.neutral700,
  },
  amount: {
    fontFamily: font.headingSemi,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 27,
    color: color.text,
    ...tabularNums,
  },
  amountUnit: {
    fontFamily: font.body,
    fontSize: 13,
    fontWeight: '400',
    color: color.neutral700,
  },
  slider: {
    width: '100%',
    height: 22,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: 0,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    ...tabularNums,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 7,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 9,
    minHeight: 0,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 9,
    minHeight: 0,
  },
  actionLabel: {
    fontSize: 14,
  },
  note: {
    fontSize: 11,
    fontStyle: 'italic',
    color: color.neutral700,
    lineHeight: 14.85,
  },
});
