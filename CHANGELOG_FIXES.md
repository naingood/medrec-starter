# CHANGELOG FIXES — medrec-starter

Riwayat perbaikan bug, terbaru di atas. Hanya entri yang sudah terverifikasi.

---

### Fix #4 — Publish ditolak `Cannot publish over previously published version "1.0.0"`

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `package.json`, `package-lock.json` |
| Masalah | `npm publish` gagal `E400` setelah auth 2FA lolos, padahal `npm view medrec-starter` mengembalikan 404. |
| Akar | Nama paket bebas lagi setelah unpublish, tetapi **nomor versi** `1.0.0` yang pernah terbit tidak boleh dipakai ulang selamanya. 404 hanya berarti nama tidak ada, bukan versi tidak terpakai. |
| Fix | Naikkan versi ke **1.0.1** di `package.json` + lock; publish ulang. |
| Verifikasi | `npm view medrec-starter version` → `1.0.1`, dist-tag `latest` = `1.0.1`. Uji `npx medrec-starter@1.0.1 uji-live` di folder kosong: scaffold sukses, `npm install` 109 paket, server `:3994`, `/login.html` 200, `/api/login` 200. |
| Pelajaran | Setelah unpublish, cek versi yang pernah terbit — bukan hanya ketersediaan nama. Selalu bump versi sebelum publish ulang. |
| Log Keyword | npm publish, E400, unpublish, version reuse, 1.0.0, 1.0.1, npx, medrec-starter-publish |
| Deploy | ✅ LIVE npm 2026-11-06 — `medrec-starter@1.0.1` |

---

### Fix #3 — CLI menyalin artefak database & folder internal ke proyek baru

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `bin/cli.js` |
| Masalah | Menjalankan CLI dari hasil `git clone` menyalin `database.sqlite-shm`, `database.sqlite-wal`, `handoffs/`, `.github/`, `tmp_simple.js` ke proyek mahasiswa. |
| Akar | `exclude` hanya berisi nama persis `database.sqlite`; varian `-shm`/`-wal` lolos. Folder internal repo juga tidak pernah dikecualikan. |
| Fix | Filter `entry.name.startsWith('database.sqlite')` + tambah `.env`, `handoffs`, `.github`, `tmp_simple.js` ke daftar exclude. |
| Verifikasi | Scaffold dari clone (`klinik-bersih`) → isi folder: `.env, .env.example, .gitignore, bin, CONTRIBUTING.md, core, database, docs, helpers, LICENSE, modules, package.json, plugins, public, README.md, routes, sdk.md, server.js, tests`. Tidak ada `database.sqlite*`/`handoffs`/`.github`/`tmp_simple.js`. |
| Pelajaran | Daftar exclude berbasis nama persis rapuh; SQLite memakai 2 file pendamping. |
| Log Keyword | cli, scaffold, database.sqlite-wal, handoffs, copyDir, medrec-starter-publish |
| Deploy | ✅ LIVE npm 2026-11-06 — `medrec-starter@1.0.1` |

---

### Fix #2 — `npm test` gagal acak (ECONNREFUSED) karena menunggu 1.500 ms tetap

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `tests/run.js` |
| Masalah | `npm test` gagal di mesin ini: `TypeError: fetch failed` / `ECONNREFUSED` ke `localhost:3999`, padahal server hidup normal saat dijalankan manual. |
| Akar | Test menunggu `setTimeout` 1.500 ms lalu langsung fetch. Pemuatan 11 plugin + SQLite kadang lebih lama, sehingga fetch terjadi sebelum server listen. |
| Fix | Ganti delay tetap dengan polling `GET /login.html` setiap 250 ms sampai 20 detik (`waitForServer`), lalu jalankan seluruh kasus di dalam `main()`. |
| Verifikasi | Sebelum: 8 PASS lalu error. Sesudah: **14 passed, 0 failed** + `Helper tests: ALL PASS`. |
| Pelajaran | Jangan pernah menebak waktu startup server di test; polling readiness selalu lebih benar. |
| Log Keyword | npm test, ECONNREFUSED, port 3999, race, waitForServer, medrec-starter-publish |
| Deploy | ✅ LIVE npm 2026-11-06 — `medrec-starter@1.0.1` |

---

### Fix #1 — Paket npm tidak memuat folder inti sehingga `npx` menghasilkan proyek rusak

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `package.json` |
| Masalah | `files` hanya berisi `bin/`, `public/`, `database/`, `server.js`, `README.md`, `LICENSE`, `.env.example`. Tarball tidak memuat `core/`, `helpers/`, `modules/`, `routes/`, `docs/`, `tests/`. |
| Akar | Field `files` ditulis sebelum sistem plugin/modular ada, tidak pernah diperbarui. |
| Fix | Tambah `core/`, `helpers/`, `modules/`, `routes/`, `docs/`, `tests/`, `CONTRIBUTING.md`. |
| Verifikasi | `npm pack --dry-run` → 76 file, 643,5 kB; `core/pluginManager.js`, `bin/cli.js`, `docs/`, `modules/` ikut. Uji end-to-end: pack → install di folder kosong → CLI scaffold `test-clinic` → `npm install` → server `:3998` → `GET /login.html` **200**, `POST /api/login` **200**. |
| Pelajaran | `files` adalah whitelist; setiap folder baru wajib ditambahkan atau paket akan "publish sukses tapi rusak". |
| Log Keyword | npm publish, files, tarball, core, modules, npx medrec-starter, medrec-starter-publish |
| Deploy | ✅ LIVE npm 2026-11-06 — `medrec-starter@1.0.1` |
