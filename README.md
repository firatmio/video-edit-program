# 🎬 Video Kesici

Hızlı ve profesyonel video kesme/birleştirme aracı. Basit arayüzü ile videolarınızın istediğiniz bölümlerini kolayca kesin ve dışa aktarın.

![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=flat-square&logo=tauri&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-1.9-2C4F7C?style=flat-square&logo=solid&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-2021-000000?style=flat-square&logo=rust&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Required-007808?style=flat-square&logo=ffmpeg&logoColor=white)

---

## ✨ Özellikler

- **🎯 Hassas Kesim** — Frame-by-frame kontrol ile hassas başlangıç/bitiş noktası belirleme
- **📋 Çoklu Kesim** — Tek videoda birden fazla bölüm seçebilme
- **⚡ Hızlı Export** — FFmpeg ile yeniden encode yapmadan hızlı dışa aktarım
- **🖥️ Yerli Uygulama** — Tauri ile native performans, düşük kaynak kullanımı
- **🎨 Premium Arayüz** — Profesyonel, karanlık tema

---

## 📸 Ekran Görüntüsü

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎬 Video Kesici                           [📂 Video Aç] [💾 Aktar] │
├────────────────────────────────────────────────┬────────────────────┤
│                                                │  Kesim Listesi     │
│                                                │  ──────────────    │
│              [ Video Önizleme ]                │  #1 00:10 → 00:45  │
│                                                │  #2 01:20 → 02:15  │
│                                                │  #3 03:00 → 03:30  │
│                                                │                    │
├────────────────────────────────────────────────┤  [+ Kesim Ekle]    │
│  ◀◀  ◀  [▶]  ▶  ▶▶     0.5x 1x 1.5x 2x   🔊━━ │                    │
├────────────────────────────────────────────────┴────────────────────┤
│  00:01:23 / 05:30:00                                                │
│  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│       [===]              [=======]        [====]                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Gereksinimler

| Gereksinim | Açıklama |
|------------|----------|
| **FFmpeg** | Video işleme için gerekli. [İndir](https://ffmpeg.org/download.html) ve PATH'e ekle |
| **Node.js** | v18+ veya **Bun** önerilir |
| **Rust** | Tauri için gerekli. [rustup.rs](https://rustup.rs/) |

### FFmpeg Kurulumu (Windows)

```bash
# Winget ile
winget install FFmpeg

# veya Chocolatey ile
choco install ffmpeg

# veya Scoop ile
scoop install ffmpeg
```

Kurulumu doğrulamak için:
```bash
ffmpeg -version
```

---

## 🚀 Kurulum

```bash
# Repoyu klonla
git clone https://github.com/firatmio/video-edit-program.git
cd video-edit-program

# Bağımlılıkları yükle
bun install

# Geliştirme modunda çalıştır
bun run tauri dev

# Production build
bun run tauri build
```

---

## 📖 Kullanım

1. **Video Aç** — `📂 Video Aç` butonuna tıklayın veya boş alana tıklayın
2. **Kesim Ekle** — Sağ panelden `+ Kesim Ekle` butonuna tıklayın
3. **Zaman Ayarla** — Video'da istediğiniz noktaya gidin ve `◀ Ayarla` / `Ayarla ▶` butonlarıyla başlangıç/bitiş belirleyin
4. **Timeline'dan Düzenle** — Kesim bölgelerini sürükleyerek ayarlayın
5. **Dışa Aktar** — `💾 Dışa Aktar` ile seçili bölümleri kaydedin

### Kısayollar

| Tuş | İşlev |
|-----|-------|
| `Space` | Oynat/Duraklat |
| `←` / `→` | 10 saniye geri/ileri |
| `◀` / `▶` | 1 frame geri/ileri |

---

## 🏗️ Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Frontend | SolidJS + TypeScript |
| Backend | Rust + Tauri 2.0 |
| Video İşleme | FFmpeg (CLI) |
| Build | Vite |
| Paket Yönetimi | Bun |

---

## 📁 Proje Yapısı

```
video-edit-program/
├── src/                    # Frontend kaynak kodları
│   ├── components/         # SolidJS bileşenleri
│   │   ├── VideoPlayer.tsx # Video oynatıcı
│   │   ├── Timeline.tsx    # Zaman çizelgesi
│   │   └── CutList.tsx     # Kesim listesi
│   ├── App.tsx             # Ana uygulama
│   ├── App.css             # Stiller
│   ├── types.ts            # TypeScript tipleri
│   └── utils.ts            # Yardımcı fonksiyonlar
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── lib.rs          # FFmpeg entegrasyonu
│   ├── Cargo.toml          # Rust bağımlılıkları
│   └── tauri.conf.json     # Tauri yapılandırması
└── package.json
```

---

## 📄 Lisans

MIT License — Dilediğiniz gibi kullanın.

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/firatmio">firatmio</a></sub>
</p>
