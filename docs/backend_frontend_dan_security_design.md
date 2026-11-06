# 🛠️ Backend, Frontend, and Security Design Document: medrec-starter

Dokumen ini menjelaskan arsitektur teknis lapisan backend (Node.js/Express), rancangan komponen antarmuka frontend (Vanilla JS & Tailwind CSS CDN), serta implementasi keamanan dan perlindungan privasi data medis pada proyek **medrec-starter**.

---

## 1. Backend Architecture Design (Node.js & Express.js)

Backend `medrec-starter` mengadopsi arsitektur **RESTful Monolith Ringan** yang memprioritaskan kemudahan pemahaman bagi mahasiswa tanpa memerlukan kerangka kerja (*framework*) yang berat.

```
                  +-----------------------------------+
                  |      Express.js App Instance      |
                  +-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Global Middleware    |                       |    REST API Routes    |
|  - CORS & Body Parser |                       |  - /api/login         |
|  - Session Handler    |                       |  - /api/patients      |
|  - Maintenance Guard  |                       |  - /api/icd10         |
+-----------------------+                       |  - /api/encounters    |
            |                                   |  - /api/config        |
            +-----------------------+-----------+-----------------------+
                                    |
                                    v
                        +-----------------------+
                        |  RBAC Authorization   |
                        |   checkRole([...])    |
                        +-----------------------+
                                    |
                                    v
                        +-----------------------+
                        | SQLite Database Engine|
                        |  (better-sqlite3)     |
                        +-----------------------+
```

### 1.1 Struktur Server (`server.js`)
File `server.js` mengelola seluruh alur HTTP request, manajemen sesi (*session cookie*), serta koneksi ke basis data `database/database.sqlite`.

* **Session Management:** Menggunakan `express-session` dengan opsi cookie `httpOnly: true` dan `sameSite: 'strict'` untuk mencegah pencurian token via XSS.
* **Database Access Layer:** Menggunakan driver `better-sqlite3` / `sqlite3` berbasis *Synchronous/Prepared Statements* untuk performa tinggi dan pencegahan *SQL Injection*.

### 1.2 Implementasi Middleware Utama

#### A. Maintenance Mode Guard Middleware
Middleware ini memeriksa status `maintenance_mode` pada tabel `config` di basis data secara *real-time*.

```javascript
function maintenanceGuard(req, res, next) {
  // Izinkan aset statis, halaman login, API login, dan endpoint config
  if (
    req.path.startsWith('/css') || 
    req.path.startsWith('/js') || 
    req.path.startsWith('/icons') ||
    req.path === '/login' || 
    req.path === '/api/login' ||
    req.path === '/api/config'
  ) {
    return next();
  }

  const maintenance = db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").get();
  
  if (maintenance && maintenance.value === 'on') {
    const user = req.session ? req.session.user : null;
    // Izinkan hanya Role Admin untuk menembus Maintenance Mode
    if (user && user.role === 'admin') {
      return next();
    }
    
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ 
        error: "Sistem sedang dalam pemeliharaan (Maintenance Mode)." 
      });
    }
    return res.redirect('/maintenance.html');
  }

  next();
}
```

#### B. RBAC (Role-Based Access Control) Authorization Middleware
Middleware serbaguna untuk membatasi akses endpoint REST API sesuai array role yang diizinkan.

```javascript
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Sesi telah berakhir. Silakan login kembali." });
    }

    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ 
      error: "Akses Ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini." 
    });
  };
}
```

---

## 2. Frontend UI/UX Architecture (Vanilla JS & Tailwind CDN)

Frontend `medrec-starter` dirancang **Single Page Application (SPA) Sederhana** tanpa *build tools* (seperti Vite atau Webpack) untuk memastikan *zero setup friction*.

### 2.1 Responsive Layout Strategy

#### A. Desktop View (`>= 768px` / Tailwind `md:`)
* **Fixed Left Sidebar (260px):** Menampilkan identitas klinik, badge role user aktif, navigasi menu vertikal, dan tombol logout.
* **Full-Width Main Content:** Area dinamis yang memuat dashboard, tabel pasien, pencarian ICD-10, atau form pendaftaran.

#### B. Mobile View (`< 768px`)
* **Header Bar Top:** Menampilkan nama klinik dan tombol profil ringkas.
* **App-Like Content Area:** Padding bawah `pb-20` agar konten tidak tertutup bar navigasi bawah.
* **Sticky Bottom Navigation (5 Sticky Bottom Menu):** Tetap menempel di dasar layar (`fixed bottom-0 left-0 right-0 z-50`).

```html
<!-- Struktur Navigasi Bawah Mobile (5 Sticky Bottom Menu) -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-50 shadow-lg">
  <button onclick="switchTab('home')" id="nav-home" class="flex flex-col items-center text-blue-600">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
    <span class="text-xs font-medium mt-1">Beranda</span>
  </button>
  
  <button onclick="switchTab('pasien')" id="nav-pasien" class="flex flex-col items-center text-gray-500">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
    <span class="text-xs font-medium mt-1">Pasien</span>
  </button>
  
  <button onclick="switchTab('icd')" id="nav-icd" class="flex flex-col items-center text-gray-500">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
    <span class="text-xs font-medium mt-1">ICD-10</span>
  </button>
  
  <button onclick="switchTab('daftar')" id="nav-daftar" class="flex flex-col items-center text-gray-500">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
    <span class="text-xs font-medium mt-1">Daftar</span>
  </button>
  
  <button onclick="switchTab('akun')" id="nav-akun" class="flex flex-col items-center text-gray-500">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
    <span class="text-xs font-medium mt-1">Akun</span>
  </button>
</nav>
```

---

## 3. Security & Data Privacy Guidelines

Pengelolaan aplikasi kesehatan menuntut kepatuhan atas kerahasiaan data pasien (berdasarkan prinsip Perlindungan Data Pribadi / PDP dan Permenkes Rekam Medis).

### 3.1 Data Privacy (NIK Masking)
Pada endpoint API publik/tampilan tabel umum, NIK pasien tidak ditampilkan secara penuh untuk menjaga privasi identitas kependudukan pasien.

```javascript
// Utility Masking NIK di Sisi Backend / Frontend Utility
function maskNIK(nik) {
  if (!nik || nik.length !== 16) return nik;
  return nik.substring(0, 4) + '************';
}
```

### 3.2 SQL Injection Prevention
Seluruh query ke SQLite wajib menggunakan parameter terikat (*prepared statements*):

```javascript
// ❌ SANGAT DILEWATI (Rentan SQL Injection):
// const query = `SELECT * FROM patients WHERE nama_lengkap = '${userInput}'`;

// ✅ AMAN (Prepared Statements):
const stmt = db.prepare('SELECT * FROM patients WHERE nama_lengkap LIKE ?');
const results = stmt.all(`%${userInput}%`);
```

### 3.3 Cross-Site Scripting (XSS) Prevention
Seluruh data masukan dari form pasien yang ditampilkan ke HTML di-escape terlebih dahulu dengan utilitas sanitizer sederhana:

```javascript
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
```

---

## 4. Maintenance Mode Interface Specification (`public/maintenance.html`)

Halaman `maintenance.html` menyajikan tampilan pemeliharaan yang bersih, responsif, dan informatif:

* **Header:** Logo MedRec + Lencana *"System Maintenance"*.
* **Hero Section:** Ilustrasi vektor status offline / pemeliharaan sistem.
* **Penjelasan:** *"Sistem rekam medis sedang memperbarui data & peningkatan performa. Silakan coba kembali beberapa saat lagi."*
* **Bypass Link untuk Admin:** Tombol *"Login Administrator"* agar Admin tetap dapat masuk dan mematikan mode maintenance melalui panel Pengaturan/Akun.