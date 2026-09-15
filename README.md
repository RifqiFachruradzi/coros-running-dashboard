# Dashboard Lari — COROS

Dashboard progress lari personal: menarik data lari, fitness assessment,
training load, dan kondisi tubuh (resting HR, sleep, stress) langsung dari
akun COROS lewat OAuth 2.0, disimpan sebagai JSON versioned di repo ini, dan
otomatis sinkron via Vercel Cron.

## Arsitektur singkat

- **Frontend**: Next.js App Router, komponen chart dengan Recharts, styling
  Tailwind mengikuti skema warna data-viz (lihat `app/globals.css`).
- **Backend**: API routes Next.js di Vercel — OAuth handshake ke COROS MCP
  (`/api/coros/authorize`, `/api/coros/callback`) dan job sinkronisasi
  (`/api/cron/sync`) yang dipanggil Vercel Cron.
- **Data**: file JSON di `/data` — sumber kebenaran tunggal, ter-versioning
  lewat commit history GitHub. Cron job hanya commit kalau ada data baru.
- **Auth ke COROS**: OAuth 2.0 self-serve langsung ke
  `https://mcp.coros.com/mcp` (tidak lewat Claude) — lihat catatan penting
  di bawah.

## Setup

### 1. Import ke Vercel

Import repo ini sebagai project baru di [vercel.com](https://vercel.com/new).

### 2. Aktifkan penyimpanan Upstash Redis

Di tab **Storage** project ini (Vercel Marketplace), tambahkan integrasi
**Upstash Redis** (ada tier gratis). Ini otomatis menambahkan env var
`KV_REST_API_URL` dan `KV_REST_API_TOKEN` — dipakai untuk menyimpan token
OAuth COROS antar invocation serverless (produk lama "Vercel KV" sudah
deprecated, diganti integrasi Marketplace ini dengan nama env var yang sama).

### 3. Set environment variables

Salin dari `.env.example` ke **Settings → Environment Variables**:

| Var | Keterangan |
|---|---|
| `COROS_REDIRECT_URI` | `https://<domain-vercel-kamu>/api/coros/callback` |
| `GITHUB_TOKEN` | Fine-grained PAT, scope hanya repo ini, permission "Contents: Read and write". **Beda dari koneksi GitHub di chat Claude** — token ini dipakai backend yang jalan mandiri di Vercel. |
| `GITHUB_OWNER` | `RifqiFachruradzi` |
| `GITHUB_REPO` | nama repo ini |
| `GITHUB_BRANCH` | `main` |
| `CRON_SECRET` | string acak bebas — Vercel otomatis mengirim ini sebagai header saat memanggil cron |

Redeploy setelah menambahkan env vars.

### 4. Hubungkan akun COROS (sekali saja)

Buka `https://<domain-vercel-kamu>/api/coros/authorize`, login & setujui
akses COROS-mu. Setelah redirect balik sukses, token tersimpan di KV dan
cron job bisa mulai narik data.

Cek status kapan saja lewat `/api/health`.

### 5. Trigger sync pertama (opsional, tidak perlu tunggu jadwal)

```
curl https://<domain-vercel-kamu>/api/cron/sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Jadwal sinkronisasi

`vercel.json` men-set cron **sekali sehari** (`0 15 * * *` UTC ≈ 22:00 WIB).

> **Penting soal frekuensi**: paket **Vercel Hobby (gratis) membatasi cron
> maksimal 1x/hari**, dengan presisi ±59 menit. Untuk polling lebih sering
> (tiap 15–30 menit, lebih mendekati "real-time"), perlu upgrade ke
> [Vercel Pro](https://vercel.com/docs/plans/pro-plan) (mendukung interval
> per-menit). Ubah `schedule` di `vercel.json` sesuai kebutuhan setelah
> upgrade.

## Catatan penting soal integrasi COROS

COROS mendokumentasikan jalur OAuth 2.0 self-serve ini ("Build on COROS
MCP") sebagai *"no application or approval required"*, endpoint
`https://mcp.coros.com/mcp`. Kode di `lib/coros-oauth.ts` dan
`lib/coros-mcp-client.ts` mengikuti pola standar (discovery RFC 8414 +
dynamic client registration RFC 7591 + Authorization Code + PKCE) yang
disyaratkan spesifikasi otorisasi MCP.

**Yang belum bisa diverifikasi tanpa kredensial live**: path endpoint
discovery/registrasi persis, serta format respons tool COROS di server MCP
publik ini. Parser di `lib/coros-parsers.ts` ditulis berdasarkan format teks
yang benar-benar teramati untuk `querySportRecords`,
`queryFitnessAssessmentOverview`, dan `queryTrainingLoadAssessment`; tiga
tool kondisi tubuh (`queryRestingHeartRate`, `querySleepData`,
`queryStressLevel`) belum pernah dicoba sehingga parsernya best-effort dan
tidak akan menjatuhkan seluruh sync kalau formatnya meleset — cek Vercel
function logs setelah run pertama dan sesuaikan regex-nya bila perlu.

Tidak ada webhook dari COROS — sinkronisasi selalu berbentuk polling
terjadwal, bukan push instan tiap kali watch selesai sync ke app COROS.

## Struktur data

- `data/runs.json` — daftar aktivitas lari, dedupe by `labelId`.
- `data/fitness.json` — snapshot harian VO2max/running level/prediksi race.
- `data/training-load.json` — snapshot harian short/long-term load.
- `data/body-condition.json` — snapshot harian resting HR/sleep/stress.

## Pengembangan lokal

```bash
npm install
cp .env.example .env.local   # isi manual, atau vercel env pull
npm run dev
```

Catatan: cron & OAuth callback butuh URL publik untuk redirect COROS —
untuk tes end-to-end lokal, gunakan tunnel (ngrok/cloudflared) dan set
`COROS_REDIRECT_URI` ke URL tunnel tersebut.
