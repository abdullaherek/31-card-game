import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, tabularNums } from '../theme/tokens';
import { KutukSeal } from './KutukSeal';
import { PlayingCard } from './PlayingCard';
import type { SeatCardView } from './types';

export function Seat({
  name,
  isKutuk,
  isTurn,
  stack,
  contributed,
  cards,
  statusText,
}: {
  name: string;
  isKutuk: boolean;
  isTurn: boolean;
  stack: number;
  contributed: number;
  cards: SeatCardView[];
  statusText: string;
}) {
  return (
    <View style={styles.seat}>
      <View style={styles.nameRow}>
        {isKutuk ? <KutukSeal /> : null}
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {isTurn ? <View style={styles.turnDot} /> : null}
      </View>

      <View style={styles.chipRow}>
        <Text style={styles.chipText}>{stack} ç</Text>
        <Text style={styles.chipContributed}>·{contributed}</Text>
      </View>

      <View style={styles.cardStack}>
        {cards.map((c, i) => (
          <PlayingCard
            key={i}
            size="sm"
            state={c.state}
            rank={c.rank}
            suit={c.suit}
            style={i === 0 ? undefined : styles.cardOverlap}
          />
        ))}
      </View>

      <Text style={styles.status}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    flexDirection: 'column',
    gap: 5,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    minWidth: 0,
  },
  name: {
    fontFamily: font.headingSemi,
    fontSize: 17,
    fontWeight: '600',
    color: color.text,
    flexShrink: 1,
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.accent,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipText: {
    fontSize: 11.5,
    letterSpacing: 0.04 * 11.5,
    color: color.neutral700,
    ...tabularNums,
  },
  chipContributed: {
    fontSize: 11.5,
    fontWeight: '600',
    color: color.accent700,
    ...tabularNums,
  },
  cardStack: {
    flexDirection: 'row',
    paddingLeft: 8,
    minHeight: 40,
    alignItems: 'flex-start',
  },
  cardOverlap: {
    marginLeft: -8,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.14 * 11,
    textTransform: 'uppercase',
    color: color.accent700,
    height: 14,
  },
});
