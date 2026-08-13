import React from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '../theme/tokens';
import { CardBackTexture } from './CardBackTexture';

// Matches PlayingCard's "deck" size spec (see SIZES.deck) — kept in sync manually
// since the deck stack is composed here rather than through PlayingCard itself.
const WIDTH = 40;
const HEIGHT = 55;
const RADIUS = 4;

/** Three-layer stock pile — the two back sheets peek out from behind the top card. */
export function Deck() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.layer, styles.layerBack1]} />
      <View style={[styles.layer, styles.layerBack2]} />
      <View style={[styles.layer, styles.layerTop]}>
        <CardBackTexture stripeWidth={2.8} radius={RADIUS} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH,
    height: HEIGHT,
  },
  layer: {
    position: 'absolute',
    width: WIDTH,
    height: HEIGHT,
    borderRadius: RADIUS,
    backgroundColor: color.cardBack,
  },
  layerBack1: {
    top: 3,
    left: 3,
    borderWidth: 1,
    borderColor: color.accent300,
  },
  layerBack2: {
    top: 1.5,
    left: 1.5,
    borderWidth: 1,
    borderColor: color.accent300,
  },
  layerTop: {
    top: 0,
    left: 0,
    borderWidth: 1.5,
    borderColor: color.accent300,
    overflow: 'hidden',
  },
});
