/**
 * Retheme: classic card-table look — dark green felt, gold contour, light cards with
 * true red/black suit coloring. Originally ported from the "Classical" cream/parchment
 * design-reference/_ds/classical-.../styles.css; that light-theme ramp direction no
 * longer applies, so most steps below were recalibrated for a dark background rather
 * than reused verbatim. See the comments on each ramp for what changed and why.
 * Do not introduce new colors outside this file.
 *
 * Legibility pass (kept from the previous iteration): font sizes/paddings/borders are
 * scaled up and radius bumped a notch for a bolder feel. The gold-contour-only rule
 * (no filled gold surfaces) is unchanged.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const color = {
  bg: '#0c3b29', // dark felt green — was #f3f2f2 (light cream)
  surface: '#134a37', // modal/panel green, one step lighter than bg
  text: '#f4efe1', // warm cream — primary text ON the felt (was near-black, for a light bg)
  accent: '#d9ae3c', // primary gold contour/fill — brighter than before, needs to read on dark
  accent2: '#c89a3c',
  divider: 'rgba(244, 239, 225, 0.18)', // light hairline on dark felt (was dark-on-light)

  // Neutral ramp: kept as literal light→dark grays (100 lightest, 900 darkest) — used
  // ONLY for things that must render as actual paper regardless of table theme: the
  // "own" card face (light bg + dark border) and light borders/frames that read fine
  // sitting on a dark background. 600/700 are the exception — see below.
  neutral100: '#f8f4f4',
  neutral200: '#eae7e7',
  neutral300: '#d7d3d3',
  neutral400: '#bab6b6',
  neutral500: '#9b9797',
  // 600/700 used to be dark grays for body text on a light bg. Nothing in this app
  // uses them for card-face text (that's cardInk/cardRed below), so they were free to
  // flip to light warm grays for secondary/tertiary text sitting on the dark felt —
  // 700 stays the more prominent of the two, now meaning "lighter", not "darker".
  neutral600: '#a89c86',
  neutral700: '#d6cbb4',
  neutral800: '#444141',
  neutral900: '#2d2b2b', // shadow tint — shadows stay dark regardless of theme

  // Gold ramp, recalibrated for readability ON the dark felt: 100/900 are now surface
  // tints (100 = the one "dark tinted panel" callouts use; 900 = darkest, unused
  // filler) instead of pale-cream-to-deep-brown; 700/800 are bright, legible gold TEXT
  // instead of dark brown text. 400 is untouched — it borders a light card face, which
  // stays a light card face regardless of table theme.
  accent100: '#3c2f14', // dark warm gold-brown surface tint (debt strip / 31-button / etc.)
  accent200: '#e9cd7c', // light-mid gold — "seen" card ring halo
  accent300: '#9c7d3a', // muted gold border/frame directly on the felt (kütük box, panels)
  accent400: '#e1ad66', // unchanged — borders a light card face
  accent500: '#c28d41',
  accent600: '#a06f24',
  accent700: '#e2c46a', // bright gold text directly on the felt/dark panels
  accent800: '#f2dd94', // brighter gold text (winner names, debt/declare copy)
  accent900: '#241c0d',

  // Card faces are always light paper, independent of the table color — that's the
  // whole point of "cards clearly stand out against dark felt." Suit color follows
  // the classic convention (red hearts/diamonds, black spades/clubs) rather than the
  // old single-color-per-card-state scheme.
  cardInk: '#1c1c1c',
  cardRed: '#a8342a',
  cardSeenBg: '#fdf1d6',

  // Card backs get an actual classic pattern instead of a gray hatch.
  cardBack: '#1c3f6e',
  cardBackPattern: '#2f5a94',
} as const;

export const font = {
  headingSemi: 'CormorantGaramond_600SemiBold',
  headingDisplay: 'CormorantGaramond_400Regular',
  body: 'Lora_400Regular',
  bodySemi: 'Lora_600SemiBold',
} as const;

export const space = {
  1: 4.6,
  2: 9.2,
  3: 13.8,
  4: 18.4,
  6: 27.6,
  8: 36.8,
} as const;

export const radius = {
  sm: 3,
  md: 5,
  lg: 9,
} as const;

/** font-variant-numeric: tabular-nums */
export const tabularNums: Pick<TextStyle, 'fontVariant'> = {
  fontVariant: ['tabular-nums'],
};

function shadow(offsetY: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: color.neutral900,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
  })!;
}

export const elevation = {
  sm: shadow(1, 2, 0.14, 2),
  md: shadow(3, 10, 0.16, 6),
  lg: shadow(12, 32, 0.22, 16),
};

/** Screen frame — coordinates fixed per handoff so Reanimated bindings don't shift later. */
export const layout = {
  deviceWidth: 402,
  deviceHeight: 874,
  safeTop: 56,
  safeBottom: 30,
  paddingHorizontal: 12,
};
