# Kurulum ve deploy

Bu dosya, elle (dashboard/hesap) yapılması gereken adımları anlatır — kod tarafı zaten
tamam. Bkz. mimari plan: `/Users/mac/.claude/plans/tidy-noodling-journal.md`.

## Durum (güncel takip)

**Tamamlandı:**
- [x] Supabase projesi oluşturuldu, SQL migration çalıştırıldı
- [x] `server/src/auth.ts` — yeni Supabase projelerinin asimetrik JWT imzalamasına
      (JWKS) göre düzeltildi
- [x] `.env` (client) ve `server/.env` — Supabase URL/key + `DATABASE_URL` (Session
      pooler, test edildi, bağlanıyor) dolduruldu
- [x] Google OAuth — Google Cloud Console'da client oluşturuldu, Supabase'e bağlandı
- [x] Expo/EAS — proje kişisel hesaba (`abdullaherek`) bağlandı, `eas.json` oluşturuldu
- [x] `expo-dev-client` kuruldu, App Store Connect'te iOS app kaydı oluşturuldu,
      bundle identifier `com.abdullaherek.otuzbirmasa` olarak düzeltildi
- [x] EAS environment variables (development) ayarlandı
- [x] İlk iOS development (simulator) build'i EAS'ta başarıyla derlendi — bulut
      derleyicisinde yerel Xcode sürüm sorunu (bkz. aşağıdaki not) yok
- [x] App Store Connect API Key oluşturuldu (`auth/AuthKey_D9XX897XHA.p8`, gitignore'lu),
      `eas.json`'ın `submit.production.ios` bölümüne eklendi
- [x] EAS ile Distribution Certificate + Provisioning Profile kuruldu (`eas credentials`,
      2027'ye kadar geçerli)
- [x] Production (store-signed) iOS build #3 TestFlight'a submit edildi — **ama env
      değişkenleri olmadan derlendiği fark edildi** (açılışta çökerdi)
- [x] EAS "production" ortamına da (development'takiyle aynı) env değişkenleri eklendi;
      `EXPO_PUBLIC_COLYSEUS_URL` bilerek Mac'in LAN IP'sine (`ws://192.168.1.103:2567`)
      ayarlandı — TestFlight'tan gerçek cihazda test ederken telefon Mac'le aynı Wi-Fi'de
      olmalı VE `cd server && npm run dev` çalışıyor olmalı; sunucu deploy edilince bu
      gerçek `wss://` adresiyle güncellenecek
- [x] Build #4 (düzeltilmiş) derlendi ve TestFlight'a submit edildi (ilk otomatik submit
      denemesi Apple tarafında geçici bir `-19000` hatasıyla başarısız oldu, aynı build'i
      tekrar submit etmek sorunu çözdü — bundle id/hesapla ilgili bir şey değildi)

**Sırada:**
- [ ] TestFlight'ta build #4'ün işlenmesinin bitmesini bekle (Apple'dan email gelecek),
      cihaza kurup gerçek Google girişini + tüm oyun akışını test et (telefon+Mac aynı
      Wi-Fi'de, `cd server && npm run dev` yerelde çalışıyor olmalı)
- [ ] Apple ile giriş (Sign in with Apple) — adım 3
- [ ] Colyseus sunucusunu deploy etmek (Fly.io/Hetzner) — adım 7 (TestFlight build'i şu an
      `EXPO_PUBLIC_COLYSEUS_URL=ws://localhost:2567` kullanıyor — gerçek cihazdan test
      için bunu deploy edilen sunucunun `wss://` adresiyle güncelleyip yeniden build/submit
      gerekecek)
- [ ] Android — **bilinçli olarak en sona bırakıldı**, iOS akışı tam oturunca başlanacak

**Bilinen ayrı sorun (bekletiliyor, bloklamıyor):** Yerel Xcode (26.0.1) bu Expo SDK
sürümünün gerektirdiği Swift 6.3'ü desteklemiyor (`weak let` sözdizimi) — bkz.
[expo/expo#46242](https://github.com/expo/expo/issues/46242). Yerel `npx expo run:ios`
bu yüzden derlenemiyor; **EAS Build bulutta doğru toolchain'i kullandığı için bunu
bypass ediyor** — o yüzden native test için EAS'a geçildi. Xcode 26.4+'a
güncellenince yerel build de çalışacaktır, ama artık zorunlu değil.

---

## 1. Supabase projesi

1. https://supabase.com üzerinde yeni bir proje oluşturun.
2. **SQL Editor**'a girip `supabase/migrations/20260813131426_init_schema.sql` dosyasının
   tamamını yapıştırıp çalıştırın (users, chip_ledger, hands tabloları + signup bonus
   trigger'ı + RLS politikaları).
3. **Project Settings > API** sayfasından şunları not edin:
   - `Project URL` → client'ta `EXPO_PUBLIC_SUPABASE_URL`, **sunucuda da** `SUPABASE_URL`
     (sunucu bunu JWT doğrulaması için kullanır — bkz. aşağıdaki not).
   - `publishable` key (yeni format, `sb_publishable_...`) → client'ta
     `EXPO_PUBLIC_SUPABASE_ANON_KEY`. (Eski projelerde bu "anon public" key olarak
     görünür — ikisi de aynı işi görür.)
   - `secret` key (`sb_secret_...`) şu an kodun hiçbir yerinde kullanılmıyor — sunucu
     Postgres'e supabase-js üzerinden değil, doğrudan `DATABASE_URL` ile bağlanıyor.
     **Bu key'i kimseyle paylaşmayın / commit etmeyin**, ileride Supabase'in Admin
     API'sini kullanmak isterseniz lazım olur.
   - **Önemli — yeni projeler:** Supabase artık varsayılan olarak JWT'leri
     asimetrik (ES256/RS256) imzalıyor, yani paylaşılan bir "JWT Secret" yok
     (Settings > API > JWT Keys sayfasında "extracting the private key or shared
     secret... is not possible" yazıyor). Sunucu bu durumda `SUPABASE_URL`'i
     kullanarak projenin JWKS endpoint'i üzerinden doğrulama yapar (bkz.
     `server/src/auth.ts`) — ayrıca bir secret kopyalamanıza gerek yok.
     `SUPABASE_JWT_SECRET` sadece eski (HS256) projeler için fallback olarak duruyor.
4. **Project Settings > Database > Connect** — **Session pooler**'ı kullanın (Direct
   connection artık yalnızca IPv6 — çoğu ortamda/deploy platformunda çalışmaz).
   Kullanıcı adı `postgres.<project-ref>` formatında olur → sunucuda `DATABASE_URL`.
   Bu, `chip_ledger`/`users`/`hands` tablolarına RLS'i atlayarak yazabilen tek bağlantı
   olmalı — publishable/secret key'ler burada KULLANILMAZ, bu ayrı bir Postgres
   bağlantı string'i.

## 2. Google ile giriş (Supabase Auth) ✅ tamamlandı

1. https://console.cloud.google.com → yeni proje (veya mevcut) → **APIs & Services >
   Credentials** → **Create Credentials > OAuth client ID**.
2. Application type: **Web application**. Authorized redirect URI olarak Supabase'in
   verdiği callback URL'ini ekleyin: `https://<project-ref>.supabase.co/auth/v1/callback`
   (Supabase dashboard > Authentication > Providers > Google sayfasında tam URL yazılı).
3. Client ID + Client Secret'i Supabase dashboard > **Authentication > Providers >
   Google**'a yapıştırıp aktif edin.

## 3. Apple ile giriş (Supabase Auth) — sırada

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**.
2. Bir **Services ID** oluşturun (bu, "Sign in with Apple" için kullanılan client id
   olacak — uygulamanızın bundle id'sinden farklı bir string, örn.
   `com.abdullaherek.otuzbirmasa.signin`).
3. Bu Services ID için **Sign in with Apple**'ı etkinleştirin, return URL olarak yine
   Supabase'in verdiği callback URL'ini ekleyin.
4. Bir **Key** oluşturun (Sign in with Apple için), `.p8` dosyasını indirin — bir daha
   indiremezsiniz, güvenli saklayın.
5. Services ID, Team ID, Key ID ve `.p8` içeriğini Supabase dashboard > **Authentication
   > Providers > Apple**'a girin.

Not: Apple girişi yalnızca iOS'ta gösteriliyor (bkz. `src/screens/SignInScreen.tsx`) —
App Store kuralları yalnızca iOS uygulamasında üçüncü taraf girişle birlikte Apple
girişini zorunlu kılar; Android'de sadece Google yeterli.

## 4. Expo deep link (OAuth redirect)

`app.json`'da `scheme: "otuzbirmasa"` zaten tanımlı — `expo-linking` bunu kullanarak
`otuzbirmasa://auth-callback` redirect URL'ini üretir (bkz. `src/net/supabase.ts`).
**Expo Go bu tür özel URL şemalarını güvenilir desteklemiyor** — gerçek testi bir
development build üzerinden yapın (bkz. adım 6b).

## 5. Client env vars ✅ tamamlandı (yerel)

Repo kökünde `.env` (bkz. `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_COLYSEUS_URL=ws://localhost:2567   # yerelde test için; prod'da wss://...
EXPO_PUBLIC_DEV_MODE=false                     # true = Supabase/OAuth'u tamamen atlar, bkz. src/net/devAuth.ts
```

`EXPO_PUBLIC_` önekli değişkenler Expo tarafından otomatik olarak client bundle'a
gömülür. **Önemli:** Bu, sadece yerel (`npm start`/`npm run web`) çalıştırmalar için
geçerli — **EAS Build bulutta çalıştığı için yerel `.env`'i görmez**, aynı değişkenleri
ayrıca EAS'e tanımlamak gerekir (bkz. adım 6b).

## 6a. Sunucuyu yerelde çalıştırma ✅ tamamlandı

```bash
cd server
cp .env.example .env   # SUPABASE_URL ve DATABASE_URL'i doldurun
npm install
npm run dev             # ws://localhost:2567
```

## 6b. iOS development build (EAS) ✅ tamamlandı

Yerel Xcode sürümü bu SDK için yetersiz olduğundan (bkz. "Durum" bölümü), native testi
EAS Build'in bulut derleyicisiyle yapıyoruz — hem Google OAuth deep-link'i hem tüm oyun
akışını gerçek native ortamda test edebilmek için gerekli.

```bash
npx expo install expo-dev-client   # development build'in kendisi buna ihtiyaç duyuyor
```

`eas.json`'daki `development` profili `ios.simulator: true` ile simulator'a kurulabilir
bir build üretir — **code signing gerekmez** (simulator'lar imza istemez), bu yüzden
Apple sertifika/provisioning profile kurulumuna hiç girmeden test edilebiliyor.

EAS bulutta çalıştığı için yerel `.env`'i görmez — build'den önce aynı değerleri EAS'e
tanımlayın (bir kere yeterli, sonraki build'ler otomatik kullanır):

```bash
npx eas-cli env:set development --name EXPO_PUBLIC_SUPABASE_URL --value "https://xqkhzcyrxbzogkmeddrl.supabase.co" --visibility plaintext --non-interactive
npx eas-cli env:set development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<publishable key>" --visibility plaintext --non-interactive
npx eas-cli env:set development --name EXPO_PUBLIC_DEV_MODE --value "false" --visibility plaintext --non-interactive
npx eas-cli env:set development --name EXPO_PUBLIC_COLYSEUS_URL --value "ws://localhost:2567" --visibility plaintext --non-interactive
```

Sonra build:

```bash
npx eas-cli build --platform ios --profile development --non-interactive
```

Bitince verdiği linkten (ya da QR ile) simulator'a kurun. `ws://localhost:2567`
adresi **iOS Simulator'da çalışır** (simulator Mac'in network stack'ini paylaşır) —
gerçek bir cihazda test ederken bu adresi Mac'inizin yerel ağ IP'sine değiştirmeniz
gerekir (`ws://<mac-ip>:2567`), `localhost` cihazın kendisine işaret eder.

İki farklı simulator/cihazla bağlanıp elle test edin: gerçek Google girişi yap → katıl
→ kabul et → başlat → bir el oyna → duraklat/devam et.

## 7. Colyseus sunucusunu deploy etme — sırada

Önerilen: **Fly.io** (~$5/ay, en az kurulum zahmeti). Alternatif: **Hetzner** (~€4/ay,
daha ucuz ama manuel VM/TLS kurulumu gerekir). Tek node yeterli — Colyseus'un sticky
session gereksinimi yalnızca yatay ölçeklemede devreye girer.

### Fly.io

```bash
brew install flyctl        # veya https://fly.io/docs/flyctl/install/
fly auth login
cd /path/to/31-card-game   # build context REPO KÖKÜ olmalı (server/ değil) —
                            # Dockerfile ../src/game'i kopyalıyor
fly launch --dockerfile server/Dockerfile --no-deploy
fly secrets set SUPABASE_URL=... DATABASE_URL=...
fly deploy
```

`fly launch` bir `fly.toml` üretir — `[build]` bölümünde `dockerfile = "server/Dockerfile"`
ve deploy'un repo kökünden çalıştığından emin olun (yukarıdaki gibi `--dockerfile` ile
başlatmak bunu otomatik ayarlar).

Deploy sonrası verilen `https://<app>.fly.dev` adresini `wss://<app>.fly.dev` olarak
hem client'ın hem EAS'ın `EXPO_PUBLIC_COLYSEUS_URL`'ine yazın (production build'de).

### Hetzner (alternatif)

Bir CX22 (~€4/ay) sunucu açın, Docker kurun, `server/Dockerfile`'ı repo kökünden build
edip çalıştırın; TLS için Caddy/nginx + Let's Encrypt ile `wss://` terminasyonu
gerekir (Fly.io bunu otomatik sağlar, Hetzner'de elle kurulur).

## 8. Android — en sona bırakıldı

iOS akışı (giriş + lobi + masa + ödeme) uçtan uca doğrulanınca buraya dönülecek. O
zaman gereken adımlar kabaca: Google Play Console'da app kaydı (zaten oluşturuldu),
`eas build --platform android --profile development`, ve Android'e özgü bir OAuth
client (Google Cloud Console'da ayrı bir "Android" tipi OAuth client, SHA-1
fingerprint ile) — Google girişi Android'de ayrıca bunu gerektirir, iOS'takinden farklı.

## 9. Admin çip düzeltmeleri (v1)

Şu an için uygulama içi bir admin ekranı yok — bkz. plan'daki "fast-follow" notu.
Bir oyuncunun bakiyesini elle düzeltmek için Supabase SQL Editor'da:

```sql
update public.users set chips = chips + 500 where id = '<user-uuid>';
insert into public.chip_ledger (user_id, delta, reason) values ('<user-uuid>', 500, 'ADMIN_ADJUST');
```

## 10. Doğrulama kontrol listesi

- [ ] Google ile giriş yapılıyor, `public.users` tablosunda 1000 çipli yeni satır oluşuyor
- [ ] Apple ile giriş yapılıyor (iOS)
- [ ] İki cihaz: biri masaya oturuyor, diğeri istek atıyor, ilk oyuncu kabul/red edebiliyor
- [ ] 2 kişiyle "Masayı Başlat" çalışıyor, kartlar doğru dağılıyor
- [ ] Bir oyuncunun kapalı kartları diğer client'ın hiçbir mesajında görünmüyor
- [ ] Süre dolunca otomatik PASS/FOLD çalışıyor
- [ ] Duraklat → herhangi biri "Evet" deyince duruyor, "Devam Et" ile açılıyor
- [ ] El bitince `chip_ledger` ve `users.chips` güncelleniyor, `hands` tablosuna satır düşüyor
- [ ] Uygulamayı kapat/aç — aynı hesapla giriş yapınca aynı bakiye görünüyor (kalıcılık)
- [ ] Colyseus sunucusu deploy edildi, client prod'da `wss://` ile bağlanıyor
- [ ] Android akışı da (giriş + oyun) çalışıyor
