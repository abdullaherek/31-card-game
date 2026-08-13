/**
 * "31" — el değerlendirme çekirdeği
 *
 * Hiyerarşi:  31(deklare) > 2-2 > As-3 > 7-7 > 14 > 30 > 29 > 28 > ... > 2 > patlak
 *
 * Kurallar (netleşmiş hali):
 *  - 104 kart (2 x 52), joker yok.
 *  - As = 1 veya 11 (31'i geçmeyecek en yüksek toplam otomatik seçilir).
 *  - Resimliler = 10.
 *  - 31 aşılırsa patlak (en düşük yorumda bile 31'i geçiyorsa).
 *  - 14 çekilen kartlarla da oluşabilir.
 *  - 2-2, As-3, 7-7 SADECE ilk iki kartta geçerli (kart çekilirse özellik kaybolur).
 *  - 31 sözlü deklare edilmezse 30 sayılır.
 *  - Eşitlikte kütük hiyerarşisi (kütüğe yakınlık) kazanır.
 */

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = 'S' | 'H' | 'D' | 'C';

export interface Card {
  rank: Rank;
  suit: Suit;
  /** false = kapalı çekilmiş, true = "aç" ile bedava alınmış (masa gördü) */
  faceUp?: boolean;
}

export type HandCategory =
  | 'THIRTY_ONE'    // deklare edilmiş 31
  | 'PAIR_TWOS'     // 2-2
  | 'ACE_THREE'     // As-3
  | 'PAIR_SEVENS'   // 7-7
  | 'FOURTEEN'      // toplam 14
  | 'TOTAL'         // 30, 29, 28 ...
  | 'BUST';         // patlak

export interface HandValue {
  category: HandCategory;
  /** 31'i geçmeyen en iyi toplam. Patlaksa en düşük olası toplam. */
  total: number;
  /** Büyük olan kazanır. Tek tam sayı — karşılaştırma ve sıralama için. */
  score: number;
  label: string;
}

const CARD_BASE: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10,
};

export const TARGET = 31;

/* ------------------------------------------------------------------ */
/* Çip ekonomisi                                                       */
/* ------------------------------------------------------------------ */

export const ECONOMY = {
  /** Kayıt hediyesi */
  STARTING_CHIPS: 1_000,
  /** Ele girmek için zorunlu giriş çipi */
  ANTE: 2,
  /** Kapalı kart çekmek için vurulacak çip aralığı — VURUŞ BAŞINA.
   *  Vuran kişi çekip tekrar vurabildiği için bir oyuncu tek elde
   *  100 + 100 + 100 ... şeklinde birden fazla kez 100 vurabilir. */
  MIN_RAISE: 2,
  MAX_RAISE: 100,
  /** Açık kart bedava — ama masa görür */
  OPEN_DRAW_COST: 0,
  /** Kütük her el değiştirdiğinde (yani her 31'den sonra) alınan masa ücreti.
   *  KASAYA gider — pota veya yeni kütüğe değil. Ekonominin tek çip kuyusu. */
  TABLE_FEE: 2,
} as const;

export interface TableFeeResult {
  stacks: Record<string, number>;
  /** Ekonomiden tamamen silinen (kasaya giden) çip */
  rake: number;
  /** Ücreti ödeyemeyip masadan düşen oyuncular */
  eliminated: string[];
}

/**
 * Masa ücretini tahsil eder — SADECE kütüğü devreden (eski) kütük öder.
 * Kütük 31'i kendi yaparsa kütük el değiştirmez, dolayısıyla ücret de alınmaz.
 */
export function collectTableFee(
  stacks: Record<string, number>,
  payers: string[],
  fee: number = ECONOMY.TABLE_FEE,
): TableFeeResult {
  const next = { ...stacks };
  const eliminated: string[] = [];
  let rake = 0;
  for (const id of payers) {
    const paid = Math.min(fee, next[id] ?? 0);
    next[id] = (next[id] ?? 0) - paid;
    rake += paid;
    if (next[id] <= 0) eliminated.push(id);
  }
  return { stacks: next, rake, eliminated };
}

export function validateRaise(amount: number, stack: number): { ok: boolean; reason?: string } {
  if (!Number.isInteger(amount)) return { ok: false, reason: 'Çip tam sayı olmalı' };
  if (amount < ECONOMY.MIN_RAISE) return { ok: false, reason: `En az ${ECONOMY.MIN_RAISE} çip` };
  if (amount > ECONOMY.MAX_RAISE) return { ok: false, reason: `En fazla ${ECONOMY.MAX_RAISE} çip` };
  if (amount > stack) return { ok: false, reason: 'Yetersiz çip' };
  return { ok: true };
}

const CATEGORY_SCORE = {
  THIRTY_ONE: 1000,
  PAIR_TWOS: 900,
  ACE_THREE: 800,
  PAIR_SEVENS: 700,
  FOURTEEN: 600,
  BUST: 0,
} as const;

/** TOTAL kategorisi: 30 -> 130, 29 -> 129 ... 2 -> 102 */
const totalScore = (t: number) => 100 + t;

/**
 * Asların alabileceği TÜM geçerli yorumları döndürür (31'i geçmeyenler).
 * Boş dizi = patlak.
 *
 * Örn. As-As-2  -> [4, 14, 24]   (oyuncu 14'ü seçer, çünkü 14 > 24)
 *      As-10-3  -> [14, 24]      (14 seçilir)
 *      As-As-8  -> [10, 20, 30]  (30 seçilir)
 */
export function possibleTotals(cards: Card[]): number[] {
  const min = cards.reduce((s, c) => s + CARD_BASE[c.rank], 0);
  const aces = cards.filter((c) => c.rank === 'A').length;
  const out: number[] = [];
  for (let upgraded = 0; upgraded <= aces; upgraded++) {
    const t = min + upgraded * 10;
    if (t <= TARGET) out.push(t);
    else break;
  }
  return out;
}

const isPair = (cards: Card[], rank: Rank) =>
  cards.length === 2 && cards[0].rank === rank && cards[1].rank === rank;

const isAceThree = (cards: Card[]) => {
  if (cards.length !== 2) return false;
  const ranks = cards.map((c) => c.rank).sort();
  return ranks[0] === '3' && ranks[1] === 'A';
};

/** Tek bir toplamın hiyerarşideki değeri. */
function scoreTotal(total: number, declared31: boolean): HandValue {
  if (total === TARGET) {
    return declared31
      ? { category: 'THIRTY_ONE', total, score: CATEGORY_SCORE.THIRTY_ONE, label: '31' }
      // Deklare edilmemiş 31 -> 30 sayılır
      : { category: 'TOTAL', total: 30, score: totalScore(30), label: '31 (deklare edilmedi → 30)' };
  }
  if (total === 14) {
    return { category: 'FOURTEEN', total, score: CATEGORY_SCORE.FOURTEEN, label: '14' };
  }
  return { category: 'TOTAL', total, score: totalScore(total), label: String(total) };
}

/**
 * Oyuncunun elini, asları KENDİ AVANTAJINA sayarak değerlendirir.
 *
 * DİKKAT: "31'i geçmeyen en yüksek toplam" YANLIŞ bir kuraldır — 14 hiyerarşide
 * 30'un üstünde olduğu için oyuncu bazen kasten daha DÜŞÜK toplamı seçer.
 * Bu yüzden tüm as yorumları denenip en yüksek SKORLU olan alınır.
 *
 * @param cards      Oyuncunun eli (ilk 2 kart + çektikleri)
 * @param declared31 Oyuncu 31'i sözlü olarak deklare etti mi?
 */
export function evaluateHand(cards: Card[], declared31 = false): HandValue {
  if (cards.length < 2) throw new Error('Bir el en az 2 karttan oluşur');

  const totals = possibleTotals(cards);

  if (totals.length === 0) {
    const min = cards.reduce((s, c) => s + CARD_BASE[c.rank], 0);
    return { category: 'BUST', total: min, score: CATEGORY_SCORE.BUST, label: `Patlak (${min})` };
  }

  const candidates: HandValue[] = totals.map((t) => scoreTotal(t, declared31));

  // İlk iki karttan gelmesi gereken özel eller (as yorumundan bağımsız)
  if (isPair(cards, '2')) {
    candidates.push({ category: 'PAIR_TWOS', total: 4, score: CATEGORY_SCORE.PAIR_TWOS, label: '2-2' });
  }
  if (isAceThree(cards)) {
    candidates.push({ category: 'ACE_THREE', total: 14, score: CATEGORY_SCORE.ACE_THREE, label: 'As-3' });
  }
  if (isPair(cards, '7')) {
    candidates.push({ category: 'PAIR_SEVENS', total: 14, score: CATEGORY_SCORE.PAIR_SEVENS, label: '7-7' });
  }

  return candidates.reduce((best, cur) => (cur.score > best.score ? cur : best));
}

/** UI için: oyuncuya "14 / 24" gibi tüm seçeneklerini göster. */
export function handOptions(cards: Card[], declared31 = false): HandValue[] {
  return possibleTotals(cards)
    .map((t) => scoreTotal(t, declared31))
    .sort((a, b) => b.score - a.score);
}

/** Oyuncu 31 diyebilir mi? (as esnekliği dahil) */
export function canDeclare31(cards: Card[]): boolean {
  return possibleTotals(cards).includes(TARGET);
}

/** >0: a kazanır, <0: b kazanır, 0: eşit → hiyerarşi belirler */
export function compareHands(a: HandValue, b: HandValue): number {
  return a.score - b.score;
}

export interface ShowdownEntry {
  playerId: string;
  cards: Card[];
  declared31?: boolean;
  folded?: boolean;
  /** 0 = kütük, 1 = kütüğün altındaki ilk oyuncu, ... (küçük olan öncelikli) */
  hierarchy: number;
}

export interface ShowdownResult {
  winner: ShowdownEntry | null;
  value: HandValue | null;
  /** SADECE 31 yapılırsa kütük el değişir. 14/28/blöf ile kazanmak kütüğü devretmez. */
  kutukChangesTo: string | null;
  /** Herkes patladı → pot kütüğe kaldı */
  allBust?: boolean;
  ranking: Array<{ playerId: string; value: HandValue; hierarchy: number }>;
}

export function resolveShowdown(entries: ShowdownEntry[]): ShowdownResult {
  const live = entries.filter((e) => !e.folded);

  const ranking = live
    .map((e) => ({
      playerId: e.playerId,
      value: evaluateHand(e.cards, e.declared31 ?? false),
      hierarchy: e.hierarchy,
      entry: e,
    }))
    .sort((x, y) => compareHands(y.value, x.value) || x.hierarchy - y.hierarchy);

  const top = ranking[0];

  // Herkes patladıysa pot kütüğe kalır (sırayla patladıkları için kütük en son ayakta)
  if (!top || top.value.category === 'BUST') {
    const kutuk = entries.find((e) => e.hierarchy === 0) ?? null;
    return {
      winner: kutuk,
      value: null,
      kutukChangesTo: null,
      allBust: true,
      ranking: ranking.map(strip),
    };
  }

  return {
    winner: top.entry,
    value: top.value,
    kutukChangesTo: top.value.category === 'THIRTY_ONE' ? top.playerId : null,
    allBust: false,
    ranking: ranking.map(strip),
  };
}

const strip = (r: { playerId: string; value: HandValue; hierarchy: number }) => ({
  playerId: r.playerId,
  value: r.value,
  hierarchy: r.hierarchy,
});

/* ------------------------------------------------------------------ */
/* Deste                                                               */
/* ------------------------------------------------------------------ */

export function buildDeck(deckCount = 2): Card[] {
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const deck: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const s of suits) for (const r of ranks) deck.push({ rank: r, suit: s });
  }
  return deck; // 2 deste = 104 kart
}

/** Fisher-Yates. Sunucuda crypto.randomInt ile besle — Math.random kullanma. */
export function shuffle<T>(arr: T[], rand: (n: number) => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Tur aksiyonları (state machine sözleşmesi)                          */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: 'PASS' }                          // geç
  | { type: 'FOLD' }                          // kartı kapalı teslim
  | { type: 'CALL' }                          // gör
  | { type: 'RAISE'; amount: number }         // vur — ardından PASS veya DRAW_CLOSED zorunlu
  | { type: 'DRAW_CLOSED' }                   // kapalı kart çek (vurmuş olmak şartıyla)
  | { type: 'DRAW_OPEN' }                     // bedava açık kart (çip vurmadıysan)
  | { type: 'DECLARE_31' };                   // 31'i sözlü deklare et

/**
 * Bir oyuncunun bu turda hangi aksiyonları yapabileceği.
 * Kritik kural: vurduysan bedava açık kart ALAMAZSIN; ya geç ya kapalı çek.
 */
export function legalActions(ctx: {
  hasRaisedThisTurn: boolean;
  owesChips: number;      // görmesi gereken fark
  isBust: boolean;
  /** possibleTotals(cards).includes(31) — sadece total===31 kontrolü YETMEZ */
  can31: boolean;
}): Action['type'][] {
  if (ctx.isBust) return ['FOLD'];

  const acts: Action['type'][] = [];
  if (ctx.owesChips > 0) acts.push('CALL', 'FOLD');

  if (ctx.hasRaisedThisTurn) {
    acts.push('PASS', 'DRAW_CLOSED');
  } else {
    acts.push('RAISE', 'PASS', 'DRAW_OPEN');
  }
  if (ctx.can31) acts.push('DECLARE_31');
  return acts;
}
