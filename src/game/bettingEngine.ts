/**
 * "31" — bahis motoru (sunucu tarafı, saf fonksiyon)
 *
 * Tüm state burada tutulur ve SUNUCUDA yaşar. Client'a asla kapalı kart
 * gönderilmez — bkz. redactFor().
 *
 * Bir turun anatomisi:
 *   1. Borcun varsa önce CALL veya FOLD (başka hiçbir şey yapamazsın)
 *   2. Sonra istediğin kadar devam edebilirsin:
 *        - DRAW_OPEN : bedava ve SINIRSIZ, ama masa görür. Zayıf ellerin aracı:
 *                      17 gibi bir elde kimse çip riske atmak istemez. Bedeli,
 *                      masanın senin tavanını öğrenmesi.
 *        - RAISE     : 2-100 çip. Her vuruş bir DRAW_CLOSED hakkı verir.
 *                      Çekmek zorunlu değil, vurup PASS diyebilirsin.
 *        - DRAW_CLOSED : vurulmuş bir hakkı harcar
 *      Patlayana kadar vurup çekmeye devam edebilirsin.
 *   3. Kart çektiysen ve 31 yaptıysan DECLARE_31 demelisin — demezsen 30 sayılır
 *   4. PASS turu bitirir. Kullanılmayan çekim hakkı sonraki tura taşınmaz.
 *
 * El biterse: (a) biri 31 deklare etti, (b) tek oyuncu kaldı,
 *             (c) tam bir tur boyunca kimse vurmadı/çekmedi ve borç yok.
 *
 * Vuruşa karşılık sırası:
 *   Biri vurduğunda, kartını çekmeden önce diğer canlı oyuncular bu vuruşu
 *   GÖRMELİ (veya kaçmalı) — sıra şöyle işler: vurandan hemen ÖNCE oynamış olan
 *   oyuncudan başlayarak GERİYE doğru (kütük hariç) tüm canlı oyuncular sorulur,
 *   en son da kütüğe sorulur (kütük vurmuşsa zaten kendisi son konuştuğu için
 *   kütüğe ayrıca sorulmaz). Örn. sıra a,b,c,kütük — a geçti, b vurdu: önce a
 *   (b'den hemen önce oynayan), a oyunda değilse önce c, en son kütük. Bu sıra
 *   bitince tur vurana geri döner (bkz. buildCallOrder, endTurn).
 */

import {
  Card,
  ECONOMY,
  HandValue,
  ShowdownEntry,
  ShowdownResult,
  buildDeck,
  canDeclare31,
  collectTableFee,
  evaluateHand,
  handOptions,
  resolveShowdown,
  shuffle,
  validateRaise,
} from './handEvaluator';

export type Phase = 'BETTING' | 'HAND_OVER';

export interface PlayerState {
  id: string;
  /** 0 = kütük, 1 = kütüğün altındaki ilk oyuncu, ... Aksiyon sırası 1,2,3...,0 */
  hierarchy: number;
  stack: number;
  cards: Card[];
  /** Bu elde pota koyduğu toplam (ante dahil) */
  contributed: number;
  folded: boolean;
  busted: boolean;
  declared31: boolean;
  /** 31 yapıp deklare etmedi — el 30 sayılır */
  missed31: boolean;
  /** Bu elde kaç bedava açık kart çekti (sınır yok, sadece istatistik) */
  freeDraws: number;
  /** Vurup henüz kullanmadığı kapalı çekim hakkı sayısı */
  unusedPaidDraws: number;
  hasDrawnThisTurn: boolean;
  /** Bu elde bir kez PASS dedi mi? Deyince el bitene kadar kalıcıdır — bir daha
   *  kart çekemez veya vuramaz, yalnız CALL/FOLD/PASS yapabilir (bkz. legalActions). */
  hasPassed: boolean;
}

export interface HandResult extends ShowdownResult {
  potWonBy: string | null;
  potAmount: number;
  /** Kütük sadece 31 yapılırsa el değiştirir */
  newKutukId: string;
  /** Kütüğü devreden eski kütükten alınan masa ücreti (kasaya gider) */
  tableFee: number;
}

export interface HandState {
  phase: Phase;
  players: PlayerState[];
  /** Aksiyon sırası: hierarchy 1,2,...,n sonra kütük (0) */
  actionOrder: string[];
  turn: string | null;
  deck: Card[];
  /** Dağıtımda destenin üstüne açılan kart + görülen açık kartlar */
  faceUp: Card[];
  pot: number;
  kutukId: string;
  /** Ekonomiden silinen toplam çip */
  rake: number;
  log: string[];
  result?: HandResult;
  /** Tam turda hiçbir aktivite olmadığını takip eder */
  passStreak: number;
  /** Bir vuruşa karşılık sırada bekleyen oyuncular (bkz. "Vuruşa karşılık sırası"). */
  pendingCallOrder: string[] | null;
  /** Kimin vuruşu bu sırayı açtı — sıra boşalınca tur ona döner. */
  pendingRaiserId: string | null;
}

export type Action =
  | { type: 'CALL' }
  | { type: 'FOLD' }
  | { type: 'RAISE'; amount: number }
  | { type: 'DRAW_CLOSED' }
  | { type: 'DRAW_OPEN' }
  | { type: 'DECLARE_31' }
  | { type: 'PASS' };

export class RuleError extends Error {}

/* ------------------------------------------------------------------ */
/* Kurulum                                                             */
/* ------------------------------------------------------------------ */

/**
 * Koltuk sırasından hiyerarşi hesaplar: kütüğün koltuğu 0, ondan sonraki koltuklar
 * sırayla 1, 2, 3... Hem hot-seat hem gerçek zamanlı oda katmanı (Colyseus) aynı
 * bu fonksiyonu kullanır — masadan biri düştüğünde veya her yeni elde tekrar
 * çağrılıp yeniden hesaplanmalıdır (seatOrder o anki canlı koltuk listesi olmalı).
 */
export function computeHierarchy(seatOrder: string[], kutukId: string): Record<string, number> {
  const kutukPos = seatOrder.indexOf(kutukId);
  if (kutukPos < 0) throw new RuleError('Kütük koltuk sırasında değil');
  return Object.fromEntries(
    seatOrder.map((id, i) => [id, (i - kutukPos + seatOrder.length) % seatOrder.length]),
  );
}

export interface CreateHandOptions {
  players: Array<{ id: string; stack: number; hierarchy: number }>;
  kutukId: string;
  deck?: Card[];
  /** Test için eli sabitlemek */
  presetHands?: Record<string, Card[]>;
  rand?: (n: number) => number;
}

export function createHand(opts: CreateHandOptions): HandState {
  const { players, kutukId } = opts;
  if (players.length < 2 || players.length > 5) {
    throw new RuleError('Oyuncu sayısı 2-5 arası olmalı');
  }
  if (!players.some((p) => p.id === kutukId)) throw new RuleError('Kütük masada değil');
  if (players.some((p) => p.stack < ECONOMY.ANTE)) {
    throw new RuleError('Ante ödeyemeyecek oyuncu var — masadan düşmeli');
  }

  const rand = opts.rand ?? ((n: number) => Math.floor(Math.random() * n));
  let deck = opts.deck ?? shuffle(buildDeck(2), rand);

  const state: HandState = {
    phase: 'BETTING',
    players: [],
    actionOrder: [],
    turn: null,
    deck,
    faceUp: [],
    pot: 0,
    kutukId,
    rake: 0,
    log: [],
    passStreak: 0,
    pendingCallOrder: null,
    pendingRaiserId: null,
  };

  // Aksiyon sırası: kütüğün altından başlar, kütük en son konuşur
  const ordered = [...players].sort(
    (a, b) => (a.hierarchy === 0 ? Infinity : a.hierarchy) - (b.hierarchy === 0 ? Infinity : b.hierarchy),
  );

  for (const p of ordered) {
    const cards = opts.presetHands?.[p.id] ?? [deck[0], deck[1]];
    if (!opts.presetHands?.[p.id]) deck = deck.slice(2);
    state.players.push({
      id: p.id,
      hierarchy: p.hierarchy,
      stack: p.stack - ECONOMY.ANTE, // ante zorunlu
      cards,
      contributed: ECONOMY.ANTE,
      folded: false,
      busted: false,
      declared31: false,
      missed31: false,
      freeDraws: 0,
      unusedPaidDraws: 0,
      hasDrawnThisTurn: false,
      hasPassed: false,
    });
    state.pot += ECONOMY.ANTE;
  }

  // Kütük en alttaki kartı açıp destenin üstüne koyar
  const bottom = deck[deck.length - 1];
  if (bottom) {
    deck = deck.slice(0, -1);
    state.faceUp.push({ ...bottom, faceUp: true });
  }

  state.deck = deck;
  state.actionOrder = ordered.map((p) => p.id);
  state.turn = state.actionOrder[0];
  state.log.push(`El başladı. Ante ${ECONOMY.ANTE} çip, pot ${state.pot}. Kütük: ${kutukId}`);
  return state;
}

/* ------------------------------------------------------------------ */
/* Sorgular                                                            */
/* ------------------------------------------------------------------ */

const get = (s: HandState, id: string) => {
  const p = s.players.find((x) => x.id === id);
  if (!p) throw new RuleError(`Oyuncu yok: ${id}`);
  return p;
};

const isLive = (p: PlayerState) => !p.folded && !p.busted;

export const maxContributed = (s: HandState) =>
  Math.max(...s.players.filter(isLive).map((p) => p.contributed), 0);

export const owed = (s: HandState, id: string) => {
  const p = get(s, id);
  return Math.max(0, maxContributed(s) - p.contributed);
};

export function legalActions(s: HandState, id: string): Action['type'][] {
  if (s.phase !== 'BETTING' || s.turn !== id) return [];
  const p = get(s, id);
  if (!isLive(p)) return [];

  // Borç varsa önce kapatılmalı
  if (owed(s, id) > 0) {
    return p.stack >= owed(s, id) ? ['CALL', 'FOLD'] : ['FOLD'];
  }

  // Bu elde bir kez PASS dediyse artık "duruyor": kart çekemez, vuramaz —
  // sadece izler (tekrar PASS) ya da elden çekilir (FOLD).
  if (p.hasPassed) return ['PASS', 'FOLD'];

  const acts: Action['type'][] = [];

  // 31 yaptıysa hemen söylemeli — başka bir şey yaparsa hakkı yanar
  if (p.hasDrawnThisTurn && canDeclare31(p.cards)) acts.push('DECLARE_31');

  // Vurulmuş çekim hakkı varsa kapalı çekebilir (çekmek zorunlu değil)
  if (p.unusedPaidDraws > 0) acts.push('DRAW_CLOSED');

  // Bedava açık kart SINIRSIZ. Bedeli çip değil, okunabilir olmak:
  // masa senin tavanını görür ve ona göre oynar.
  acts.push('DRAW_OPEN');

  // Sınırsız vuruş: her vuruş bir kapalı çekim hakkı verir
  if (p.stack >= ECONOMY.MIN_RAISE) acts.push('RAISE');

  acts.push('PASS', 'FOLD');
  return acts;
}

/**
 * Bir vuruşa kimlerin, hangi sırayla karşılık vermesi gerektiğini hesaplar
 * (bkz. dosya başındaki "Vuruşa karşılık sırası"). Sadece hâlâ canlı oyuncuları
 * içerir; vuranın kendisi asla listede yer almaz.
 */
function buildCallOrder(s: HandState, raiserId: string): string[] {
  const nonKutuk = s.players
    .filter((p) => p.hierarchy !== 0)
    .sort((a, b) => a.hierarchy - b.hierarchy)
    .map((p) => p.id);
  const kutuk = s.players.find((p) => p.hierarchy === 0)?.id;
  const raiserIsKutuk = raiserId === kutuk;

  // Aksiyon sırasının tersi: en son oynayandan en önce oynayana.
  const reversed = [...nonKutuk].reverse();

  const rotated = raiserIsKutuk
    ? reversed
    : (() => {
        const idx = reversed.indexOf(raiserId);
        return [...reversed.slice(idx + 1), ...reversed.slice(0, idx)];
      })();

  const order = rotated.filter((id) => id !== raiserId && isLive(get(s, id)));
  if (!raiserIsKutuk && kutuk && kutuk !== raiserId && isLive(get(s, kutuk))) {
    order.push(kutuk);
  }
  return order;
}

/* ------------------------------------------------------------------ */
/* Reducer                                                            */
/* ------------------------------------------------------------------ */

export function applyAction(prev: HandState, playerId: string, action: Action): HandState {
  if (prev.phase !== 'BETTING') throw new RuleError('El bitti');
  if (prev.turn !== playerId) throw new RuleError('Sıra sende değil');

  const legal = legalActions(prev, playerId);
  if (!legal.includes(action.type)) {
    throw new RuleError(`Geçersiz aksiyon: ${action.type}. İzinli: ${legal.join(', ')}`);
  }

  const s: HandState = {
    ...prev,
    players: prev.players.map((p) => ({ ...p, cards: [...p.cards] })),
    deck: [...prev.deck],
    faceUp: [...prev.faceUp],
    log: [...prev.log],
  };
  const p = get(s, playerId);

  switch (action.type) {
    case 'CALL': {
      const amount = owed(s, playerId);
      p.stack -= amount;
      p.contributed += amount;
      s.pot += amount;
      s.log.push(`${playerId} gördü (${amount})`);
      // Görmek turu bitirmez — aynı turda vurabilir veya kart çekebilir
      return s;
    }

    case 'FOLD': {
      p.folded = true;
      s.log.push(`${playerId} kaçtı`);
      // Kaçmak "geç" saymaz: pas serisini ne artırır ne sıfırlar.
      // (Aksi halde biri kaçtığında el, vuran kişiye tekrar sıra gelmeden kapanır.)
      return endTurn(s, { kind: 'FOLD' });
    }

    case 'RAISE': {
      const v = validateRaise(action.amount, p.stack);
      if (!v.ok) throw new RuleError(v.reason!);
      p.stack -= action.amount;
      p.contributed += action.amount;
      s.pot += action.amount;
      p.unusedPaidDraws += 1;
      s.log.push(`${playerId} ${action.amount} çip vurdu (pot ${s.pot})`);

      // Kartını çekmeden önce diğer canlı oyuncular bu vuruşu görmeli/kaçmalı.
      const callOrder = buildCallOrder(s, playerId);
      if (callOrder.length > 0) {
        const [next, ...rest] = callOrder;
        s.pendingRaiserId = playerId;
        s.pendingCallOrder = rest;
        s.turn = next;
        s.log.push(`Sıra ${next} — ${playerId}'in vuruşunu görmeli`);
      }
      // Görecek kimse kalmadıysa (herkes kaçtı) sıra vurandadır — normal akış sürer.
      return s;
    }

    case 'DRAW_CLOSED': {
      p.unusedPaidDraws -= 1;
      const card = drawFromDeck(s);
      p.cards.push({ ...card, faceUp: false });
      p.hasDrawnThisTurn = true;
      const v = evaluateHand(p.cards, false);
      if (v.category === 'BUST') {
        p.busted = true;
        s.log.push(`${playerId} kapalı çekti ve patladı`);
        return endTurn(s, { kind: 'ACTIVITY' });
      }
      s.log.push(`${playerId} kapalı kart çekti`);
      return s;
    }

    case 'DRAW_OPEN': {
      const card = drawFromDeck(s);
      const shown = { ...card, faceUp: true };
      p.cards.push(shown);
      s.faceUp.push(shown);
      p.hasDrawnThisTurn = true;
      p.freeDraws += 1;
      const v = evaluateHand(p.cards, false);
      if (v.category === 'BUST') {
        p.busted = true;
        s.log.push(`${playerId} açık ${card.rank} çekti ve patladı`);
        return endTurn(s, { kind: 'ACTIVITY' });
      }
      s.log.push(`${playerId} açık kart çekti: ${card.rank}`);
      return s;
    }

    case 'DECLARE_31': {
      p.declared31 = true;
      s.log.push(`${playerId}: 31!`);
      return finish(s);
    }

    case 'PASS': {
      // Kart çektiği halde 31 demediyse eli 30 sayılır
      if (p.hasDrawnThisTurn && canDeclare31(p.cards)) {
        p.missed31 = true;
        s.log.push(`${playerId} 31'i deklare etmedi → 30 sayılacak`);
      }
      const kind = p.unusedPaidDraws > 0 || p.hasDrawnThisTurn ? 'ACTIVITY' : 'PASS';
      if (!p.hasPassed) {
        p.hasPassed = true;
        s.log.push(`${playerId} geçti — bu el boyunca artık kart çekemez`);
      } else {
        s.log.push(`${playerId} izliyor`);
      }
      return endTurn(s, { kind });
    }
  }
}

function drawFromDeck(s: HandState): Card {
  if (s.deck.length === 0) {
    // 104 kart, 5 oyuncu — pratikte imkânsız, ama sunucu çökmemeli
    throw new RuleError('Deste bitti');
  }
  return s.deck.shift()!;
}

function endTurn(s: HandState, o: { kind: 'ACTIVITY' | 'PASS' | 'FOLD' }): HandState {
  if (o.kind === 'ACTIVITY') s.passStreak = 0;
  else if (o.kind === 'PASS') s.passStreak += 1;
  // FOLD: dokunma

  const cur = get(s, s.turn!);
  cur.unusedPaidDraws = 0; // kullanılmayan çekim hakkı tura taşınmaz
  cur.hasDrawnThisTurn = false;

  const live = s.players.filter(isLive);

  // Tek oyuncu kaldı
  if (live.length <= 1) return finish(s);

  // Bir vuruşa karşılık sırası sürüyorsa, "herkes geçti" kontrolünden önce onu
  // bitir — vuran, sırası gelmeden borç/pas sayımıyla eli kapattırmasın.
  if (s.pendingCallOrder && s.pendingCallOrder.length > 0) {
    const [next, ...rest] = s.pendingCallOrder;
    s.pendingCallOrder = rest;
    s.turn = next;
    return s;
  }
  if (s.pendingRaiserId) {
    s.turn = s.pendingRaiserId;
    s.pendingRaiserId = null;
    s.pendingCallOrder = null;
    return s;
  }

  // Tam tur boyunca kimse vurmadı/çekmedi ve borç yok → showdown
  const noDebt = live.every((p) => maxContributed(s) - p.contributed === 0);
  if (noDebt && s.passStreak >= live.length) return finish(s);

  s.turn = nextLive(s, s.turn!);
  return s;
}

function nextLive(s: HandState, from: string): string {
  const order = s.actionOrder;
  const start = order.indexOf(from);
  for (let i = 1; i <= order.length; i++) {
    const id = order[(start + i) % order.length];
    if (isLive(get(s, id))) return id;
  }
  return from;
}

/* ------------------------------------------------------------------ */
/* El sonu                                                             */
/* ------------------------------------------------------------------ */

function finish(s: HandState): HandState {
  const entries: ShowdownEntry[] = s.players.map((p) => ({
    playerId: p.id,
    cards: p.cards,
    declared31: p.declared31,
    folded: p.folded || p.busted,
    hierarchy: p.hierarchy,
  }));

  const showdown = resolveShowdown(entries);
  const potAmount = s.pot;

  let newKutukId = s.kutukId;
  let tableFee = 0;

  if (showdown.winner) {
    const w = get(s, showdown.winner.playerId);
    w.stack += potAmount;
  }

  // Kütük SADECE 31 yapılırsa el değiştirir
  if (showdown.kutukChangesTo && showdown.kutukChangesTo !== s.kutukId) {
    newKutukId = showdown.kutukChangesTo;
    const fee = collectTableFee(
      Object.fromEntries(s.players.map((p) => [p.id, p.stack])),
      [s.kutukId], // masa ücretini kütüğü devreden öder
    );
    for (const p of s.players) p.stack = fee.stacks[p.id];
    tableFee = fee.rake;
    s.rake += fee.rake;
    s.log.push(`Kütük ${s.kutukId} → ${newKutukId}. Masa ücreti ${tableFee} çip (kasaya)`);
  }

  s.pot = 0;
  s.phase = 'HAND_OVER';
  s.turn = null;
  s.pendingCallOrder = null;
  s.pendingRaiserId = null;
  s.result = { ...showdown, potWonBy: showdown.winner?.playerId ?? null, potAmount, newKutukId, tableFee };
  s.log.push(
    showdown.winner
      ? `${showdown.winner.playerId} potu aldı (${potAmount}) — ${showdown.value?.label ?? 'herkes patladı'}`
      : 'Kazanan yok',
  );
  return s;
}

/* ------------------------------------------------------------------ */
/* Client'a gönderilecek görünüm — KAPALI KART ASLA SIZDIRILMAZ         */
/* ------------------------------------------------------------------ */

export interface PublicPlayerView {
  id: string;
  hierarchy: number;
  stack: number;
  contributed: number;
  folded: boolean;
  busted: boolean;
  /** Bu elde bir kez PASS dedi — artık izliyor, kart çekemez (bkz. legalActions) */
  hasPassed: boolean;
  cardCount: number;
  /** Sadece "aç" ile alınmış kartlar — masa bunları gördü */
  visibleCards: Card[];
  /** Sadece kendi eli için doldurulur */
  ownCards?: Card[];
  ownValue?: HandValue;
  ownOptions?: HandValue[];
}

export function redactFor(s: HandState, viewerId: string) {
  const over = s.phase === 'HAND_OVER';
  return {
    phase: s.phase,
    pot: s.pot,
    turn: s.turn,
    kutukId: s.kutukId,
    deckRemaining: s.deck.length,
    faceUp: s.faceUp,
    toCall: s.turn === viewerId ? owed(s, viewerId) : 0,
    legalActions: legalActions(s, viewerId),
    result: s.result,
    players: s.players.map<PublicPlayerView>((p) => {
      const own = p.id === viewerId;
      // El bittiyse kaçmayanların kartları açılır
      const reveal = own || (over && !p.folded);
      return {
        id: p.id,
        hierarchy: p.hierarchy,
        stack: p.stack,
        contributed: p.contributed,
        folded: p.folded,
        busted: p.busted,
        hasPassed: p.hasPassed,
        cardCount: p.cards.length,
        visibleCards: p.cards.filter((c) => c.faceUp),
        ...(reveal
          ? {
              ownCards: p.cards,
              ownValue: evaluateHand(p.cards, p.declared31),
              ownOptions: own ? handOptions(p.cards, p.declared31) : undefined,
            }
          : {}),
      };
    }),
  };
}
