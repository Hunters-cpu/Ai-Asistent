# Security Policy

## Versi yang Didukung

| Versi | Didukung |
|-------|----------|
| 2.x.x | ✅ Ya    |
| 1.x.x | ❌ Tidak |

## Melaporkan Kerentanan

**JANGAN** buat issue publik. Kirim email ke:
📧 **security@hunz.example.com**

Response time:
- Konfirmasi: 48 jam
- Assessment: 5 hari kerja
- Fix: 30 hari

## Praktik Keamanan

- Validasi input semua endpoint
- Session isolation
- No hardcoded credentials
- Environment-based config
- npm audit rutin

## Tips untuk Pengguna

```bash
chmod 600 .env
