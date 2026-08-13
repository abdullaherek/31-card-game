# Handoff: 31 — masa ekranı (mobil)

## Overview
"31" oyununun tek ve merkezi ekranı: 5 kişilik masa. Kullanıcı burada kart çeker, çip vurur, 31 deklare eder, borcunu görür veya kaçar. Diğer ekranlar (lobi, oda kodu, çip geçmişi) bu ekranın dilinden türetilecek.

Onaylanan yön: **1a** — as seçimi "değer kartları" olarak, açık çekilen kart elde kalıp altın mat ile ayrılıyor. Reddedilen alternatif (1b: hiyerarşi merdiveni + "Açıkta" rafı) referans olarak pakette duruyor.

## About the Design Files
Bu paketteki dosyalar **HTML ile üretilmiş tasarım referanslarıdır** — görünüşü ve davranışı gösteren prototipler, doğrudan kopyalanacak üretim kodu değil. Görev, bu tasarımları hedef kodtabanının kendi ortamında (burada: **Expo / React Native + Reanimated 3**) yeniden kurmaktır. Prototipteki oyun mantığı JS'e elle taşınmış bir kopyadır; **üretimde asla kullanılmamalıdır** — kurallar `src/game/handEvaluator.ts` ve `src/game/bettingEngine.ts` dosyalarından import edilir (bkz. "Motor sözleşmesi").

## Fidelity
**High-fidelity.** Renkler, tipografi, ölçüler ve etkileşimler nihai niyeti taşıyor. Tasarım Classical design system üzerine kurulu; tüm değerler token'lardan geliyor (aşağıda birebir hex/px karşılıkları var). Kart/koltuk konumları animasyonların bağlanacağı koordinatlar olarak sabit kabul edilmelidir.

## Screens / Views

### Masa (tek ekran)
**Amaç:** sırası gelen oyuncunun tek bir turda alacağı tüm kararları vermesi.
**Cihaz:** 402 × 874 pt (iPhone 16 logical). Güvenli alan: üstte 56, altta 30. Yatay padding 12.

**Dikey yapı (yukarıdan aşağı):**
1. **Başlık şeridi** — sol: "31" (Cormorant 17/600). Sağ: "ODA K4T9 · EL 1" (9.5px, letter-spacing .16em, uppercase, tabular). Altında 1px hairline.
2. **Masa alanı** — `display:grid; grid-template-columns: 1fr 1.02fr 1fr; align-content: space-evenly; flex:1`. Sol ve sağ sütunlarda 2'şer rakip koltuğu (sıra: üst-sol Barış, üst-sağ Deniz, alt-sol Umut, alt-sağ Ceren); orta sütun iki satırı kaplar ve deste + pot + kütük mührünü taşır.
3. **Kendi elim** — sol altta kartlar, sağda "SEN · 998 ç / bu ele 2 çip".
4. **Elin (as seçimi)** — değer kartları.
5. **Vuruş paneli** (koşullu), **31 butonu** (koşullu), **borç şeridi** (koşullu).
6. **Sıra göstergesi + aksiyon barı + log satırı.**

**Koltuk (rakip) bileşeni**
- Ad: Cormorant 14.5/600, tek satır, taşarsa ellipsis.
- Kütük mührü: 14×14 daire, 1px `--color-accent` kontur + `inset 0 0 0 1.5px var(--color-bg), inset 0 0 0 2.5px var(--color-accent-300)` çift halka, ortada "K" (Cormorant 8px, accent-700). Adın SOLUNDA.
- Sıra göstergesi: 5px altın daire, `opacity 1 → .45` 1.1s sonsuz.
- Çip satırı: "613 ç" (neutral-600) + "·2" (accent-700, bu ele koyduğu), 9.5px tabular.
- Kart yığını: kart 22×31, radius 2, her karta `margin-left:-7px`, konteynerde `padding-left:7px` (6 kartta taşmaz).
- Durum satırı: 9px uppercase accent-700 — "patlak" / "kaçtı" / el sonunda elin etiketi. Yükseklik 11px sabit (zıplama olmasın).

**Kart — 4 hal (tasarımın çekirdeği)**
| Hal | Kenar | Zemin | İçerik |
|---|---|---|---|
| Kapalı (rakip) | 1px `--color-neutral-400` | 45° 2px çizgili doku: `repeating-linear-gradient(45deg, var(--color-neutral-200) 0 2px, var(--color-bg) 2px 4px)` | yok |
| Kendi açık kartım | 1px `--color-neutral-400` | `--color-neutral-100` | rank sol üst, suit sağ alt |
| **"Masa gördü" (açık çekilmiş)** | 1px `--color-accent-500` | `--color-accent-100` | rank/suit accent-800; ayrıca **halka:** `box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 4px var(--color-accent-200)` |
| Patlamış el | koltuk durum satırında "PATLAK", kart yığını değişmez | — | — |
Kendi elimde kart 44×62, radius 3; rank 17px, suit 11px (Cormorant 600). Kartlar `margin-left:-6px` ile hafif bindirmeli, 6 kartta 402'ye sığar.

**Orta sütun**
- Deste: 34×47, üç kat (`translate(3px,3px)`, `translate(1.5px,1.5px)`, üstte dokulu kapak), altında "92 KART" (8.5px uppercase tabular).
- Yanında destenin üstündeki açık kart, "masa gördü" hali ile aynı dilde (accent-400 kontur, accent-100 zemin).
- Pot: üstte "POT" kicker, altında Cormorant **34px / 400 / tabular** rakam; üstünde ve altında hairline. (Sistem kuralı: büyük tipografi daha ince set edilir.)
- **Kütük mührü:** 1px accent-300 kutu, radius 4; "KÜTÜK" (8px, .2em), ad (Cormorant 15/600), "devri: sadece 31" (8px neutral-600). Ekrandaki en görünür ikinci öge.

**As seçimi — "değer kartları" (1a)**
- Kicker "ELİN" (8.5px uppercase neutral-600).
- `handOptions()` çıktısının her elemanı için bir kutu; yan yana, eşit genişlik, 1px neutral-300 kenar, radius 4.
- Kutu başlığı: değer (Cormorant 22, tabular) + sağda "SEÇİLİ"/"SEÇ". Seçili olanın altında **1.5px `--color-accent` çizgi**; seçili olmayan .6 opaklık ve hairline.
- Kutu gövdesi: "hiyerarşide 12." (9.5px tabular, neutral-700) + niteleme ("özel el" / "güçlü" / "orta" / "zayıf", 9px italik).
- **Sıra numarası tasarımın öğretme aracıdır:** 24 → "hiyerarşide 12.", 14 → "hiyerarşide 5.". Sayısal büyüklük değil sıra okunur. Sıra hesabı: 31→1, 2-2→2, As-3→3, 7-7→4, 14→5, aksi halde `5 + (31 − total)`, patlak→34.
- Dokunma değeri değiştirir (yalnız görsel seçim; motor kazananı zaten en yüksek skorla belirler).

**Vuruş paneli** (Vur'a basınca açılır)
- 1px accent-300 çerçeve, radius 4. Başlık "VURUŞ" + sağda Cormorant 24 tabular tutar + "çip".
- `<input type=range min=2 max=100 step=1>`, `accent-color: var(--color-accent)`.
- Hazır tutarlar: 2 / 5 / 10 / 25 / 50 / 100 — `.btn .btn-ghost`, eşit genişlik.
- "Vazgeç" (`.btn-secondary`, flex 1) + "Vur ve kapalı çek" (`.btn-primary`, flex 2).
- Altında 9px italik açıklama: vuruşun potu büyüttüğü ve bir kapalı çekim hakkı verdiği.

**31 butonu** — `can31` iken barın üstünde tam genişlik: 1.5px accent kenar, accent-100 zemin, Cormorant 17/600, .06em, `opacity 1 → .45` 1.2s nabız. Metin: "31 DE! demezsen 30 sayılır".

**Borç şeridi** — borç varken barın üstünde: 2px sol altın kenar, accent-100 zemin, "BORÇ" kicker + "Masada 25 çip borcun var — görmeden başka hiçbir şey yapamazsın."

**Sıra göstergesi** — 2px yükseklikte hairline bar (`--color-neutral-200` zemin, altın dolgu `kalan/20 × 100%`) + sağda "SIRA SENDE · 14 SN" ya da "SIRA BARIŞ".

**Aksiyon barı** — tek satır, 5px boşluk, orantılar: Gör 1.1 / Aç 0.8 / Vur 0.9 / Kapalı çek 1.3 / Geç 0.8 / Kaç 0.8. Sınıflar: Gör, Vur, Kapalı çek → `.btn-primary` (altın kontur, dolgu yok); Aç, Geç → `.btn-secondary`; Kaç → `.btn-ghost`. Pasif butonlar `disabled` + `opacity .35` — **gizlenmez**, kilitli görünür. Yükseklik 9px dikey padding (≈36pt dokunma alanı; RN'de min 44pt'ye çıkarın).

**Log satırı** — 9.5px italik neutral-600, min yükseklik 26px. Motorun `log` çıktısının son satırı.

**El sonu paneli (overlay)**
- Arka plan: `color-mix(in srgb, var(--color-neutral-900) 42%, transparent)`.
- Panel: `--color-bg`, 1px neutral-300, radius 4, `--shadow-lg`, padding 20/18/16, 20px kenar boşluğu.
- 31 ile kazanıldıysa: "DEKLARE EDİLDİ" kicker + Cormorant **64px/400** "31", altında 1.5px altın çizgi, accent-800. Aksi halde elin etiketi Cormorant 40/400.
- Altında "Sen potu aldı" (Cormorant 17/600) ve "POT 64 ÇİP" kicker.
- Sıralama listesi: her satır ad (kazanan accent-800, diğerleri neutral-700) + elin etiketi (11px italik) + delta ("+62 ç" / "−2 ç", 64px sağa dayalı tabular), satır altı hairline.
- Kütük satırı: mühür + "Kütük Ceren → Sen · masa ücreti 2 çip kasaya" (accent-300 kutu içinde).
- Kapanış: "YENİ EL DAĞITILIYOR…" — 3.6 sn sonra yeni el.

## Interactions & Behavior
- **Tur akışı:** borç varsa yalnız Gör/Kaç. Borç yoksa: Aç (bedava, sınırsız, masa görür) · Vur 2–100 → Kapalı çek veya Geç · 31 yaptıysan hemen "31!" · Geç turu bitirir, kullanılmayan çekim hakkı yanar.
- **Sıra timer'ı:** 20 sn. Dolunca borç varsa FOLD, yoksa PASS. Bar altın dolgu ile boşalır.
- **Bot/rakip hamleleri:** prototipte 850 ms aralıkla. Üretimde sunucudan gelen state ile aynı ritim korunmalı (hamle başına ≥600 ms okunabilirlik payı).
- **Animasyonlar (Reanimated 3, henüz storyboard'lanmadı ama koordinatlar sabit):** desteden koltuğa uçuş (deste merkezi → koltuk kart yığınının son kart pozisyonu), kart çevirme, çipin koltuktan pot merkezine uçuşu, 31'de panelin ölçeklenerek açılışı. Kartlar memoize, `useSharedValue` ile sürülür; frame başına setState yok.
- **Hover yok** (dokunmatik); basılı hal: `translateY(1px)` + accent ramp bir adım koyu. Focus: `2px solid var(--color-accent)`, offset 2 (web/klavye için).
- **Erişilebilirlik:** aksiyon butonlarında etiket + kilitli sebebi (`accessibilityHint`: "önce borcunu görmelisin").

## State Management
Client state sunucudan gelen `redactFor(state, viewerId)` çıktısıdır — kapalı kart asla client'a gitmez. UI'ın tuttuğu ek yerel state yalnızca:
- `raising: boolean` — vuruş paneli açık mı
- `amount: number` — slider tutarı (varsayılan 10)
- `pick: number | null` — as seçiminde vurgulanan toplam (yalnız görsel)
- `secondsLeft: number` — sıra geri sayımı
- `pendingAction` — optimistik oynatma; sunucu cevabıyla uzlaşılır

Sunucudan okunan alanlar: `phase, pot, turn, kutukId, deckRemaining, faceUp, toCall, legalActions, result, players[] { id, hierarchy, stack, contributed, folded, busted, cardCount, visibleCards, ownCards?, ownValue?, ownOptions? }`.

## Motor sözleşmesi (kritik)
Kural kodu **yeniden yazılmaz**, import edilir:
- `evaluateHand(cards, declared31)` → `{ category, total, score, label }` — elin gösterilen değeri
- `handOptions(cards)` → as seçimi kutularının kaynağı (score'a göre sıralı)
- `canDeclare31(cards)` → 31 butonunun görünürlüğü
- `legalActions(state, playerId)` → **aksiyon barının tek doğruluk kaynağı**; dönmeyen her buton `disabled`
- `owed(state, id)` → "Gör 25" etiketi ve borç şeridi
- `applyAction`, `resolveShowdown`, `collectTableFee` → el sonu paneli ve kütük devri
UI'da paralel kural mantığı yok; hiyerarşi sırası (`5 + (31 − total)`) tek istisna ve yalnız sunumdur — istenirse motora `hierarchyRank(value)` olarak taşınabilir.

## Design Tokens (Classical)
Renk: bg #f3f2f2 · surface #eae9e9 · text #201f1d · accent #b68235 · divider `color-mix(in srgb,#201f1d 16%,transparent)`
Neutral 100→900: #f8f4f4 #eae7e7 #d7d3d3 #bab6b6 #9b9797 #7d7979 #605d5d #444141 #2d2b2b
Accent 100→900: #fff3e4 #ffe3bf #facb8d #e1ad66 #c28d41 #a06f24 #7d5411 #5a3b0a #3a270d
Tipografi: başlık "Cormorant Garamond" (arayüz başlıkları 600, display 400), gövde "Lora". Rakamlar her yerde `font-variant-numeric: tabular-nums`.
Boşluk: 4.6 / 9.2 / 13.8 / 18.4 / 27.6 / 36.8 px. Radius: 2 / 4 / 7. Gölge: sm `0 1px 2px #2d2b2b/14%`, md `0 3px 10px /16%`, lg `0 12px 32px /22%`.
Kural: altın **kontur ve çizgi** olarak kullanılır; dolu altın yüzey yok. Butonlar konturlu.

## Assets
Görsel varlık yok. Kart sırtı ve deste dokusu saf CSS gradient (RN'de `react-native-skia` ile veya ince çizgili bir SVG pattern olarak üretilmeli). İkon gerekirse Lucide.

## Files
- `31 Masa Ekranı.dc.html` — seçenek tahtası (turn 1: 1a/1b; turn 2: 2a, seçilen ve tamamlanmış hâli)
- `Masa.dc.html` — masa ekranının kendisi; `variant="a"` onaylanan yön, `variant="b"` reddedilen alternatif. Oyun mantığı logic sınıfında (referans amaçlı port).
- `ios-frame.jsx` — yalnız sunum için cihaz çerçevesi, üretime girmez.
- `_ds/classical-.../styles.css` — token kaynağı.
- `game/handEvaluator.ts`, `game/bettingEngine.ts` — **gerçek kurallar**; üretimde bunlar import edilir.

## Açık kalan tasarım işleri
1. Kütük göstergesi için alternatif metaforlar (şu an mühür).
2. Dağıtma / çip uçuşu / 31 kutlaması animasyon storyboard'u.
3. Lobi, oda kodu, çip geçmişi ve admin çip düzeltme ekranları.
4. 2 ve 3 kişilik masada koltuk yerleşimi (şu an 5 kişi sabit).
