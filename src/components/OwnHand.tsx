import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, tabularNums } from '../theme/tokens';
import { PlayingCard } from './PlayingCard';
import type { SeatCardView } from './types';

export function OwnHand({
  cards,
  stack,
  bet,
  isWatching,
}: {
  cards: SeatCardView[];
  stack: number;
  bet: number;
  isWatching: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.cards}>
          {cards.map((c, i) => (
            <PlayingCard
              key={i}
              size="lg"
              state={c.state}
              rank={c.rank}
              suit={c.suit}
              style={i === 0 ? undefined : styles.overlap}
            />
          ))}
        </View>
        <View style={styles.meta}>
          <Text style={styles.stackLine}>Sen · {stack} ç</Text>
          <Text style={styles.betLine}>bu ele {bet} çip</Text>
        </View>
      </View>
      {isWatching ? (
        <View style={styles.watchingStrip}>
          <Text style={styles.watchingText}>İZLİYORSUN — bu el boyunca kart çekemezsin</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  cards: {
    // No `gap` here on purpose: each card's own negative marginLeft is what creates
    // the overlap ("hafif bindirmeli" per HANDOFF.md) — a flex `gap` would cancel it out.
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 7,
  },
  overlap: {
    marginLeft: -7,
  },
  meta: {
    alignItems: 'flex-end',
    paddingBottom: 2,
  },
  stackLine: {
    fontSize: 11,
    letterSpacing: 0.16 * 11,
    textTransform: 'uppercase',
    color: color.neutral700,
  },
  betLine: {
    fontFamily: font.headingSemi,
    fontSize: 16,
    fontWeight: '600',
    color: color.accent700,
    ...tabularNums,
  },
  watchingStrip: {
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
    backgroundColor: color.accent100,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  watchingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.04 * 12,
    color: color.accent800,
  },
});
