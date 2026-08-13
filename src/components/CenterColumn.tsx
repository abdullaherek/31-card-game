import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Rank, Suit } from '../game/handEvaluator';
import { color, font, radius, tabularNums } from '../theme/tokens';
import { Deck } from './Deck';
import { PlayingCard } from './PlayingCard';

export function CenterColumn({
  deckRemaining,
  topCard,
  pot,
  kutukName,
}: {
  deckRemaining: number;
  topCard: { rank: Rank; suit: Suit } | null;
  pot: number;
  kutukName: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.deckRow}>
        <Deck />
        {topCard ? (
          <PlayingCard size="deck" state="seen" rank={topCard.rank} suit={topCard.suit} />
        ) : (
          <View style={styles.deckPlaceholder} />
        )}
      </View>
      <Text style={styles.deckCount}>{deckRemaining} KART</Text>

      <View style={styles.hairline} />

      <View style={styles.potBlock}>
        <Text style={styles.potKicker}>Pot</Text>
        <Text style={styles.potValue}>{pot}</Text>
      </View>

      <View style={styles.hairline} />

      <View style={styles.kutukBox}>
        <Text style={styles.kutukKicker}>Kütük</Text>
        <Text style={styles.kutukName}>{kutukName}</Text>
        <Text style={styles.kutukSub}>devri: sadece 31</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 2,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  deckPlaceholder: {
    width: 40,
    height: 55,
  },
  deckCount: {
    fontSize: 10.5,
    letterSpacing: 0.14 * 10.5,
    textTransform: 'uppercase',
    color: color.neutral700,
    ...tabularNums,
  },
  hairline: {
    width: '100%',
    height: 1.5,
    backgroundColor: color.divider,
  },
  potBlock: {
    alignItems: 'center',
  },
  potKicker: {
    fontSize: 10.5,
    letterSpacing: 0.18 * 10.5,
    textTransform: 'uppercase',
    color: color.neutral700,
  },
  potValue: {
    fontFamily: font.headingDisplay,
    fontSize: 40,
    fontWeight: '400',
    letterSpacing: -0.01 * 40,
    color: color.text,
    ...tabularNums,
  },
  kutukBox: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: color.accent300,
    borderRadius: radius.md,
  },
  kutukKicker: {
    fontSize: 10,
    letterSpacing: 0.2 * 10,
    textTransform: 'uppercase',
    color: color.accent700,
  },
  kutukName: {
    fontFamily: font.headingSemi,
    fontSize: 18,
    fontWeight: '600',
    color: color.text,
  },
  kutukSub: {
    fontSize: 10,
    color: color.neutral700,
    letterSpacing: 0.02 * 10,
  },
});
