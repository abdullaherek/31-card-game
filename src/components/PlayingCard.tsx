import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { Rank, Suit } from '../game/handEvaluator';
import { color, font, tabularNums } from '../theme/tokens';
import { CardBackTexture } from './CardBackTexture';

const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

// Classic convention: hearts/diamonds red, spades/clubs black — independent of
// own/seen state, which is instead conveyed by the card's border/ring/tint.
const SUIT_COLOR: Record<Suit, string> = {
  S: color.cardInk,
  C: color.cardInk,
  H: color.cardRed,
  D: color.cardRed,
};

/** 'back' = kapalı (rakip). 'own' = kendi açık kartım. 'seen' = masa gördü (açık çekilmiş). */
export type CardState = 'back' | 'own' | 'seen';
export type CardSize = 'sm' | 'lg' | 'deck';

interface SizeSpec {
  width: number;
  height: number;
  radius: number;
  rankSize: number;
  suitSize: number;
  showSuit: boolean;
  stripeWidth: number;
}

// Legibility pass: sizes and rank/suit text bumped ~20% over the original handoff
// numbers (22x31/44x62/34x47) for easier reading at a glance; proportions kept.
const SIZES: Record<CardSize, SizeSpec> = {
  // opponent seat card — rank only (no room for suit at this scale)
  sm: { width: 27, height: 38, radius: 3, rankSize: 15, suitSize: 0, showSuit: false, stripeWidth: 2.3 },
  // own hand card — rank top-left / suit bottom-right
  lg: { width: 52, height: 73, radius: 4, rankSize: 20, suitSize: 13, showSuit: true, stripeWidth: 2.3 },
  // deck's top open card — rank + suit stacked and centered
  deck: { width: 40, height: 55, radius: 4, rankSize: 19, suitSize: 12, showSuit: true, stripeWidth: 2.8 },
};

export function PlayingCard({
  state,
  size,
  rank,
  suit,
  style,
}: {
  state: CardState;
  size: CardSize;
  /** Required unless state === 'back' (a face-down card renders no rank/suit). */
  rank?: Rank;
  suit?: Suit;
  style?: StyleProp<ViewStyle>;
}) {
  const spec = SIZES[size];
  const suitSymbol = suit ? SUIT_SYMBOL[suit] : '';

  if (state === 'back') {
    return (
      <View
        style={[
          styles.base,
          {
            width: spec.width,
            height: spec.height,
            borderRadius: spec.radius,
            borderWidth: 1.5,
            borderColor: color.accent300,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <CardBackTexture stripeWidth={spec.stripeWidth} radius={spec.radius} />
      </View>
    );
  }

  const isSeen = state === 'seen';
  const containerStyle = [
    styles.base,
    {
      width: spec.width,
      height: spec.height,
      borderRadius: spec.radius,
      borderWidth: 1,
      borderColor: isSeen ? color.accent400 : color.neutral400,
      backgroundColor: isSeen ? color.cardSeenBg : color.neutral100,
    },
    // "masa gördü" ring — only the large own-hand card carries it in the reference build
    // (design-reference/Masa.dc.html line 151); the small seat/deck cards deliberately don't.
    size === 'lg' && isSeen ? styles.seenRing : null,
    size === 'lg' ? styles.lgCard : styles.centered,
    size === 'deck' ? styles.deckGap : null,
    style,
  ];
  // Suit color, not own/seen state — see SUIT_COLOR above.
  const textColor = suit ? SUIT_COLOR[suit] : color.cardInk;

  if (size === 'lg') {
    return (
      <View style={containerStyle}>
        <Text style={[styles.rank, { fontSize: spec.rankSize, color: textColor }]}>{rank}</Text>
        {spec.showSuit ? (
          <Text style={[styles.suit, styles.alignEnd, { fontSize: spec.suitSize, color: textColor }]}>
            {suitSymbol}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={[styles.rank, styles.centerText, { fontSize: spec.rankSize, color: textColor }]}>
        {rank}
      </Text>
      {spec.showSuit ? (
        <Text style={[styles.suit, styles.centerText, { fontSize: spec.suitSize, color: textColor }]}>
          {suitSymbol}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lgCard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  deckGap: {
    gap: 3,
  },
  seenRing: {
    // ports `box-shadow: 0 0 0 3px bg, 0 0 0 4px accent-200` — RN 0.74+/New Architecture.
    boxShadow: `0 0 0 3px ${color.bg}, 0 0 0 4px ${color.accent200}`,
  },
  rank: {
    fontFamily: font.headingSemi,
    fontWeight: '600',
    ...tabularNums,
  },
  suit: {
    fontFamily: font.headingSemi,
    fontWeight: '600',
    ...tabularNums,
  },
  alignEnd: {
    alignSelf: 'flex-end',
  },
  centerText: {
    textAlign: 'center',
  },
});
