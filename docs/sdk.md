# SDK Modular MedRec Starter

Dokumen ini adalah panduan teknis untuk membuat **plugin/modul baru** pada MedRec Starter.
Sistem modular bekerja seperti plugin WordPress: setiap fitur adalah folder di `plugins/<slug>/`,
dengan manifest `plugin.json` dan kode server/frontend. Plugin hanya dimuat jika statusnya `active`.

---

## 1. Struktur Folder Plugin

```
plugins/
└── <slug>/                 # slug = nama folder, huruf kecil, tanpa spasi
    ├── plugin.json          # manifest (wajib)
    ├── server.js            # entry server (wajib, mengekspor register function)
    ├── client.js            # entry frontend (opsional)
    └── migrations/          # file SQL migrasi (opsional)
        └── 001_init.sql
```

Aturan:
- `slug` harus unik dan sama persis dengan nama folder.
- Gunakan huruf kecil, angka, dan tanda hubung (`-`) saja (contoh: `laporan-kunjungan`).
- Semua aset frontend yang dilayani publik berada di dalam folder plugin dan diakses via `/plugins/<slug>/...`.

---

## 2. Manifest (`plugin.json`)

Contoh minimal:

```json
{
  "name": "Nama Plugin",
  "slug": "nama-plugin",
  "version": "1.0.0",
  "description": "Deskripsi singkat fitur",
  "author": "Nama Pengembang",
  "main": "server.js"
}
```

Contoh lengkap:

```json
{
  "name": "Notifikasi",
  "slug": "notifikasi",
  "version": "1.0.0",
  "description": "Notifikasi in-app untuk event kunjungan",
  "author": "Tim MedRec Starter",
  "main": "server.js",
  "client": "client.js",
  "permissions": ["encounters.read", "notifications.read"],
  "menu": { "label": "Notifikasi", "icon": "🔔", "order": 20 },
  "hooks": ["encounter.created", "encounter.updated"],
  "migrations": ["migrations/001_init.sql"],
  "config": {}
}
```

Field:

| Field | Wajib | Keterangan |
|---|---|---|
| `name` | Ya | Nama tampilan plugin. |
| `slug` | Ya | ID unik, harus sama dengan nama folder. |
| `version` | Ya | Versi semver (contoh `1.0.0`). |
| `main` | Ya | File entry server relatif terhadap folder plugin. |
| `description` | Tidak | Deskripsi singkat. |
| `author` | Tidak | Nama pengembang. |
| `client` | Tidak | File entry frontend (JS) yang dilayani publik. |
| `permissions` | Tidak | Daftar permission yang dibutuhkan (dokumentasi/kontrak). |
| `menu` | Tidak | Item menu: `{ label, icon, order }`. |
| `hooks` | Tidak | Daftar hook yang didengarkan (dokumentasi). |
| `migrations` | Tidak | Daftar file SQL (relatif) yang dijalankan saat aktivasi. |
| `config` | Tidak | Konfigurasi default (objek). |

Validasi interface: `main` harus mengekspor **function** atau objek `{ register }`. Jika tidak, aktivasi gagal dan di-rollback.

---

## 3. SDK Server (`server.js`)

Plugin harus mengekspor satu fungsi `register(ctx)`:

```js
module.exports = function register(ctx) {
  const { db, registerRoute, registerMenu, addAction, addFilter, logger, slug, manifest } = ctx;

  registerRoute('GET', '/', (req, res) => {
    res.json({ data: [] });
  });

  addAction('encounter.created', (enc) => {
    logger.info('encounter baru', enc.id);
  });

  registerMenu({ label: 'Fitur Saya', icon: '🧩', order: 30 });
};
```

Alternatif ekspor objek:

```js
module.exports = {
  register(ctx) { /* ... */ },
  unregister() { /* cleanup opsional */ }
};
```

### 3.1 Objek Context (`ctx`)

| Properti/Metode | Keterangan |
|---|---|
| `ctx.slug` | Slug plugin. |
| `ctx.manifest` | Objek manifest. |
| `ctx.db` | Instance `better-sqlite3` (akses DB langsung). |
| `ctx.logger` | `{ info, warn, error }` dengan prefix plugin. |
| `ctx.registerRoute(method, path, handler, roles?)` | Daftarkan endpoint HTTP di bawah `/api/plugins/<slug>`. |
| `ctx.registerMenu(item)` | Tambah item menu frontend. |
| `ctx.addAction(name, fn)` | Dengarkan action hook. |
| `ctx.addFilter(name, fn)` | Tambah filter hook. |
| `ctx.doAction(name, ...args)` | Trigger action hook. |
| `ctx.applyFilter(name, value, ...args)` | Terapkan filter hook. |

### 3.2 `registerRoute`

```js
ctx.registerRoute('GET', '/', handler);
ctx.registerRoute('POST', '/:id/read', handler, ['admin', 'dokter']);
```

- `method`: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- `path`: relatif terhadap `/api/plugins/<slug>`. Mendukung parameter `:id`.
- `handler(req, res)`: handler Express standar.
- `roles` (opsional): array role yang boleh akses. Default `['admin']`. `superadmin` selalu diizinkan.

Endpoint final contoh: `GET /api/plugins/nama-plugin/`.

### 3.3 Hook: Action

Trigger dari core (contoh saat encounter dibuat):

```js
// di server.js core
hooks.doAction('encounter.created', { id, patient_id, keluhan_utama, user_id });
```

Plugin mendengarkan:

```js
ctx.addAction('encounter.created', (enc) => {
  ctx.db.prepare('INSERT INTO notifications (...) VALUES (...)').run(...);
});
```

Action bersifat fire-and-forget; error di satu plugin tidak menghentikan plugin lain.

### 3.4 Hook: Filter

Filter memodifikasi nilai secara berantai:

```js
// core
const masked = hooks.applyFilter('patient.nik.mask', nik, role);

// plugin
ctx.addFilter('patient.nik.mask', (nik, role) => {
  return role === 'admin' ? nik : '****';
});
```

### 3.5 Migrasi Database

Plugin dapat menyediakan file SQL di `migrations/`. Migrasi dijalankan saat **aktivasi** dan dicatat di tabel `plugin_migrations` agar idempotent.

```sql
-- migrations/001_init.sql
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Aturan:
- Gunakan `CREATE TABLE IF NOT EXISTS` agar aman dijalankan ulang.
- Satu file migrasi = satu perubahan skema (penamaan `001_...`, `002_...`).
- Jangan drop tabel/data pengguna tanpa persetujuan.

---

## 4. SDK Frontend (`client.js`)

Plugin dapat menyediakan UI dengan mengekspor objek global `window.Plugin_<slug>`:

```js
(function () {
  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function render(container) {
    container.innerHTML = '<div class="text-gray-400">Memuat...</div>';
    load(container);
  }

  async function load(container) {
    try {
      const data = await api('/api/plugins/nama-plugin');
      container.innerHTML = `<div>${JSON.stringify(data.data)}</div>`;
    } catch (e) {
      container.innerHTML = `<div class="text-red-600">Error: ${escape(e.message)}</div>`;
    }
  }

  function escape(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, (t) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  window.Plugin_nama_plugin = { render };
})();
```

Aturan:
- Nama global harus `Plugin_<slug>` dengan slug yang sama (hubung `-` tetap `-`, contoh `Plugin_laporan_kunjungan`? Gunakan slug persis: `Plugin_notifikasi`).
- Hanya fungsi `render(container)` yang wajib.
- Core memuat `client.js` hanya jika plugin `active`.
- Plugin dapat memanggil endpoint core/plugin melalui `fetch` (session cookie otomatis terkirim).
- Hindari manipulasi DOM di luar `container` yang diberikan.

### 4.1 Menu Plugin

Jika manifest memiliki `menu` dan plugin memanggil `registerMenu`, core akan menambahkan tombol di sidebar (desktop) secara dinamis. Klik menu memanggil `switchTab('plugin:<slug>')` yang merender `Plugin_<slug>.render()`.

---

## 5. Lifecycle Plugin

| Tahap | Yang Terjadi |
|---|---|
| Discover | Core memindai folder `plugins/`, membaca manifest, upsert ke tabel `plugins` (status default `inactive`). |
| Install | (Implicit) migrasi belum dijalankan; plugin terdaftar di DB. |
| Activate | Jalankan migrasi pending → `require()` main → panggil `register(ctx)` → daftarkan routes/menu/hook → status `active`. |
| Deactivate | Panggil `unregister()` jika ada → hapus routes/menu/hook kontribusi → status `inactive`. |
| Delete | Deactivate → hapus folder plugin → hapus record DB & migrasi. |

### Rollback on Failure

Jika aktivasi gagal (manifest tidak valid, file main tidak ada, `register` bukan function, atau `register` throw error):
- Kontribusi yang sudah terdaftar dibersihkan.
- Migrasi yang baru dijalankan di-rollback (record dihapus).
- Status di-set `inactive` dengan `last_error` berisi pesan error.
- Error dikembalikan ke API (HTTP 400) dan ditampilkan di panel modular.

---

## 6. Keamanan

- Plugin berjalan di **proses yang sama** dengan core (seperti WordPress). Hanya install plugin dari sumber terpercaya.
- Semua aksi manajemen plugin (scan, activate, deactivate, delete) **hanya `superadmin`**.
- Validasi manifest dilakukan sebelum load; plugin invalid tidak mematikan core.
- Endpoint plugin (`/api/plugins/<slug>/...`) memerlukan sesi aktif dan RBAC.
- `superadmin` selalu diizinkan; role lain harus masuk daftar `roles` pada `registerRoute`.

---

## 7. Panel Modular (Superadmin)

Akses: login sebagai `superadmin` → tab **Modular** (desktop sidebar / mobile bottom nav) atau tombol di halaman Akun.

Fitur:
- **Scan**: memindai folder `plugins/` dan menyinkronkan DB.
- **Aktifkan / Nonaktifkan**: mengubah status plugin.
- **Hapus**: menghapus plugin (folder + DB).
- **Buka**: membuka tampilan plugin (jika aktif & menyediakan `client.js`).
- Menampilkan status badge dan `last_error` jika ada.

---

## 8. Contoh Plugin Minimal (copy-paste)

Folder: `plugins/hello-world/`

`plugin.json`:
```json
{
  "name": "Hello World",
  "slug": "hello-world",
  "version": "1.0.0",
  "description": "Plugin contoh minimal",
  "author": "Dev",
  "main": "server.js",
  "client": "client.js",
  "menu": { "label": "Hello", "icon": "👋", "order": 90 }
}
```

`server.js`:
```js
module.exports = function register(ctx) {
  ctx.registerRoute('GET', '/', (req, res) => {
    res.json({ message: 'Halo dari plugin!', user: req.session.user.username });
  });
  ctx.registerMenu({ label: 'Hello', icon: '👋', order: 90 });
  ctx.logger.info('hello-world registered');
};
```

`client.js`:
```js
(function () {
  function render(container) {
    container.innerHTML = '<div class="p-4 text-gray-600">Memuat...</div>';
    fetch('/api/plugins/hello-world')
      .then((r) => r.json())
      .then((d) => { container.innerHTML = '<div class="p-4 font-medium">' + (d.message || 'OK') + '</div>'; })
      .catch((e) => { container.innerHTML = '<div class="p-4 text-red-600">' + e.message + '</div>'; });
  }
  window.Plugin_hello_world = { render };
})();
```

Langkah uji:
1. Buat folder & file di atas.
2. Login superadmin → Panel Modular → **Scan**.
3. Klik **Aktifkan** pada “Hello World”.
4. Menu “👋 Hello” muncul di sidebar; klik untuk membuka tampilan.

---

## 9. Troubleshooting

- **Plugin tidak muncul setelah ditambahkan folder**: klik **Scan** di panel modular, atau restart server (core auto-discover saat boot).
- **Aktivasi gagal “Plugin main harus mengekspor function…”**: pastikan `module.exports = function register(ctx) { ... }` atau `module.exports = { register(ctx) {...} }`.
- **Endpoint 404**: pastikan plugin status `active`; route didaftarkan saat aktivasi. Cek `last_error` di panel.
- **Menu tidak muncul di mobile**: menu dinamis saat ini ditambahkan ke sidebar desktop; akses mobile via Panel Modular → **Buka**.
- **Migrasi error**: periksa sintaks SQL; gunakan `IF NOT EXISTS`; lihat `last_error`.

---

## 10. Konvensi & Best Practice

- Satu plugin = satu tanggung jawab (single feature).
- Prefix tabel DB dengan slug plugin (contoh `notif_...`) untuk menghindari bentrok.
- Jangan ubah tabel core (`users`, `patients`, dll.) langsung; gunakan migrasi & hook.
- Gunakan `ctx.logger` alih-alih `console.log`.
- Validasi input di endpoint plugin (jangan percaya client).
- Sertakan `version` yang naik setiap perubahan.
- Dokumentasikan permission yang dibutuhkan di manifest.

---

## 11. Builder Pattern untuk Add-On

Setiap modul dapat memiliki fungsi, screen, dan add-on. Add-on disusun dengan **Builder Pattern**:

```js
const homeModule = new ModuleBuilder('home')
  .screen('main', (vc) => renderHome(vc))
  .fn('refreshStats', async () => { /* ... */ })
  .addon('welcome-banner', (mod) => {
    const originalRender = mod.render;
    mod.render = async (vc) => {
      await originalRender(vc);
      const banner = document.createElement('div');
      banner.className = 'mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm';
      banner.textContent = 'Add-on: Selamat datang di Modul Beranda';
      vc.appendChild(banner);
    };
  })
  .build();

window.Module_home = homeModule;
```

- `screen(name, fn)` mendaftarkan tampilan.
- `fn(name, fn)` mendaftarkan fungsi modul.
- `addon(name, fn)` menambahkan add-on yang dapat memodifikasi modul (wrap render, tambah fungsi, dll.).
- `build()` menghasilkan objek modul final.

Dokumen ini melengkapi `docs/` dan `README.md`. Untuk contoh nyata, lihat `modules/notifikasi/` dan `modules/home/client.js`.