<div align="center">

# 🌐 HunzWeb-O51W

**Professional WhatsApp AI Bot Dashboard powered by HunzAI-O51W**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)

Dashboard web untuk menghubungkan **HunzAI-O51W** ke WhatsApp dengan QR Code atau Pairing Code.

</div>

---

## ✨ Fitur

- 🌐 **HunzWeb-O51W** — Dashboard web modern & responsive
- 🤖 **HunzAI-O51W** — AI engine berbasis Google Gemini
- 📱 **QR Code & Pairing Code** — 2 metode koneksi WhatsApp
- 💾 **Session Persistence** — login sekali, tetap aktif
- 🔄 **Auto Reconnect** — tersambung otomatis jika terputus
- 💬 **Chat Real-time** — kirim & terima pesan dari web
- 👥 **Manajemen Kontak Otomatis**
- 🔐 **Fallback Mode** — tetap jalan tanpa API key
- 🐳 **Docker Support**

---

## 🚀 Instalasi Cepat

```bash
# 1. Clone repo
git clone https://github.com/hunz/hunzweb-o51w.git
cd hunzweb-o51w

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env, isi GEMINI_API_KEY

# 4. Jalankan
npm start
```

Buka **http://localhost:3000** 🎉

---

## 🔑 Cara Mendapatkan Gemini API Key (GRATIS)

1. Buka **https://aistudio.google.com/apikey**
2. Login dengan Google account
3. Klik **"Create API key"**
4. Copy key `AIzaSy...`
5. Paste ke `.env`

**Free tier**: 15 req/menit, 1.500 req/hari.

---

## 📱 Cara Menghubungkan WhatsApp

### QR Code
1. Dashboard → **Koneksi** → **Scan QR Code**
2. WhatsApp HP → **Perangkat Tertaut** → **Tautkan Perangkat**
3. Scan QR

### Pairing Code
1. Dashboard → **Koneksi** → **Kode Pairing**
2. Masukkan nomor (contoh: `6281234567890`)
3. Klik **Minta Kode**
4. WhatsApp HP → **Tautkan dengan nomor telepon** → masukkan kode 8 digit

---

## 🐳 Docker

```bash
docker-compose up -d
```

---

## 📂 Struktur

```
hunzweb-o51w/
├── config/       # Konfigurasi
├── public/       # Frontend
├── routes/       # API routes
├── services/     # HunzAI + WhatsApp logic
├── tests/        # Unit tests
└── server.js     # Entry point
```

---

## 📄 Lisensi

MIT — lihat [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ — HunzWeb-O51W & HunzAI-O51W**

⭐ Beri bintang jika membantu!

</div>
