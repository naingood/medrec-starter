# 📚 User Manual & Training Guide Plan: medrec-starter

Dokumen ini berisi rancangan panduan pengguna (*User Manual*) dan modul pelatihan (*Training Guide*) untuk proyek **medrec-starter**. Panduan ini disusun khusus agar mahasiswa, dosen, maupun pengembang pemula di bidang Rekam Medis & Informatika Kesehatan dapat mempelajari alur kerja sistem rekam medis secara cepat dan terstruktur.

---

## 1. Panduan Onboarding & Instalasi (Quickstart Guide)

### 1.1 Prasyarat Sistem (Prerequisites)
Sebelum menggunakan `medrec-starter`, pastikan komputer Anda telah terpasang:
* **Node.js** versi 18.x atau yang lebih baru.
* **npm** (biasanya otomatis terpasang bersama Node.js).
* Peramban web modern (Google Chrome, Mozilla Firefox, Edge, atau Safari).

---

### 1.2 Cara Instalasi via CLI Wizard (Rekomendasi)

Cukup buka terminal / Command Prompt Anda dan jalankan perintah:

```bash
npx create-medrec-starter nama-klinik-saya
```

**Alur Wizard Terminal:**
1. Masukkan **Nama Klinik / Instansi**: *(Contoh: Klinik Sehat Mandiri)*.
2. Masukkan **Nama Pengembang / Mahasiswa**: *(Contoh: Budi Prasetyo - NIM 2101001)*.
3. Pilih **Port Aplikasi**: *(Default: `3000`)*.
4. Wizard akan otomatis mengonfigurasi basis data SQLite dan struktur folder.

Setelah selesai, masuk ke folder dan jalankan server:

```bash
cd nama-klinik-saya
npm start
```

Akses aplikasi melalui browser di `http://localhost:3000`.

---

## 2. Panduan Pengguna Berdasarkan Role Access (RBAC)

Aplikasi membawa 3 akun bawaan (*seed data*) untuk simulasi peran di rumah sakit / klinik:

| Role | Username | Password Default | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses penuh, kelola ICD-10, kontrol Maintenance Mode. |
| **Pendaftaran** | `petugas` | `petugas123` | Tambah/Cari Pasien, Daftarkan Kunjungan Berobat. |
| **Dokter** | `dokter` | `dokter123` | Anamnesis, Input Kode ICD-10, Input Catatan Tindakan Medis. |

---

### 2.1 Alur Kerja Petugas Pendaftaran (Front Office)
1. **Login** menggunakan akun `petugas`.
2. Klik menu **[Pasien]** pada navigasi (Mobile/Desktop).
3. Untuk mendaftarkan pasien baru:
   * Klik tombol **+ Tambah Pasien**.
   * Isi NIK (16 Digit), Nama Lengkap, Tanggal Lahir, Jenis Kelamin, dan Alamat.
   * Nomor Rekam Medis (No. RM) akan tergenerasi otomatis (contoh: `RM-000103`).
4. Klik menu **[Daftar]** untuk mendaftarkan kunjungan berobat:
   * Pilih pasien yang sudah terdaftar.
   * Masukkan keluhan utama pasien (anamnesis awal).
   * Simpan pendaftaran. Status kunjungan otomatis menjadi **"Pemeriksaan"**.

---

### 2.2 Alur Kerja Dokter (Pelayanan Rekam Medis)
1. **Login** menggunakan akun `dokter`.
2. Pada halaman **[Home / Beranda]**, lihat daftar pasien yang berstatus *"Pemeriksaan"*.
3. Klik tombol **Periksa Pasien**:
   * Penelusuran riwayat keluhan utama.
   * Gunakan fitur **Pencarian ICD-10** (Menu **[ICD]**) untuk menemukan kode penyakit yang tepat (Contoh: `J02.9` untuk Faringitis Akut).
   * Masukkan kode ICD-10 dan catatan tindakan medis/terapi.
   * Ubah status pelayanan menjadi **"Selesai"** atau **"Dirujuk"**.

---

### 2.3 Alur Kerja Administrator (Pengelolaan Sistem & Maintenance)
1. **Login** menggunakan akun `admin`.
2. Klik menu **[Akun / Pengaturan]**.
3. **Pengaturan Mode Pemeliharaan (Maintenance Mode):**
   * Geser *toggle switch* **Maintenance Mode** menjadi **ON**.
   * Pengguna non-admin yang sedang membuka aplikasi akan otomatis dialihkan ke halaman pemeliharaan (`/maintenance.html`).
   * Admin tetap dapat menggunakan aplikasi dan mematikan mode pemeliharaan kapan saja (kembali ke **OFF**).

---

## 3. Silabus Rencana Pelatihan (Training Module 2 Jam)

Modul ini dirancang untuk dosen / fasilitator praktikum Informatika Kesehatan dalam memandu mahasiswa:

```
+-------------------------------------------------------------------------+
|                  SILABUS PRAKTIKUM MEDREC-STARTER (120 Menit)           |
+-------------------------------------------------------------------------+
| Sesi 1: Setup & Pengenalan Arsitektur (30 Menit)                        |
|   - Instalasi via CLI Wizard (npx create-medrec-starter)                    |
|   - Eksplorasi folder project & SQLite (database.sqlite)                |
|                                                                         |
| Sesi 2: Simulasi Alur Rekam Medis Elektronik (45 Menit)                 |
|   - Simulasi alur pendaftaran pasien (Role Petugas)                     |
|   - Simulasi input diagnosa ICD-10 & pelayanan medis (Role Dokter)       |
|                                                                         |
| Sesi 3: Pengujian Hak Akses & Fitur Maintenance (30 Menit)              |
|   - Verifikasi pembatasan RBAC antar-role                                |
|   - Pengujian pembatalan akses via Maintenance Mode Toggle (Role Admin) |
|                                                                         |
| Sesi 4: Q&A dan Pengenalan Kustomisasi Kode (15 Menit)                  |
+-------------------------------------------------------------------------+
```

---

## 4. Troubleshooting & Pertanyaan Umum (FAQ)

* **Q: Bagaimana jika port 3000 sudah digunakan aplikasi lain?**
  * *A:* Ubah variabel port pada file `.env` (contoh: `PORT=8080`) atau tentukan port baru saat menjalankan CLI Wizard.
* **Q: Di mana file database disimpan?**
  * *A:* Seluruh data tersimpan lokal pada file `database.sqlite` di root folder proyek Anda.
* **Q: Bagaimana cara me-reset database kembali ke data awal?**
  * *A:* Hapus file `database.sqlite`, lalu jalankan `npm start`. Sistem akan otomatis membuat file basis data baru beserta *seed data* bawaan dari `schema.sql`.