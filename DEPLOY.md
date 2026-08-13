# Kurulum ve deploy

Bu dosya, elle (dashboard/hesap) yapılması gereken adımları anlatır — kod tarafı zaten
tamam. Bkz. mimari plan: `/Users/mac/.claude/plans/tidy-noodling-journal.md`.

## 1. Supabase projesi

1. https://supabase.com üzerinde yeni bir proje oluşturun.
2. **SQL Editor**'a girip `supabase/migrations/20260813131426_init_schema.sql` dosyasının
   tamamını yapıştırıp çalıştırın (users, chip_ledger, hands tabloları + signup bonus
   trigger'ı + RLS politikaları).
3. **Project Settings > API** sayfasından şunları not edin:
   - `Project URL` → client'ta `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key → client'ta `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `JWT Secret` (Settings > API > JWT Settings) → sunucuda `SUPABASE_JWT_SECRET`
4. **Project Settings > Database > Connection string** — "Session pooler" ya da direkt
   bağlantıyı kopyalayın (postgres/service rolü ile) → sunucuda `DATABASE_URL`.
   Bu, `chip_ledger`/`users`/`hands` tablolarına RLS'i atlayarak yazabilen tek bağlantı
   olmalı — anon key burada KULLANILMAZ, o sadece client auth için.

## 2. Google ile giriş (Supabase Auth)

1. https://console.cloud.google.com → yeni proje (veya mevcut) → **APIs & Services >
   Credentials** → **Create Credentials > OAuth client ID**.
2. Application type: **Web application**. Authorized redirect URI olarak Supabase'in
   verdiği callback URL'ini ekleyin: `https://<project-ref>.supabase.co/auth/v1/callback`
   (Supabase dashboard > Authentication > Providers > Google sayfasında tam URL yazılı).
3. Client ID + Client Secret'i Supabase dashboard > **Authentication > Providers >
   Google**'a yapıştırıp aktif edin.

## 3. Apple ile giriş (Supabase Auth)

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**.
2. Bir **Services ID** oluşturun (bu, "Sign in with Apple" için kullanılan client id
   olacak — uygulamanızın bundle id'sinden farklı bir string, örn.
   `com.otuzbir.masa.signin`).
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
Gerçek bir cihazda/derlemede (development build veya standalone) test edin — Expo Go
custom scheme deep-link'lerini güvenilir şekilde desteklemeyebilir.

## 5. Client env vars

Repo kökünde `.env` oluşturun (bkz. `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_COLYSEUS_URL=ws://localhost:2567   # yerelde test için; prod'da wss://... 
```

`EXPO_PUBLIC_` önekli değişkenler Expo tarafından otomatik olarak client bundle'a
gömülür — ayrıca bir config eklemeye gerek yok.

**Önemli:** `src/net/supabase.ts` bu iki değişken eksikse import anında hata fırlatır
(sessiz bir yanlış-yapılandırmadansa net bir hata tercih edildi) — bu, `App.tsx`'teki
`USE_HOT_SEAT` geliştirici anahtarını bile etkiler, çünkü dosya üst seviyede import
ediliyor. Yerelde sadece hot-seat'i denemek isterseniz bile `.env`'e (gerçek olması
şart olmayan, sadece boş-olmayan) placeholder değerler girmeniz gerekir.

## 6. Sunucuyu yerelde çalıştırma

```bash
cd server
cp .env.example .env   # SUPABASE_JWT_SECRET ve DATABASE_URL'i doldurun
npm install
npm run dev             # ws://localhost:2567
```

İki farklı cihaz/simülatörle bağlanıp elle test edin: katıl → kabul et → başlat → bir
el oyna → duraklat/devam et.

## 7. Sunucuyu deploy etme

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
fly secrets set SUPABASE_JWT_SECRET=... DATABASE_URL=...
fly deploy
```

`fly launch` bir `fly.toml` üretir — `[build]` bölümünde `dockerfile = "server/Dockerfile"`
ve deploy'un repo kökünden çalıştığından emin olun (yukarıdaki gibi `--dockerfile` ile
başlatmak bunu otomatik ayarlar).

Deploy sonrası verilen `https://<app>.fly.dev` adresini `wss://<app>.fly.dev` olarak
client'ın `EXPO_PUBLIC_COLYSEUS_URL`'ine yazın (production build'de).

### Hetzner (alternatif)

Bir CX22 (~€4/ay) sunucu açın, Docker kurun, `server/Dockerfile`'ı repo kökünden build
edip çalıştırın; TLS için Caddy/nginx + Let's Encrypt ile `wss://` terminasyonu
gerekir (Fly.io bunu otomatik sağlar, Hetzner'de elle kurulur).

## 8. Admin çip düzeltmeleri (v1)

Şu an için uygulama içi bir admin ekranı yok — bkz. plan'daki "fast-follow" notu.
Bir oyuncunun bakiyesini elle düzeltmek için Supabase SQL Editor'da:

```sql
update public.users set chips = chips + 500 where id = '<user-uuid>';
insert into public.chip_ledger (user_id, delta, reason) values ('<user-uuid>', 500, 'ADMIN_ADJUST');
```

## 9. Doğrulama kontrol listesi

- [ ] Google ile giriş yapılıyor, `public.users` tablosunda 1000 çipli yeni satır oluşuyor
- [ ] Apple ile giriş yapılıyor (iOS)
- [ ] İki cihaz: biri masaya oturuyor, diğeri istek atıyor, ilk oyuncu kabul/red edebiliyor
- [ ] 2 kişiyle "Masayı Başlat" çalışıyor, kartlar doğru dağılıyor
- [ ] Bir oyuncunun kapalı kartları diğer client'ın hiçbir mesajında görünmüyor
- [ ] Süre dolunca otomatik PASS/FOLD çalışıyor
- [ ] Duraklat → herhangi biri "Evet" deyince duruyor, "Devam Et" ile açılıyor
- [ ] El bitince `chip_ledger` ve `users.chips` güncelleniyor, `hands` tablosuna satır düşüyor
- [ ] Uygulamayı kapat/aç — aynı hesapla giriş yapınca aynı bakiye görünüyor (kalıcılık)
