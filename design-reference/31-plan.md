# 31 — Tasarım Brief'i ve Yapım Planı

## Durum

Kurallar motoru bitti, 81 test geçiyor. İki dosya:

- `handEvaluator.ts` — el değerlendirme, as esnekliği, hiyerarşi, çip ekonomisi
- `bettingEngine.ts` — pot, sıra yönetimi, tur akışı, el sonu, `redactFor()` ile kart gizleme

Bunlar saf fonksiyon. UI ve sunucu bunların üstüne bina edilecek, kurallar bir daha yazılmayacak.

### Kesinleşen kurallar

| Konu | Karar |
|---|---|
| Deste | 104 kart (2 × 52), joker yok |
| Hedef | 31, aşılırsa patlak |
| Hiyerarşi | 31 > 2-2 > As-3 > 7-7 > 14 > 30 > 29 > 28 > … |
| Özel eller | 2-2, As-3, 7-7 sadece ilk iki karttan; 14 çekilen kartlarla da olur |
| As | 1 veya 11, oyuncunun avantajına (en yüksek toplam değil, en yüksek **skor**) |
| 31 deklarasyonu | Zorunlu, denmezse 30 sayılır |
| Kütük devri | Sadece 31 yapılınca; 14 veya blöfle kazanmak kütüğü devretmez |
| Aksiyon sırası | Kütüğün altından başlar, kütük en son konuşur |
| Çekim sınırı | Yok. Bedava açık kart sınırsız; her vuruş ayrıca 1 kapalı çekim hakkı verir. Patlayana kadar sürebilir |
| Bedava kartın bedeli | Çip değil, bilgi: masa senin tavanını görür ve ona göre oynar |
| Vurup çekmemek | Serbest — vurup geç denebilir |
| Başlangıç çipi | 1.000 (admin ekleyebilir) |
| Ante | 2 çip, zorunlu |
| Vuruş | 2–100 çip, **vuruş başına** (aynı elde tekrar vurulabilir) |
| Açık kart | Bedava, masa görür |
| Masa ücreti | 2 çip, sadece kütüğü devreden eski kütük öder, **kasaya** gider |
| Herkes patlarsa | Pot kütüğe kalır |

### Bir turun akışı

```
borç varsa  →  GÖR  veya  KAÇ          (başka hiçbir şey yapılamaz)
     ↓
  ┌─── istediğin kadar tekrarla ───────────────────┐
  │  AÇIK ÇEK   (bedava, sınırsız, ama masa görür)  │
  │  VUR 2-100  →  KAPALI ÇEK  veya  GEÇ           │
  │  31 yaptıysan → "31!" (hemen, yoksa hakkı yanar)│
  └────────────────────────────────────────────────┘
     ↓
   GEÇ  (turu bitirir, kullanılmayan çekim hakkı yanar)
```

Patlayana kadar vurup çekmeye devam edilebilir. Bu sayede ilk anlattığın el birebir
oynanabiliyor: kütük 13 → 16 → 21 → 31, hepsi aynı turda, her çekim için vurarak.

El biter: (a) biri 31 deklare etti, (b) tek oyuncu kaldı, (c) canlı oyuncu sayısı kadar üst üste pas geçildi. **Kaçmak pas saymaz** — vuran/çeken kişiye mutlaka bir tur daha gelir.

### Bedava kart vs. paralı kart dengesi

Bedava açık kartta sınır yok ve buna gerek de yok. Vuruş bir "kart satın alma" değil, **potu büyütme ve baskı** aracı — kapalı kart onun yan ürünü. Sadece bedava kart çeken oyuncu potu hiç büyütmediği için kazandığında yalnızca anteleri alır.

Bedava kartın gerçek bedeli okunabilir olmak. 20'de durup geçtiğinde masa senin tavanını bilir; yanındaki "bu en fazla 30 yapmış, 14 yaparsam yeterim" diyebilir. Paralı kapalı kart ise gizlilik satın alır.

Tasarım açısından sonuç: bedava kart **zayıf ellerin aracı**. 17 gibi bir elde kimse çip riske atmak istemez, bedava çeker. Aksiyon barı bu ikiliği hissettirmeli — "Aç" güvenli ama seni açık eder, "Vur" pahalı ama gizler.

---

## Aşama 1: Tasarım (Claude Design)

Sadece **tek ekran** çözülecek: masa. Diğer ekranlar (lobi, oda kodu, çip geçmişi) buradan türer, onları Claude Code yazar.

Neden önce tasarım: Reanimated animasyonları koordinata bağlı. "Desteden 3. koltuğa uç", "koltuktan pota uç" demek için koltuk konumları sabit olmalı. Sonradan değişirse tüm animasyonlar yeniden yazılır.

### Çözülmesi gereken 4 şey

**1. Masa yerleşimi — 380px'e 5 oyuncu**
Kendi elin altta büyük. Rakipler üst yarıda. Kart sayısı değişken: her oyuncu 2'den 6'ya çıkabilir. Kartlar yelpaze mi, üst üste binmiş mi (fan vs. stack) — 6 kartta taşmamalı.

**2. Kart komponenti — 4 hal**
- Kapalı (rakibin kartı)
- Açık (kendi kartın)
- **"Masa gördü"** — açık çekilmiş kart. Bu diğer ikisinden görsel olarak ayrılmalı, çünkü oyunun blöf mantığı buna dayanıyor: herkes o kartı gördü ve kimin elinde olduğunu biliyor.
- Patlamış el

**3. As seçim göstergesi**
Bu oyunun en özgün UI problemi. As-10-3 elinde oyuncunun eli hem 14 hem 24. Hangisini oynadığına o karar veriyor ve 14 hiyerarşide 24'ün çok üstünde. `handOptions()` bu listeyi zaten döndürüyor. Oyuncu iki değeri de aynı anda görmeli ve hangisinin daha iyi olduğunu anlamalı — yeni oyuncu "24 daha büyük, o iyidir" diye düşünecek, tasarım bunu engellemeli.

**4. Aksiyon barı**
Gör (borç miktarıyla) / Vur / Aç / Geç / Kaç. Duruma göre butonlar kilitli — `legalActions()` ne döndürürse o aktif. Vur seçilince 2–100 arası çip girişi. Sıra sende olduğu geri sayımla belli olmalı.

### Görsel yön notu

Bu oyunun kendine ait bir dünyası var ve tasarım oradan beslenmeli: 31 kumar masası değil, arkadaş masası. Kütük kavramı — dönen, kazanılan, devredilirken bedeli olan bir konum — masada görsel olarak vurgulanmalı. Klasik yeşil çuha + altın çip klişesine gitmeye gerek yok; hazır casino şablonu bu oyunun neyi özel yaptığını anlatmıyor.

Bir uyarı: en görünür yeri **kütük göstergesine** ve **as seçimine** harca. Geri kalan her şey sessiz kalsın.

### Claude Design'a verilecek prompt

> React Native (Expo) için mobil bir kart oyunu masası ekranı tasarla. Oyun "31" — Türkiye'de arkadaş grubunda oynanan, blackjack ile pokerin karışımı bir oyun. 5 oyuncu, 380px genişlik.
>
> Ekranda olması gerekenler:
> - 5 koltuk. Kendi elim altta büyük, 4 rakip üst yarıda dağılmış. Her oyuncunun yanında adı, çip miktarı, bu ele koyduğu çip.
> - Bir oyuncu "kütük" (dealer benzeri ama kazanılan bir konum, sadece 31 yapan alır). Bu güçlü şekilde işaretli olmalı.
> - Kartlar: oyuncu başına 2–6 kart, taşmadan. Üç hal gerekli: kapalı, kendi açık kartım, ve "masaya açık çekilmiş kart" (bu üçüncü hal önemli — herkes o kartı gördü).
> - Ortada pot miktarı ve deste.
> - Altta aksiyon barı: Gör / Vur / Aç / Geç / Kaç. Bazıları duruma göre kilitli. Vur seçilince 2–100 çip girişi.
> - Elimde as varsa eli iki türlü sayabiliyorum, örneğin "14 veya 24". İkisini de göreceğim ve hangisinin daha iyi olduğunu anlayacağım bir gösterge. Dikkat: bu oyunda 14, 24'ten çok daha iyi bir el. Sayısal olarak büyük olan daha iyi değil.
> - Sıra kimde olduğu ve süre geri sayımı.
>
> Kumar/casino estetiğinden kaçın — bu arkadaşlar arası, sanal çipli bir oyun. Yeşil çuha ve altın klişesine gitme.

---

## Aşama 2: Claude Code

### CLAUDE.md'ye yazılacak

```markdown
# 31 — Kart Oyunu

## En önemli kural
Oyun kuralları `src/game/handEvaluator.ts` ve `src/game/bettingEngine.ts`
dosyalarındadır. Kuralları ASLA yeniden implemente etme, bu modüllerden
import et. Kart değeri, hiyerarşi, as mantığı, pot hesabı, sıra yönetimi
— hepsi orada. UI'da veya sunucuda paralel bir kural kodu yazma.

Bu dosyalara dokunursan `npm test` çalıştır. 81 test geçmeli.
Test kırılıyorsa kuralı yanlış anladın, testi değiştirme.

## Mimari
- Motor saf TypeScript, platform bağımsız. Hem client hem sunucu import eder.
- Sunucu yetkilidir (server-authoritative). Kapalı kart client'a ASLA gitmez.
  Client'a giden state sadece `redactFor(state, viewerId)` çıktısıdır.
- Client optimistik oynatır, sunucu cevabıyla uzlaşır.

## Stack
Expo (React Native), TypeScript, Reanimated 3, react-native-skia, Colyseus.

## Animasyon kuralları
- `Animated` (RN core) kullanma, Reanimated kullan.
- Frame başına setState yok. Kartlar memoize edilmiş, useSharedValue ile sürülür.
- Animasyon oyun state'ini bloklamaz.
```

### Yapım sırası

1. **Expo iskeleti + statik masa** — tasarımı koda çevir, sahte state ile
2. **Hot-seat oynanabilir** — motoru bağla, tek telefonda 5 kişi sırayla. Kuralları arkadaşlarınla burada test et
3. **Animasyonlar** — dağıtma, çevirme, çipin pota uçması, 31 kutlaması
4. **Colyseus oda katmanı** — oda kodu, 2-5 kişi, reconnect, sıra timer'ı, kopan oyuncu için otomatik geç
5. **Kalıcılık + admin** — Postgres, çip bakiyesi, `adminAdjust` işlemi ve **audit log** (kim, kime, ne kadar, ne zaman)
6. **Deploy** — tek küçük VPS (Hetzner ~€4/ay veya Fly.io ~$5/ay), push notification için Expo Push

Networking'i 4. adıma bıraktım kasıtlı olarak. Kuralları tek cihazda test etmek çok daha hızlı geri bildirim verir ve bu aşamada hâlâ değişecek kural çıkabilir.

### Sunucu tarafında atlanmaması gerekenler

- Deste `crypto.randomInt` ile karılmalı, `Math.random` değil
- Her aksiyon `legalActions()` ile doğrulanmalı — client'a güvenilmez
- Sıra timer'ı dolunca otomatik `PASS` (borç varsa `FOLD`)
- Reconnect: oyuncu döndüğünde `redactFor()` ile tam state gönder
