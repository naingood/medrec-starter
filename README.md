# MedRec Starter

**Rekam medis tidak perlu menunggu aplikasi jadi.**

MedRec Starter adalah fondasi aplikasi rekam medis yang bisa dijalankan dalam satu perintah.
Dibuat untuk mahasiswa Rekam Medis dan Informatika Kesehatan yang diminta membangun sistem
dari nol — tapi belum sempat belajar framework, belum punya tim, dan tidak tahu harus mulai
dari mana.

Bukan produk jadi. Bukan janji manis. Ini titik awal yang jujur — dan terbuka untuk
dikembangkan bersama.

[![Lisensi: MIT](https://img.shields.io/badge/lisensi-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-blue.svg)](https://nodejs.org)

---

## Kenapa proyek ini ada

Setiap hari, tenaga rekam medis mencatat ribuan hal: nama, tanggal lahir, diagnosis,
tindakan, obat. Sebagian besar dikerjakan dengan buku, spreadsheet, atau aplikasi yang tidak
pernah mereka pilih sendiri.

Di kampus, hal yang sama muncul dalam bentuk lain: tugas besar, praktikum, skripsi. Yang
diminta adalah "buat sistem informasi rekam medis" — sementara yang diajarkan lebih banyak
tentang kode ICD, alur pendaftaran, dan standar pelaporan daripada tentang routing, database,
dan keamanan sesi.

MedRec Starter hadir di celah itu. Bukan untuk mengerjakan tugasmu, tapi untuk menghilangkan
bagian yang paling melelahkan: memulai. Setelah aplikasi berjalan di laptopmu, yang tersisa
adalah pekerjaan yang memang kamu kuasai — memahami alur rekam medis dan menerjemahkannya
menjadi fitur.

> Kami percaya orang yang paling memahami alur rekam medis seharusnya bisa membangun alatnya
> sendiri — tanpa menunggu vendor, tanpa harus jadi programmer penuh waktu.

## Untuk siapa

- **Mahasiswa RMIK / Rekam Medis** yang harus membangun aplikasi untuk tugas, praktikum, atau skripsi — dan baru pertama kali menyentuh kode.
- **Mahasiswa Informatika Kesehatan** yang mengerti teknis, tapi butuh contoh domain rekam medis yang masuk akal.
- **Tenaga rekam medis** yang penasaran bagaimana sistem di tempat kerjanya sebenarnya bekerja.
- **Dosen** yang ingin bahan praktikum yang bisa dibaca, dijalankan, dan diubah mahasiswa.

## ⚠️ Batas yang perlu kamu tahu

Ini **bahan belajar dan titik awal**, bukan sistem siap pakai di fasilitas layanan kesehatan.

- **Jangan gunakan dengan data pasien asli** tanpa penguatan keamanan, audit, backup, dan
  kepatuhan terhadap UU PDP.
- Autentikasi masih sederhana (session + password), belum ada 2FA, enkripsi at-rest, atau
  manajemen akses berbasis atribut.
- Data contoh di repo ini **sintetis**. Jangan pernah memasukkan NIK, diagnosis, atau rekam
  medis nyata ke dalam issue, pull request, atau commit.

Kejujuran soal batas ini bagian dari proyeknya. Kalau kamu memakainya untuk keperluan nyata,
itu keputusanmu — dan tanggung jawabmu untuk mengamankannya.

---

## Mulai cepat

```bash
npx medrec-starter klinik-sehat
cd klinik-sehat
npm install
npm start
```

Buka <http://localhost:3000>.

CLI akan menanyakan tiga hal: nama klinik/instansi, nama pengembang, dan port aplikasi.
Semua jawaban bisa diubah nanti lewat `.env`.

Jika paket npm belum tersedia di wilayahmu, pakai cara manual:

```bash
git clone https://github.com/naingood/medrec-starter.git
cd medrec-starter
npm install
npm start
```

Butuh **Node.js 18 atau lebih baru**.

Ingin membuat proyek langsung di folder yang sedang dibuka (harus kosong)? Jalankan
`npx medrec-starter .` — tanpa nama folder, CLI akan menanyakan nama proyek lebih dulu.

## Kesalahan umum saat pertama kali

**`npm i medrec-starter` lalu `npm start` → `Missing script: "start"`.**

`medrec-starter` adalah **generator**, bukan aplikasinya. `npm i` hanya memasang alat
pembuatnya, jadi di folder itu belum ada aplikasi untuk dijalankan. Yang benar:

```bash
npx medrec-starter klinik-saya
cd klinik-saya
npm install
npm start
```

**`Folder "..." sudah ada`.** Pilih nama lain, atau jalankan di folder kosong dengan
`npx medrec-starter .`.

**Tidak ingin ditanya macam-macam?** Semua pertanyaan punya default — cukup tekan Enter
untuk memakai `Klinik Sehat Mandiri`, `Mahasiswa RMIK`, dan port `3000`.

## Cara pakai untuk publik (tanpa login)

Buka <http://localhost:3000>. Halaman beranda bisa diakses siapa saja. Dari sana publik dapat:
- Melihat daftar poli dan jadwal dokter
- Mendaftar ke poli (mendapat No RM dan nomor antrian otomatis)
- Melihat antrian poli hari ini
- Mengirim pesan ke petugas

Login (tombol di pojok kanan atas) hanya diperlukan untuk petugas/dokter/superadmin yang akan mengakses panel staff.

## Akun demo

| Peran | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Pendaftaran | `petugas` | `petugas123` |
| Dokter | `dokter` | `dokter123` |
| Superadmin | `superadmin` | `superadmin123` |

Ganti password ini sebelum memakai aplikasi untuk apa pun selain belajar.

## Apa yang sudah ada

| Modul | Isi |
|---|---|
| Beranda (publik) | Fasilitas klinik, daftar poli, jadwal dokter, antrian hari ini — bisa diakses tanpa login |
| Pendaftaran (publik) | Daftar ke poli, dapatkan No RM dan nomor antrian otomatis |
| Jadwal (publik) | Jadwal praktek dokter per poli dan hari |
| Pesan Pasien (publik) | Kirim pesan ke petugas tanpa login |
| Pasien | Daftar, pencarian, tambah pasien, NIK dimasking |
| Pendaftaran | Daftar kunjungan, riwayat pasien, alur periksa |
| Rawat Inap | Manajemen pasien rawat inap |
| ICD-10 | Pencarian kode diagnosis dan penambahan kode (admin) |
| Analitik | Statistik penggunaan sederhana (superadmin) |
| Pesan Pasien (staff) | Terima pesan dari pasien, tandai sudah dibaca, baca pesan |
| Pengaturan | Nama aplikasi, mode maintenance, konfigurasi dasar |
| Modular & Add-ons | Daftar modul aktif serta hook/event yang tersedia |
| Dokumentasi | Dokumentasi internal aplikasi |

Peran bawaan: **admin**, **petugas pendaftaran**, **dokter** — dengan pembatasan akses per
endpoint.

## Struktur proyek

```
.
├── server.js              # Express + session + pemuatan modul
├── bin/cli.js             # Wizard `medrec-starter`
├── database/              # Skema, seed, migration runner, dan database.sqlite (SQLite)
├── core/                  # pluginManager.js, hooks.js
├── helpers/               # validasi, masking, format, audit, keamanan
├── modules/<slug>/        # Satu folder = satu modul (module.json + server.js + client.js)
├── public/                # index.html, login.html, app.js
├── routes/                # Route untuk manajemen plugin
├── tests/                 # Test otomatis (npm test)
└── docs/                  # Spesifikasi, desain, manual, test plan, SDK
```

## Menambah modul sendiri

Setiap fitur adalah folder di `modules/<slug>/` dengan manifest `module.json`:

```json
{
  "name": "Laporan Bulanan",
  "slug": "laporan-bulanan",
  "version": "1.0.0",
  "description": "Rekap kunjungan per bulan untuk dilaporkan ke dinas kesehatan",
  "main": "server.js"
}
```

Modul bisa mendaftarkan route API, item menu, hak akses per peran, dan mendengarkan hook
seperti `encounter.created`. Panduan lengkapnya ada di [`docs/sdk.md`](docs/sdk.md).

Ini bagian yang paling menarik: **kamu tidak perlu mengubah kode inti** untuk menambah fitur.
Kalau modulmu berguna untuk orang lain, kirim sebagai pull request.

## Dokumentasi

| Dokumen | Untuk apa |
|---|---|
| [`docs/functional_specification.md`](docs/functional_specification.md) | Daftar fitur dan perilaku yang diharapkan |
| [`docs/backend_frontend_dan_security_design.md`](docs/backend_frontend_dan_security_design.md) | Arsitektur, keamanan, keputusan teknis |
| [`docs/modelling_dan_database.md`](docs/modelling_dan_database.md) | Skema data dan relasinya |
| [`docs/sdk.md`](docs/sdk.md) | Cara membuat modul/plugin |
| [`docs/user_manual_dan_training.md`](docs/user_manual_dan_training.md) | Panduan pemakaian dan pelatihan |
| [`docs/deployment_dan_migrasi.md`](docs/deployment_dan_migrasi.md) | Menjalankan di server, migrasi data |
| [`docs/test_plan.md`](docs/test_plan.md) | Matriks pengujian |
| [`docs/roadmap_fase.md`](docs/roadmap_fase.md) | Riwayat dan rencana pengembangan |

## Kontribusi

Kontribusi paling berharga di proyek ini **bukan kode**.

Kalau kamu tenaga rekam medis atau mahasiswa RMIK, kamu bisa membantu hanya dengan
menceritakan alur kerjamu: formulir apa yang seharusnya ada, laporan apa yang ditunggu dinas
kesehatan, di mana aplikasi ini terasa menyusahkan. Pengetahuan itu jauh lebih langka
daripada kode.

Kalau kamu developer, ambil satu modul, satu test, atau satu halaman dokumentasi.

Baca [`CONTRIBUTING.md`](CONTRIBUTING.md) untuk cara mulai, aturan data pasien, dan daftar
tugas yang cocok untuk kontributor pertama.

## Lisensi

[MIT](LICENSE) — bebas dipakai, diubah, dan dibagikan, termasuk untuk tugas kuliah dan
proyek komersial. Kalau proyek ini membantumu, ceritakan di issue: itu bahan bakar kami.
