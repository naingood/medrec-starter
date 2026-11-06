# CHANGELOG FIXES — medrec-starter

Riwayat perbaikan bug, terbaru di atas. Hanya entri yang sudah terverifikasi.

---

### Fix #8 — Refactor Besar v2.0.0: Login Opsional, Akses Publik, & SQLite di `database/`

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `server.js`, `public/index.html`, `public/js/app.js`, `database/schema.sql`, `database/migrations/002_public_features.sql`, `modules/publik/*`, `modules/pesan/*`, `docs/*` |
| Masalah | Aplikasi wajib login sebelum bisa diakses; tidak ada fitur publik untuk pasien umum; SQLite tersebar di root; nama aplikasi login tidak mengikuti inisialisasi CLI. |
| Akar | Arsitektur v1.x dirancang hanya untuk panel staff (login paksa). Tidak ada endpoint publik, tidak ada tabel poli/antrian/pesan, dan login selalu menampilkan "MedRec Starter" statis. |
| Fix | (1) Login jadi opsional — halaman beranda bisa diakses tanpa login; tombol Masuk di pojok kanan atas (modal). (2) Bottom nav publik: Beranda, Pendaftaran, Jadwal. (3) Endpoint publik: `/api/public/poli`, `/jadwal`, `/daftar`, `/antrian`, `/pesan`. (4) Endpoint staff: `/api/staff/pesan` + tandai dibaca. (5) SQLite pindah ke `database/database.sqlite` dengan migrasi otomatis dari lokasi lama. (6) Judul login mengikuti `APP_NAME` dari inisialisasi CLI via `/api/public-config`. (7) Tabel baru: `poli`, `jadwal_dokter`, `pendaftaran_pasien`, `antrian`, `pesan_pasien`. |
| Verifikasi | `npm test` 14/14 lulus. Uji manual: akses tanpa login → beranda tampil; daftar pasien publik → No RM + antrian otomatis; kirim pesan → staff bisa lihat & tandai dibaca; judul login = nama klinik dari CLI. |
| Pelajaran | Refactor besar harus dibarengi dengan tabel migrasi terpisah (`002_public_features.sql`) dan endpoint publik terpisah dari endpoint staff agar RBAC tidak bocor. |
| Log Keyword | v2.0.0, login-opsional, publik, poli, jadwal, antrian, pesan-pasien, staff-pesan, database-folder, public-config |
| Deploy | PENDING — siap publish 2.0.0 |

---


| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `public/login.html`, `server.js` |
| Masalah | Halaman login selalu menampilkan "MedRec Starter", meskipun pengguna mengisi nama klinik sendiri saat `npx medrec-starter`. Nama baru terlihat setelah login. |
| Akar | `login.html` statis; `app_name` hanya diambil dari `/api/config` yang mewajibkan sesi (`requireAuth`), sehingga belum bisa dipakai sebelum login. |
| Fix | Endpoint publik baru `GET /api/public-config` (tanpa auth, diizinkan saat maintenance) yang hanya mengembalikan `app_name`; `login.html` memakainya untuk `<title>` dan `<h1>`, dengan fallback "MedRec Starter" bila gagal. |
| Verifikasi | Scaffold `klinik-jaya` dengan jawaban "Klinik Sehat Jaya" → `GET /api/public-config` = `{"app_name":"Klinik Sehat Jaya"}`; halaman login memuat `id="appName"` dan memanggil `/api/public-config`; `POST /api/login` 200. |
| Pelajaran | Data yang dibutuhkan sebelum login harus punya endpoint publik tersendiri, jangan menumpang endpoint ber-sesi. |
| Log Keyword | login, title, app_name, public-config, APP_NAME, maintenance |
| Deploy | PENDING — siap publish 1.1.0 |

---

### Fix #6 — Berkas SQLite tersebar di root proyek, bukan di folder `database/`

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `server.js`, `database/migrate.js`, `tests/run.js`, `.gitignore` |
| Masalah | `database.sqlite`, `-wal`, dan `-shm` dibuat di root proyek, bercampur dengan kode; backup/pembersihan rawan salah sasaran. Setelah dipindah, `npm pack` ikut membawa `database/database.sqlite` (192,5 kB) karena `files` memuat seluruh folder `database/`. |
| Akar | `DB_PATH` di-hardcode ke `path.join(__dirname, 'database.sqlite')` sejak versi awal, sementara skema & migrasi sudah berada di `database/`. Field `files` memakai folder, bukan berkas spesifik, sehingga berkas runtime ikut terbungkus. |
| Fix | Semua berkas SQLite dipindah ke `database/database.sqlite` (plus pragma WAL). Ditambah pemindahan otomatis dari lokasi lama saat boot agar data pengguna v1.0.x tidak hilang; `.gitignore` menutup kedua lokasi; CLI tidak menyalin berkas DB; `files` diubah menjadi daftar eksplisit (`database/migrate.js`, `database/schema.sql`, `database/migrations/`). |
| Verifikasi | Repo dengan DB lama: log `[db] Basis data lama dipindahkan ke database/database.sqlite`, root bersih, endpoint tetap normal. Scaffold baru: `database/` hanya berisi `migrate.js`, `migrations`, `schema.sql`; setelah `npm start` muncul `database/database.sqlite`; `npm test` 14/14; `node database/migrate.js` → "Tidak ada migrasi baru."; `npm pack --dry-run` → 76 file, **tanpa** `database.sqlite`. |
| Pelajaran | Whitelist berupa folder akan menyeret berkas runtime; untuk paket yang punya state lokal, daftar berkas eksplisit lebih aman daripada `.npmignore` (yang kalah oleh `files`). |
| Log Keyword | sqlite, database.sqlite, WAL, db path, migrate, backup, legacy move |
| Deploy | PENDING — siap publish 1.1.0 |

---

### Fix #5 — Pemula terjebak: `npm i` + `npm start` gagal, dan CLI tidak bisa dipakai tanpa nama folder

| | |
|---|---|
| Tanggal | 2026-11-06 |
| File | `bin/cli.js`, `README.md` |
| Masalah | `npx medrec-starter` tanpa argumen hanya mencetak usage lalu keluar; `npx medrec-starter .` ditolak "folder sudah ada"; pengguna yang menjalankan `npm i medrec-starter` lalu `npm start` melihat `Missing script: "start"` tanpa penjelasan. |
| Akar | CLI hanya dirancang untuk satu pola: nama folder baru. Tidak ada mode interaktif, tidak ada dukungan folder saat ini, dan README tidak menyatakan bahwa paket ini generator. |
| Fix | (1) tanpa argumen → tanya nama folder (default `klinik-saya`); (2) dukung `.` untuk scaffold di folder kosong (`.git` diabaikan) dengan pesan jelas bila tidak kosong; (3) `--help`; (4) README bagian "Kesalahan umum saat pertama kali". |
| Verifikasi | 5 skenario: tanpa arg (exit 0), `.` di folder kosong (exit 0, `package.json` name = nama folder), `.` di folder berisi 1 file (exit 1 + pesan), nama folder sudah ada (exit 1), `--help` (exit 0). `npm test` 14/14. |
| Pelajaran | Alat untuk pemula harus mengasumsikan README tidak dibaca; jalur yang salah harus menghasilkan pesan yang mengarahkan, bukan error mentah. |
| Log Keyword | cli, npx, npm start, Missing script, scaffolder, folder kosong, UX pemula |
| Deploy | PENDING — siap publish 1.1.0 |

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
