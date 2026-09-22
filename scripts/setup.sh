#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   🚀 HunzWeb-O51W - Auto Setup               ║"
echo "║   🤖 Powered by HunzAI-O51W                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "✗ Node.js tidak ditemukan! Install dari https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "✗ Node.js v18+ diperlukan. Anda punya v$NODE_VERSION"
  exit 1
fi
echo "✓ Node.js $(node -v)"

echo ""
echo "▸ Install dependencies..."
npm install

echo ""
if [ -f .env ]; then
  echo "⚠  .env sudah ada, skip."
else
  cp .env.example .env
  echo "✓ .env dibuat dari .env.example"
  echo "⚠  JANGAN LUPA isi GEMINI_API_KEY di .env!"
fi

mkdir -p sessions screenshots
echo "✓ Folder dibuat"
echo ""
echo "✅ Setup selesai!"
echo ""
echo "Langkah selanjutnya:"
echo "  1. Edit .env, isi GEMINI_API_KEY"
echo "  2. Jalankan: npm start"
echo "  3. Buka: http://localhost:3000"
echo ""
