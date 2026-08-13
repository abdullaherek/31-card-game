import React from 'react';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { color } from '../theme/tokens';

/**
 * Classic playing-card back: a navy lattice pattern (diagonal cross-hatch) on a
 * darker navy base, tiled as an SVG pattern — RN has no CSS gradients (see
 * HANDOFF.md "Assets", which described the original gray-hatch version of this).
 */
export function CardBackTexture({
  stripeWidth,
  radius,
  baseColor = color.cardBack,
  patternColor = color.cardBackPattern,
}: {
  stripeWidth: number;
  radius: number;
  baseColor?: string;
  patternColor?: string;
}) {
  const period = stripeWidth * 2;
  const patternId = `hatch-${stripeWidth}`;
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, borderRadius: radius }}
    >
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={period}
          height={period}
          patternTransform="rotate(45)"
        >
          <Rect x={0} y={0} width={period} height={period} fill={baseColor} />
          <Rect x={0} y={0} width={stripeWidth} height={period} fill={patternColor} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  );
}
