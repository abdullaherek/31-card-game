import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HandValue } from '../game/handEvaluator';
import { handQualifier, hierarchyRank } from '../lib/presentation';
import { color, font, radius, tabularNums } from '../theme/tokens';

/**
 * "As seçimi — değer kartları" (1a). One box per handOptions() entry.
 * `pick` is UI-only (see HANDOFF.md State Management) — the engine already picks the
 * winning interpretation by score; this just lets the player see and highlight one.
 */
export function HandOptions({
  options,
  pick,
  onPick,
}: {
  options: HandValue[];
  pick: number | null;
  onPick: (total: number) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Elin</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const rank = hierarchyRank(o);
          const qualifier = handQualifier(o, rank);
          const selected = pick === o.total;
          return (
            <Pressable
              key={o.total}
              onPress={() => onPick(o.total)}
              style={styles.box}
              accessibilityRole="button"
              accessibilityLabel={`${o.label} — hiyerarşide ${rank}.`}
            >
              <View style={[styles.header, selected ? styles.headerSelected : styles.headerUnselected]}>
                <Text style={[styles.value, selected ? styles.valueSelected : styles.valueUnselected]}>
                  {o.label}
                </Text>
                <Text style={selected ? styles.tagSelected : styles.tagUnselected}>
                  {selected ? 'SEÇİLİ' : 'SEÇ'}
                </Text>
              </View>
              <Text style={styles.rankLine}>hiyerarşide {rank}.</Text>
              <Text style={styles.qualifier}>{qualifier}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.18 * 11,
    textTransform: 'uppercase',
    color: color.neutral700,
  },
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  box: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.neutral300,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 9,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: -9,
    paddingHorizontal: 9,
    paddingBottom: 3,
    marginBottom: 4,
  },
  headerSelected: {
    borderBottomWidth: 2,
    borderBottomColor: color.accent,
  },
  headerUnselected: {
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
    opacity: 0.72,
  },
  value: {
    fontFamily: font.headingSemi,
    fontSize: 26,
    lineHeight: 29,
    ...tabularNums,
  },
  valueSelected: {
    fontWeight: '600',
    color: color.text,
  },
  valueUnselected: {
    fontFamily: font.headingDisplay,
    fontWeight: '400',
    color: color.text,
  },
  tagSelected: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.16 * 10,
    textTransform: 'uppercase',
    color: color.accent700,
  },
  tagUnselected: {
    fontSize: 10,
    letterSpacing: 0.16 * 10,
    textTransform: 'uppercase',
    color: color.neutral600,
  },
  rankLine: {
    fontSize: 12,
    fontWeight: '600',
    color: color.neutral700,
    ...tabularNums,
  },
  qualifier: {
    fontSize: 11,
    color: color.neutral700,
    fontStyle: 'italic',
  },
});
