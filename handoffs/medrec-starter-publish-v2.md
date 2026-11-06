# Publish medrec-starter 1.2.0 ke npm & GitHub
Status: BERJALAN · Service: medrec-starter · Diperbarui: 2026-11-06

## Sedang dikerjakan
Publish npm versi 1.2.0 (refactor besar: login opsional, akses publik, SQLite di database/). Sudah diuji end-to-end dari tarball lokal. Tinggal `npm publish` (butuh OTP dari akun npm).

## Status terakhir (terbukti)
- `npm test` → **14 passed, 0 failed** + Helper ALL PASS.
- `npm pack --dry-run` → `medrec-starter-1.2.0.tgz`, 83 file, tanpa `database.sqlite`.
- Uji end-to-end: tarball → install di folder kosong → CLI scaffold `klinik-v2` (port 3991) → `npm install` → server hidup → `/login.html` punya `id="appName"` + memanggil `/api/public-config`; `public-config` = `{"app_name":"Klinik V2 Uji"}`; `/api/public/poli` 4 poli; `/api/public/jadwal` 18 jadwal; `/api/login` 200.
- GitHub push berhasil: commit terbaru == `origin/main`.
- CHANGELOG_FIXES #1–#8 (semua PENDING publish, akan ditandai ✅ LIVE setelah npm publish).

## Blocker publish
- `npm publish` berhenti di `EOTP` (butuh one-time password dari authenticator). Tidak ada yang terunggah ke registry.
- 2FA akun npm = Passkey.

## Langkah berikutnya
1. Jalankan `npm publish` (atau `npm publish --otp=123456`) dari terminal pemilik akun.
2. Verifikasi `npm view medrec-starter version` → `1.2.0`.
3. Verifikasi `npx medrec-starter@1.2.0` dari folder kosong.
4. Setelah live: ubah status Fix #1–#8 di CHANGELOG_FIXES.md menjadi `✅ LIVE`, commit & push, hapus handoff ini.

## Jangan lakukan
- Jangan commit `sdk.md` di root (duplikat dengan `docs/sdk.md`, sengaja tidak di-track).
- Jangan kirim OTP/token ke chat.
- Jangan ubah `docs/documentation.html` (user menawarkan jangan disentuh).
