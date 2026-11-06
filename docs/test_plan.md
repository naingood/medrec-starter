# 🧪 Test Plan & Matrix Document: medrec-starter

Dokumen ini memuat skenario perencanaan pengujian (*Test Cases*) untuk memastikan seluruh fungsionalitas **medrec-starter** berjalan dengan baik, stabil, aman, dan sesuai spesifikasi sebelum dipublikasikan ke npm dan GitHub.

---

## 📑 Ringkasan Kategori Pengujian

1. **CLI Wizard Test (CLI)** – Pengujian instalasi interaktif via terminal (`npx medrec-starter`).
2. **Database & Schema Test (DB)** – Pengujian inisialisasi tabel SQLite & seed data bawaan.
3. **Middleware & Security Test (SEC)** – Pengujian fitur RBAC (Hak Akses) & Mode Maintenance.
4. **Backend API Test (API)** – Pengujian endpoint RESTful CRUD.
5. **Frontend UI/UX Test (UI)** – Pengujian antarmuka responsif Desktop (Sidebar) vs Mobile (5 Sticky Bottom Nav).

---

## 🛠️ Tabel Matriks Perencanaan Uji (Test Cases)

### 1. CLI Onboarding Wizard (`bin/cli.js`)

| Test ID | Item yang Diuji | Langkah Pengujian | Ekspektasi Hasil | Priority | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **CLI-01** | Inisialisasi Proyek Baru | Jalankan `npx medrec-starter my-clinic` | Folder `my-clinic` berhasil dibuat beserta seluruh struktur folder internal. | High | Pending |
| **CLI-02** | Validasi Folder Duplikat | Jalankan CLI pada nama folder yang sudah ada | CLI menghentikan proses dan menampilkan pesan peringatan folder sudah ada. | Medium | Pending |
| **CLI-03** | Prompt Input Interaktif | Masukkan nama klinik khusus (contoh: "Klinik Sehat Pertiwi") | Nama klinik berhasil di-*inject* otomatis ke tabel `config` database SQLite. | High | Pending |
| **CLI-04** | Auto Migration SQLite | Periksa direktori proyek setelah CLI selesai | File `database/database.sqlite` tercipta dan terisi tabel dari `schema.sql`. | High | Pending |

---

### 2. Database & Data Integrity (`database/schema.sql`)

| Test ID | Item yang Diuji | Langkah Pengujian | Ekspektasi Hasil | Priority | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **DB-01** | Autoload Seed Data Users | Jalankan query `SELECT * FROM users;` | Terdaftar 3 akun default: `admin`, `petugas`, dan `dokter`. | High | Pending |
| **DB-02** | Master Data ICD-10 | Jalankan query `SELECT * FROM icd10;` | Master data kode ICD-10 bawaan terisi (contoh: A09, J02.9, I10, dll). | Medium | Pending |
| **DB-03** | Constraints Duplicate NIK/No RM | Masukkan pasien baru dengan NIK atau No RM yang sudah terdaftar | SQLite menolak *insert* dan mengembalikan error `UNIQUE constraint failed`. | High | Pending |
| **DB-04** | Foreign Key Encounters | Hapus pasien yang memiliki riwayat kunjungan | Constraint SQLite berjalan sesuai skema (Cascade / Restrict). | Medium | Pending |

---

### 3. Middleware: RBAC & Maintenance Mode (`server.js`)

| Test ID | Item yang Diuji | Langkah Pengujian | Ekspektasi Hasil | Priority | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | Akses Role Petugas ke ICD-10 | Login sebagai `petugas`, lalu kirim `POST /api/icd10` | Server menolak request dan mengembalikan HTTP status `403 Forbidden`. | High | Pending |
| **SEC-02** | Akses Dokter ke Diagnosa | Login sebagai `dokter`, lalu kirim `PUT /api/encounters/:id` | Dokter berhasil mengupdate kode ICD-10 dan catatan tindakan. | High | Pending |
| **SEC-03** | Aktivasi Maintenance Mode | Ubah `maintenance_mode` di tabel `config` menjadi `'on'` | User non-admin yang mengakses sistem di-redirect ke `/maintenance.html`. | High | Pending |
| **SEC-04** | Bypass Maintenance Mode oleh Admin | Akses sistem sebagai `admin` saat `maintenance_mode = 'on'` | Admin tetap bisa mengakses dashboard dan API untuk mengelola sistem. | High | Pending |

---

### 4. Backend REST API Endpoints (`/api/...`)

| Test ID | Item yang Diuji | Langkah Pengujian | Ekspektasi Hasil | Priority | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **API-01** | Autentikasi Login | Kirim `POST /api/login` dengan username & password valid | Server mengembalikan data profil user & menetapkan session cookie. | High | Pending |
| **API-02** | Login Gagal | Kirim `POST /api/login` dengan password salah | Server mengembalikan HTTP status `401 Unauthorized` + pesan error. | High | Pending |
| **API-03** | Pencarian Pasien | Kirim `GET /api/patients?search=Dewi` | Mengembalikan array data pasien bernama "Dewi". | Medium | Pending |
| **API-04** | Masking NIK Pasien | Kirim `GET /api/patients` dari akun role `petugas` | NIK pasien tertutup sebagian untuk privasi data (misal: `3507************`). | High | Pending |
| **API-05** | Form Pendaftaran Pasien | Kirim `POST /api/patients` dengan data valid | Pasien baru tersimpan dan otomatis mendapatkan format No RM baru. | High | Pending |

---

### 5. Frontend Responsive UI/UX (Desktop vs Mobile)

| Test ID | Item yang Diuji | Langkah Pengujian | Ekspektasi Hasil | Priority | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **UI-01** | Layout Mode Desktop (`>= 768px`) | Buka aplikasi di resolusi layar laptop/PC | Sidebar navigasi kiri tampil menetap, sticky bottom bar tersembunyi. | High | Pending |
| **UI-02** | Layout Mode Mobile (`< 768px`) | Buka aplikasi di resolusi layar smartphone / DevTools mobile view | Sidebar tersembunyi, **5 Sticky Bottom Menu** tampil di bagian bawah layar. | High | Pending |
| **UI-03** | Navigasi 5 Bottom Menu | Klik secara bergantian menu: Home, Pasien, ICD, Daftar, Akun di layar HP | Konten halaman berganti secara instan tanpa *reload* utuh (*SPA-like experience*). | High | Pending |
| **UI-04** | Responsif Halaman Maintenance | Akses `/maintenance.html` di perangkat mobile dan desktop | Tampilan pesan pemeliharaan menyesuaikan ukuran layar dengan rapi. | Medium | Pending |

---

## 📌 Rekapitulasi & Kriteria Kelayakan Rilis (*Pass Criteria*)

Aplikasi **medrec-starter** dinyatakan siap dirilis ke npm & GitHub apabila:
1. **100% Test Case dengan Priority 'High'** berstatus **PASSED**.
2. Minimal **85% dari total keseluruhan Test Case** berstatus **PASSED**.
3. Tidak ada celah keamanan kritis pada alur RBAC dan privasi data pasien.