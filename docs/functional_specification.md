# ⚙️ Functional Specification Document (FSD): medrec-starter

---

## 1. System Overview & Architecture

`medrec-starter` dirancang menggunakan arsitektur **Monolith Ringan (Client-Server Satu Repositori)** berbasis Node.js, Express.js, SQLite3, serta HTML/JS Vanilla dengan Tailwind CSS (CDN).

```
+-----------------------------------------------------------------------+
|                              CLIENT (Browser)                         |
|  +---------------------------------+  +----------------------------+  |
|  | Desktop View: Sidebar + Content |  | Mobile View: Sticky Bottom |  |
|  +---------------------------------+  +----------------------------+  |
|                    HTML5 + Vanilla JS + Tailwind CSS                  |
+-----------------------------------+-----------------------------------+
                                    | AJAX / Fetch API (JSON)
                                    v
+-----------------------------------+-----------------------------------+
|                              SERVER (Node.js)                         |
|  +-----------------------------------------------------------------+  |
|  | Express.js Server (server.js)                                   |  |
|  |  ├── Global Maintenance Middleware                              |  |
|  |  ├── Session Auth & RBAC Middleware                             |  |
|  |  └── RESTful API Routes (/api/...)                              |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------+-----------------------------------+
                                    | SQL Queries
                                    v
+-----------------------------------+-----------------------------------+
|                              DATABASE                                 |
|                      SQLite3 (database/database.sqlite)                |
+-----------------------------------------------------------------------+
```

---

## 2. CLI Onboarding Wizard Specification (`bin/cli.js`)

Perintah utama: `npx medrec-starter <project-name>`

### 2.1 Alur Kerja Wizard Interaktif
1. **Inisialisasi & Verifikasi Naming:**
   * Memeriksa ketersediaan folder target. Jika sudah ada, tampilkan error prompt.
2. **Prompts Interaktif (Menggunakan `prompts` / `readline`):**
   * **Q1:** Nama Klinik / Instansi (Default: `Klinik Sehat Mandiri`)
   * **Q2:** Nama Pengembang / Mahasiswa (Default: `Mahasiswa RMIK`)
   * **Q3:** Port Aplikasi (Default: `3000`)
3. **Eksekusi Otomatis:**
   * Menyalin template folder proyek ke direktori target.
   * Membuat file `database/database.sqlite` dan mengeksekusi `schema.sql`.
   * Mengintegrasikan jawaban **Q1** ke dalam tabel `config` (`key: app_name`).
   * Menulis file `.env` lokal berdasarkan konfigurasi port.
4. **Output Terminal:** Tampilkan pesan sukses dan instruksi untuk menjalankan `npm start`.

---

## 3. Database Schema & Data Dictionary

Database: **SQLite 3** (`database/database.sqlite`)

### 3.1 Tabel `config`
Menyimpan variabel pengaturan global aplikasi secara *key-value*.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `key` | TEXT | PRIMARY KEY | Identifikasi opsi konfigurasi |
| `value` | TEXT | NOT NULL | Nilai konfigurasi |
| `description` | TEXT | NULLABLE | Catatan / deskripsi konfigurasi |

### 3.2 Tabel `users`
Menyimpan data pengguna dan peran akses (RBAC).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique ID User |
| `username` | TEXT | UNIQUE, NOT NULL | Username login |
| `password` | TEXT | NOT NULL | Password (Plain-text untuk starter) |
| `nama_lengkap` | TEXT | NOT NULL | Nama akun pengguna |
| `role` | TEXT | CHECK IN ('admin', 'pendaftaran', 'dokter') | Hak akses sistem |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp registrasi |

### 3.3 Tabel `patients`
Menyimpan data induk pasien rekam medis.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique ID Pasien |
| `no_rm` | TEXT | UNIQUE, NOT NULL | Nomor Rekam Medis (Format: RM-XXXXXX) |
| `nama_lengkap` | TEXT | NOT NULL | Nama lengkap pasien |
| `nik` | TEXT | UNIQUE, NOT NULL | Nomor Induk Kependudukan (16 digit) |
| `tanggal_lahir` | TEXT | NOT NULL | Format: YYYY-MM-DD |
| `jenis_kelamin` | TEXT | CHECK IN ('L', 'P') | L = Laki-Laki, P = Perempuan |
| `alamat` | TEXT | NOT NULL | Alamat tempat tinggal pasien |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Tanggal pendaftaran pasien |

### 3.4 Tabel `icd10`
Master data standar kode penyakit internasional (ICD-10).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique ID Diagnosa |
| `code` | TEXT | UNIQUE, NOT NULL | Kode ICD-10 (Contoh: J02.9) |
| `name_id` | TEXT | NOT NULL | Nama penyakit (Bahasa Indonesia) |

### 3.5 Tabel `encounters`
Menyimpan riwayat kunjungan dan transaksi rekam medis pasien.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique ID Kunjungan |
| `patient_id` | INTEGER | FOREIGN KEY -> `patients(id)` | ID Pasien terhubung |
| `user_id` | INTEGER | FOREIGN KEY -> `users(id)` | ID Dokter/Petugas yang menangani |
| `tanggal_kunjungan`| DATETIME | DEFAULT CURRENT_TIMESTAMP | Waktu pendaftaran kunjungan |
| `keluhan_utama` | TEXT | NOT NULL | Anamnesis / keluhan dari pasien |
| `diagnosa_icd_code`| TEXT | NULLABLE | Kode ICD-10 hasil diagnosa |
| `tindakan` | TEXT | NULLABLE | Catatan tindakan / terapi medis |
| `status` | TEXT | CHECK IN ('Pemeriksaan', 'Selesai', 'Dirujuk') | Status alur pelayanan |

---

## 4. Backend Express API & Middleware Specification

### 4.1 Global Middleware

1. **Maintenance Checker Middleware:**
   * Memeriksa record `maintenance_mode` pada tabel `config`.
   * Jika `value == 'on'`, seluruh request HTML/API selain `/login`, `/api/login`, `/api/config`, dan user ber-role `admin` akan di-redirect ke `/maintenance.html` (atau HTTP status 503 Service Unavailable).
2. **Session / Auth & RBAC Middleware (`checkRole(roles)`):**
   * Memvalidasi sesi aktif pengguna.
   * Memeriksa apakah `req.session.user.role` termasuk dalam array perizinan route. Jika tidak, kembalikan HTTP status `403 Forbidden`.

### 4.2 Endpoint Matrix

| Method | Endpoint | Access / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Autentikasi pengguna & set session cookie |
| `POST` | `/api/logout` | All Roles | Menghapus session aktif |
| `GET` | `/api/me` | All Roles | Mengambil info profil user yang sedang login |
| `GET` | `/api/config` | All Roles | Mengambil konfigurasi global aplikasi |
| `PUT` | `/api/config` | `admin` | Memperbarui setting (Nama Klinik, Maintenance Mode) |
| `GET` | `/api/patients` | All Roles | Mengambil daftar pasien (Search & Pagination) |
| `POST` | `/api/patients` | `admin`, `pendaftaran` | Menambah data pasien baru |
| `GET` | `/api/icd10` | All Roles | Pencarian kode & nama diagnosa ICD-10 |
| `POST` | `/api/icd10` | `admin` | Menambah master data ICD-10 baru |
| `GET` | `/api/encounters` | All Roles | Mengambil daftar riwayat kunjungan pasien |
| `POST` | `/api/encounters` | `admin`, `pendaftaran` | Mendaftarkan kunjungan pasien baru |
| `PUT` | `/api/encounters/:id`| `admin`, `dokter` | Mengisi diagnosa (ICD-10), tindakan & selesaikan pelayanan |

### 4.5 Endpoint Publik (Tanpa Login) — v1.2.0

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/public-config` | Mengambil nama aplikasi (`app_name`) dari konfigurasi |
| `GET` | `/api/public/poli` | Daftar poli / klinik yang tersedia |
| `GET` | `/api/public/jadwal` | Jadwal praktek dokter per poli dan hari |
| `POST` | `/api/public/daftar` | Pendaftaran pasien publik (mendapat No RM & nomor antrian) |
| `GET` | `/api/public/antrian` | Antrian poli hari ini (status menunggu/dipanggil/selesai) |
| `POST` | `/api/public/pesan` | Kirim pesan dari pasien ke petugas |

### 4.6 Endpoint Staff (Butuh Login) — v1.2.0

| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/staff/pesan` | superadmin, admin, pendaftaran, dokter | Daftar pesan masuk dari pasien |
| `PUT` | `/api/staff/pesan/:id/baca` | superadmin, admin, pendaftaran, dokter | Tandai pesan sudah dibaca |

---

## 5. Frontend & UI/UX Specification

### 5.1 Responsive Layout System (Tailwind CSS CDN)
* **Breakpoint Desktop (`>= 768px` / `md:`):**
  * **Top Bar (selalu visible):** Nama klinik di kiri, tombol Login/User di pojok kanan atas.
  * **Sidebar (Left Fixed 250px):** Muncul **hanya setelah login staff**. Berisi logo, nama user, navigasi modul staff, tombol Keluar.
  * **Main Content Area (Right Full Width):** Header info ringkas, area kerja modul dinamis.
  * **Sticky Bottom Bar:** Tersembunyi (`hidden`).
* **Breakpoint Mobile (`< 768px`):**
  * **Sidebar:** Tersembunyi (`hidden`).
  * **Top Bar:** Header ringkas berisi Nama Klinik & Status Login.
  * **Main Content Area:** Full-screen scrollable dengan padding bottom `pb-28`.
  * **Sticky Bottom Navigation Bar (Fixed Bottom 0, Full Width):** **3 Navigasi Utama**: Beranda, Pendaftaran, Jadwal.

### 5.2 Alur Navigasi Bottom Menu (Mobile & Publik)

```
+-------------------------------------------------------------+
|  [ 🏠 Beranda ] [ 📋 Pendaftaran ] [ 📅 Jadwal ]             |
+-------------------------------------------------------------+
```

1. **🏠 Beranda:** Halaman publik dengan fasilitas klinik, daftar poli, jadwal dokter, dan antrian hari ini. Bisa diakses tanpa login.
2. **📋 Pendaftaran:** Form pendaftaran pasien publik (nama, NIK opsional, poli, tanggal, keluhan). Mendapat No RM dan nomor antrian otomatis.
3. **📅 Jadwal:** Jadwal praktek dokter per poli dan hari.

Tombol **Masuk** (pada top bar pojok kanan atas) membuka modal login. Setelah login staff, sidebar desktop muncul dan panel staff (Pasien, ICD-10, Pendaftaran, Pesan Pasien, Pengaturan, Modular) dapat diakses.

---

## 6. Security & Data Privacy Guidelines (Starter Level)

1. **Prinsip Privasi Rekam Medis (PDP Mindset):**
   * Masking NIK pada tampilan tabel umum (contoh: `3507************`).
   * Pengecekan role memastikan petugas pendaftaran tidak dapat mengubah isi catatan medis/diagnosa dokter, dan dokter tidak dapat mengubah data identitas kependudukan pasien.
2. **Pencegahan SQL Injection:**
   * Penggunaan *Parameterized Queries* / *Prepared Statements* pada SQLite backend secara menyeluruh (`db.run(query, [params])`).