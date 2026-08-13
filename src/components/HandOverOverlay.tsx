import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius, tabularNums } from '../theme/tokens';
import { KutukSeal } from './KutukSeal';

export interface HandOverRow {
  name: string;
  label: string;
  delta: string;
  isWinner: boolean;
}

export function HandOverOverlay({
  is31,
  title,
  subtitle,
  potAmount,
  rows,
  kutukLine,
}: {
  is31: boolean;
  /** Non-31 label, e.g. "24" or "Patlak" — shown when !is31. */
  title: string;
  subtitle: string;
  potAmount: number;
  rows: HandOverRow[];
  kutukLine: string;
}) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.panel}>
        <View style={styles.headline}>
          {is31 ? (
            <View style={styles.declareBlock}>
              <Text style={styles.declareKicker}>Deklare edildi</Text>
              <Text style={styles.declareValue}>31</Text>
            </View>
          ) : (
            <Text style={styles.plainValue}>{title}</Text>
          )}
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.potKicker}>pot {potAmount} çip</Text>
        </View>

        <View style={styles.hairline} />

        <View>
          {rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.rowName, r.isWinner ? styles.rowNameWinner : styles.rowNameLoser]}>
                {r.name}
              </Text>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowDelta}>{r.delta}</Text>
            </View>
          ))}
        </View>

        <View style={styles.kutukRow}>
          <KutukSeal size={19} fontSize={11} />
          <Text style={styles.kutukText}>{kutukLine}</Text>
        </View>

        <Text style={styles.closing}>yeni el dağıtılıyor…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'rgba(45, 43, 43, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.neutral300,
    borderRadius: radius.md,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 20,
    gap: 14,
    // shadow-lg
    shadowColor: color.neutral900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 16,
  },
  headline: {
    alignItems: 'center',
    gap: 3,
  },
  declareBlock: {
    alignItems: 'center',
    gap: 5,
  },
  declareKicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.28 * 11,
    textTransform: 'uppercase',
    color: color.accent700,
  },
  declareValue: {
    fontFamily: font.headingDisplay,
    fontSize: 72,
    fontWeight: '400',
    lineHeight: 69,
    color: color.accent800,
    borderBottomWidth: 2,
    borderBottomColor: color.accent,
    paddingHorizontal: 16,
    paddingBottom: 5,
    ...tabularNums,
  },
  plainValue: {
    fontFamily: font.headingDisplay,
    fontSize: 46,
    fontWeight: '400',
    lineHeight: 46,
    color: color.text,
    ...tabularNums,
  },
  subtitle: {
    fontFamily: font.headingSemi,
    fontSize: 20,
    fontWeight: '600',
    color: color.text,
    marginTop: 7,
  },
  potKicker: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.16 * 12,
    textTransform: 'uppercase',
    color: color.neutral700,
    ...tabularNums,
  },
  hairline: {
    height: 1.5,
    backgroundColor: color.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  rowName: {
    flex: 1,
    fontFamily: font.headingSemi,
    fontSize: 17,
    fontWeight: '600',
  },
  rowNameWinner: {
    color: color.accent800,
  },
  rowNameLoser: {
    color: color.neutral700,
  },
  rowLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    color: color.neutral700,
  },
  rowDelta: {
    width: 72,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    ...tabularNums,
  },
  kutukRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: color.accent300,
    borderRadius: radius.md,
  },
  kutukText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
    color: color.accent800,
  },
  closing: {
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.14 * 11.5,
    textTransform: 'uppercase',
    color: color.neutral600,
  },
});
