import type { MasaViewModel } from '../screens/masaTypes';

/**
 * Hand-authored fixture matching design-reference/Masa.dc.html's default render,
 * used to check the static layout against the handoff measurements before any
 * game logic is wired in (see HANDOFF.md — "önce sahte state").
 */
export const MOCK_TABLE: MasaViewModel = {
  roomCode: 'K4T9',
  handNo: 1,
  seats: {
    topLeft: {
      name: 'Barış',
      isKutuk: false,
      isTurn: false,
      stack: 615,
      contributed: 2,
      cards: [{ state: 'back' }, { state: 'back' }],
      statusText: '',
    },
    topRight: {
      name: 'Deniz',
      isKutuk: false,
      isTurn: true,
      stack: 860,
      contributed: 2,
      cards: [{ state: 'back' }, { state: 'back' }],
      statusText: '',
    },
    bottomLeft: {
      name: 'Umut',
      isKutuk: false,
      isTurn: false,
      stack: 980,
      contributed: 2,
      cards: [{ state: 'back' }, { state: 'back' }],
      statusText: '',
    },
    bottomRight: {
      name: 'Ceren',
      isKutuk: true,
      isTurn: false,
      stack: 1240,
      contributed: 2,
      cards: [{ state: 'back' }, { state: 'back' }],
      statusText: '',
    },
  },
  center: {
    deckRemaining: 92,
    topCard: { rank: 'Q', suit: 'D' },
    pot: 10,
    kutukName: 'Ceren',
  },
  own: {
    cards: [
      { state: 'own', rank: 'K', suit: 'S' },
      { state: 'own', rank: '3', suit: 'H' },
    ],
    stack: 998,
    bet: 2,
    isWatching: false,
  },
  handOptions: {
    options: [
      { category: 'TOTAL', total: 13, score: 113, label: '13' },
    ],
    pick: 13,
  },
  raising: false,
  raiseAmount: 10,
  can31: false,
  debt: null,
  turn: { pct: 70, label: 'sıra Deniz' },
  actionBar: { legalActions: [], owed: 0 },
  logLine: 'El başladı. Ante 2 çip, pot 10. Kütük: Ceren',
  handOver: null,
  pause: { isPaused: false, vote: null },
};
