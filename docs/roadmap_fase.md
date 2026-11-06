# 🗺️ Roadmap Implementasi — medrec-starter (5 Fase)

Dokumen ini memecah pekerjaan "mewujudkan aplikasi" menjadi 5 fase dengan milestone yang dapat dikerjakan berurutan. Status diperbarui saat milestone selesai & terverifikasi.

---

## Fase 1 — Fondasi & Database (✅ Selesai)
**Tujuan:** Struktur proyek, dependensi, skema DB, server skeleton.

- M1.1 Inisialisasi `package.json`, folder (`public`, `bin`, `database`, `tests`). ✅
- M1.2 Salin `database/schema.sql` + seed data (users, patients, icd10, encounters, config). ✅
- M1.3 `server.js` skeleton: Express, session, static serving, DB init otomatis. ✅
- M1.4 `npm install` + smoke test `npm start`. ✅

## Fase 2 — Backend API & Middleware (✅ Selesai)
**Tujuan:** Auth, RBAC, maintenance, CRUD endpoints, stats.

- M2.1 Auth: `/api/login`, `/api/logout`, `/api/me`. ✅
- M2.2 Middleware: `maintenanceGuard`, `checkRole`. ✅
- M2.3 Config: `GET/PUT /api/config`. ✅
- M2.4 Patients: `GET` (search+pagination+masking NIK), `POST`. ✅
- M2.5 ICD-10: `GET` (search), `POST` (admin). ✅
- M2.6 Encounters: `GET`, `POST`, `PUT` (diagnosa/tindakan/status). ✅
- M2.7 Stats: `/api/stats`. ✅
- M2.8 Test otomatis (`tests/run.js`) 14/14 PASS. ✅

## Fase 3 — Frontend UI/UX (✅ Selesai)
**Tujuan:** SPA responsive (desktop sidebar + mobile 5 bottom nav).

- M3.1 Layout desktop/mobile + navigasi. ✅
- M3.2 Halaman login + session check. ✅
- M3.3 View Beranda (stats + antrian). ✅
- M3.4 View Pasien (list, search, tambah modal). ✅
- M3.5 View ICD-10 (search, tambah admin). ✅
- M3.6 View Pendaftaran (daftar kunjungan, riwayat, periksa). ✅
- M3.7 View Akun (profil, toggle maintenance admin). ✅
- M3.8 Halaman maintenance. ✅

## Fase 4 — Integrasi, Polishing & CLI (✅ Selesai)
**Tujuan:** Mock data demo, validasi, migrasi, CLI wizard, release config.

- M4.1 Flag `IS_GITHUB_PAGES_DEMO` + mock data fallback (placeholder). ✅ (flag diset false; fallback dapat ditambah)
- M4.2 Validasi input (NIK 16 digit, required fields). ✅
- M4.3 NIK masking & escape HTML (XSS). ✅
- M4.4 Migration runner `database/migrate.js`. ✅
- M4.5 CLI wizard `bin/cli.js`. ✅
- M4.6 `.env.example` + package bin config. ✅

## Fase 5 — Testing & Release (🔄 Berjalan)
**Tujuan:** Verifikasi test plan, deployment config, publikasi.

- M5.1 Test plan matrix (CLI/DB/SEC/API/UI) — status Pending, perlu eksekusi manual. 🔄
- M5.2 GitHub Actions workflow `.github/workflows/deploy-gh-pages.yml`. ⏳
- M5.3 Verifikasi `npm publish --dry-run`. ✅ (live: `medrec-starter@1.0.1`, 2026-11-06)
- M5.4 Dokumen kosong: `business_requirements.md`, `scope.md`, `timeline.md`. ⏳
- M5.5 Final review & tag versi 1.0.0. ⏳

---

## Catatan
- Test otomatis lulus 14/14 (lihat `tests/run.js`).
- Server berjalan di http://localhost:3000 (dev).
- Dokumen kosong (M5.4) dapat diisi sesuai kebutuhan stakeholder.