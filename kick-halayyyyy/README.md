# Kick Halay Overlay (Multi-Channel)

Türk halay temalı, Kick sohbet entegreli interaktif overlay.  
**Her yayıncıya özel overlay adresi** + kanal bazlı tamamen izole oyuncu listeleri.

## Özellikler

- URL formatı: `/overlay/KICK_KANAL_ADI`  
  Örnek: `https://senin-site.onrender.com/overlay/lord3131`
- Her kanalın oyuncuları **birbirinden tamamen ayrı** tutulur
- Kick sohbetinden `!katıl` yazan izleyici **sadece o yayıncının** overlay’ine eklenir
- Arka plan tamamen şeffaf (OBS Browser Source uyumlu)
- Yeni katılanlar gerçek zamanlı görünür
- OBS sayfası yenilense bile (sunucu ayaktayken) oyuncular kaybolmaz
- 1920×1080 ve diğer çözünürlüklerle uyumlu
- Mevcut Kick bağlantısı, karakter animasyonları ve daire sistemi korundu
- Demo + manuel ekleme (kanal odasına yazar)

## Kullanım

### 1. Kontrol paneli
`https://SENIN-URL.onrender.com/`

1. Kick kanal slug’ını yaz (ör: `lord3131`)
2. **Bağlan** → Kick sohbeti dinlenir
3. İzleyiciler `!katıl` / `!ayrıl` yazar
4. İstersen Demo veya Manuel Ekle kullan

### 2. OBS Browser Source
URL:

```
https://SENIN-URL.onrender.com/overlay/lord3131
```

- Genişlik / Yükseklik: **1920 × 1080** (veya sahne boyutu)
- Transparent background açık
- Sadece o kanalın karakterleri görünür, menü yok

Farklı yayıncı için farklı URL kullan (`/overlay/baska-kanal`).

## Komutlar

| Komut                         | Açıklama    |
|-------------------------------|-------------|
| `!katıl` / `!join` / `!halay` | Oyuna katıl |
| `!ayrıl` / `!leave` / `!çık`  | Oyundan çık |

## Teknik

- **Node.js + Express + ws**
- Sunucu her kanal için ayrı oda (`rooms` Map) tutar
- Overlay URL’den kanalı okur → `subscribe` ile o odaya katılır
- Kontrol paneli Kick’e bağlandığında aynı odaya subscribe olur
- `add` / `remove` / `clear` sadece ilgili kanal odasına yazılır ve sadece o odanın client’larına yayınlanır

## Render Deploy

**Web Service** (Node) kullan:

- Build Command: `npm install`
- Start Command: `node server.js`
- Free plan yeterli

`render.yaml` Blueprint ile de kurulabilir.

## Yerel test

```bash
npm install
node server.js
```

- Kontrol: http://localhost:3000/
- Overlay: http://localhost:3000/overlay/lord3131

## Dosya yapısı

```
├── server.js       # Multi-room WebSocket + Express
├── index.html      # Kontrol paneli (Kick + UI)
├── overlay.html    # Temiz OBS sayfası (kanal path’ten)
├── package.json
├── render.yaml
└── README.md
```

## Notlar

- Kick dinleyici kontrol panelinde çalışır. Panel kapatılırsa yeni `!katıl` gelmez (mevcut oyuncular sunucuda kalır).
- State bellek içidir → Render free dyno sleep/restart’ta sıfırlanır.
- Aynı kanal için birden fazla kontrol / overlay açılabilir; hepsi aynı odayı paylaşır.
