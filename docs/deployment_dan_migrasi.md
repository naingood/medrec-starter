# 🚀 Deployment & Migration Guide: medrec-starter

Dokumen ini memuat panduan lengkap alur pemeliharaan, migrasi database SQLite, serta otomatisasi deployment **medrec-starter** ke **GitHub Pages** (untuk antarmuka pratinjau/demo statis) dan publikasi paket CLI ke **npm registry**.

---

## 1. Arsitektur Deployment & Strategi Hosting

Proyek `medrec-starter` memiliki dua skenario deployment utama:

```
                              +---------------------------------------+
                              |          medrec-starter REPO          |
                              +---------------------------------------+
                                        |                   |
                     (GitHub Actions Workflow)         (npm publish)
                                        |                   |
                                        v                   v
                        +-----------------------+   +-------------------+
                        |     GitHub Pages      |   |   npm Registry    |
                        |   (Static Demo App)   |   | (CLI Package Tool)|
                        +-----------------------+   +-------------------+
```

1. **GitHub Pages (Public Demo / Showcase):**
   * Menyajikan versi antarmuka (Frontend Vanilla JS + Tailwind CDN) berbasis *Mock Data* (tanpa memerlukan server Node.js aktif) untuk keperluan dokumentasi dan *preview* cepat bagi dosen/mahasiswa sebelum melakukan instalasi.
2. **npm Registry (CLI Tool Installer):**
   * Dipublikasikan sebagai paket CLI `medrec-starter` yang memungkinkan pengguna menjalankan perintah `npx medrec-starter` untuk memasang backend Express.js + SQLite di lingkungan lokal pengguna.

---

## 2. Deployment ke GitHub Pages (Automated via GitHub Actions)

Guna memastikan antarmuka di GitHub Pages selalu diperbarui saat ada perubahan kode pada branch `main`, kita menggunakan **GitHub Actions Workflow**.

### 2.1 File Workflow GitHub Actions (`.github/workflows/deploy-gh-pages.yml`)

Buat file konfigurasi workflow di dalam repositori Anda:

```yaml
name: Deploy Demo to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Prepare Public Artifacts
        run: |
          mkdir -p build
          cp -r public/* build/
          # Injeksi flag mock data agar frontend berjalan tanpa server Node.js di GitHub Pages
          echo "window.IS_GITHUB_PAGES_DEMO = true;" > build/js/config-demo.js

      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './build'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2.2 Penyesuaian Frontend untuk GitHub Pages (Fallback Mock Data)

Agar antarmuka tetap interaktif saat dibuka di GitHub Pages (tanpa server backend Express):

```javascript
// public/js/app.js (Contoh Fetch Layer Adaptif)
async function fetchPatients() {
  if (window.IS_GITHUB_PAGES_DEMO) {
    // Kembalikan Mock Data Dummy jika berjalan di GitHub Pages
    return [
      { id: 1, no_rm: 'RM-000101', nama_lengkap: 'Dewi Lestari (Demo)', nik: '3507************', jenis_kelamin: 'P' },
      { id: 2, no_rm: 'RM-000102', nama_lengkap: 'Ahmad Fauzi (Demo)', nik: '3507************', jenis_kelamin: 'L' }
    ];
  }

  // Alur normal: Panggil REST API Express.js
  const response = await fetch('/api/patients');
  return await response.json();
}
```

---

## 3. Strategi Migrasi Database SQLite Lokal

Basis data `database/database.sqlite` berada di komputer mahasiswa. Jika terdapat pembaruan skema dari repositori utama `medrec-starter`, alur migrasi dilakukan tanpa menghapus data yang sudah diinput oleh mahasiswa.

### 3.1 Utilitas Runner Migrasi (`database/migrate.js`)

Script sederhana untuk mengeksekusi patch migrasi berurutan:

```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function runMigrations() {
  db.serialize(() => {
    // 1. Buat tabel pelacak migrasi jika belum ada
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Baca file sql dari folder migrations/
    const migrationFolder = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationFolder)) return;

    const files = fs.readdirSync(migrationFolder).sort();
    files.forEach((file) => {
      if (file.endsWith('.sql')) {
        db.get('SELECT name FROM migrations WHERE name = ?', [file], (err, row) => {
          if (!row) {
            const sql = fs.readFileSync(path.join(migrationFolder, file), 'utf8');
            db.exec(sql, (execErr) => {
              if (execErr) {
                console.error(`❌ Gagal migrasi ${file}:`, execErr.message);
              } else {
                db.run('INSERT INTO migrations (name) VALUES (?)', [file]);
                console.log(`✅ Berhasil menjalankan migrasi: ${file}`);
              }
            });
          }
        });
      }
    });
  });
}

runMigrations();
```

---

## 4. Panduan Publikasi Paket CLI ke npm Registry

Agar perintah `npx medrec-starter` dapat digunakan di mana saja oleh mahasiswa, paket dipublikasikan ke npm.

### 4.1 Persiapan `package.json`

```json
{
  "name": "medrec-starter",
  "version": "1.2.0",
  "description": "Boilerplate Sistem Informasi Rekam Medis untuk Mahasiswa RMIK",
  "main": "server.js",
  "bin": {
    "medrec-starter": "./bin/cli.js"
  },
  "scripts": {
    "start": "node server.js",
    "migrate": "node database/migrate.js"
  },
  "keywords": [
    "rekam-medis",
    "health-informatics",
    "sqlite",
    "express",
    "boilerplate"
  ],
  "author": "Tim MedRec Starter",
  "license": "MIT"
}
```

### 4.2 Langkah Publikasi CLI via Terminal

```bash
# 1. Login ke akun npm Anda
npm login

# 2. Verifikasi isi paket sebelum di-publish (Dry Run)
npm publish --dry-run

# 3. Publikasikan paket ke registry npm publik
npm publish --access public
```

---

## 5. Ringkasan Prosedur Pengeluaran Versi (Release Checklist)

Sebelum melakukan `git push` dan `npm publish`:

- [ ] Jalankan seluruh *test plan* (`test_plan.md`).
- [ ] Naikkan nomor versi di `package.json` (mengikuti aturan *Semantic Versioning* `MAJOR.MINOR.PATCH`).
- [ ] Pastikan file `schema.sql` dan folder `migrations/` sudah sinkron.
- [ ] Uji instalasi CLI secara lokal: `npm install -g .` lalu jalankan `medrec-starter test-app`.
- [ ] Push commit ke branch `main` untuk memicu deployment otomatis ke GitHub Pages.