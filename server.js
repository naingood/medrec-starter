require('dotenv').config();
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const pm = require('./core/pluginManager');
const hooks = require('./core/hooks');
const { auditLog } = require('./helpers/audit');
const { maskingNIK, cekRole } = require('./helpers/keamanan');
const { validasiNIK, sanitizeInput } = require('./helpers/validasi');
const { buildPagination, generateNoRM } = require('./helpers/data');

const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'database');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');
const LEGACY_DB_PATH = path.join(__dirname, 'database.sqlite');

// --- Database init ---
// Semua berkas SQLite berada di folder database/ (database.sqlite, -wal, -shm).
fs.mkdirSync(DB_DIR, { recursive: true });

// Pindahkan otomatis basis data dari lokasi lama (v1.0.x) agar data tidak hilang.
if (fs.existsSync(LEGACY_DB_PATH) && !fs.existsSync(DB_PATH)) {
  try {
    for (const suffix of ['', '-wal', '-shm']) {
      if (fs.existsSync(LEGACY_DB_PATH + suffix)) {
        fs.renameSync(LEGACY_DB_PATH + suffix, DB_PATH + suffix);
      }
    }
    console.log('[db] Basis data lama dipindahkan ke database/database.sqlite');
  } catch (e) {
    console.warn('[db] Gagal memindahkan basis data lama: ' + e.message);
  }
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema.sql (idempotent) on boot
const schemaPath = path.join(__dirname, 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Jalankan migration runner untuk file .sql di database/migrations/
const migratePath = path.join(__dirname, 'database', 'migrate.js');
if (fs.existsSync(migratePath)) {
  try { require(migratePath); } catch (e) { console.warn('[migrate] ' + e.message); }
}

// Inject nama klinik/pengembang dari .env (hasil CLI wizard) bila ada
if (process.env.APP_NAME) {
  db.prepare("UPDATE config SET value = ? WHERE key = 'app_name'").run(process.env.APP_NAME);
}
db.prepare("INSERT OR IGNORE INTO config (key, value, description) VALUES ('developer_name', ?, 'Nama pengembang')").run(process.env.DEVELOPER_NAME || '');

// --- Helpers ---

function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}


// --- Express app ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'medrec-starter-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict' }
}));

// Maintenance guard
function maintenanceGuard(req, res, next) {
  if (
    req.path.startsWith('/css') ||
    req.path.startsWith('/js') ||
    req.path.startsWith('/icons') ||
    req.path === '/login' ||
    req.path === '/login.html' ||
    req.path === '/maintenance.html' ||
    req.path === '/api/login' ||
    req.path === '/api/config' ||
    req.path === '/api/public-config' ||
    req.path.startsWith('/api/public/') ||
    req.path.startsWith('/api/me')
  ) {
    return next();
  }
  let maintenance = null;
  try { maintenance = db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").get(); } catch (e) {}
  if (maintenance && maintenance.value === 'on') {
    const user = req.session ? req.session.user : null;
    if (user && (user.role === 'admin' || user.role === 'superadmin')) return next();
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: 'Sistem sedang dalam pemeliharaan (Maintenance Mode).' });
    }
    return res.redirect('/maintenance.html');
  }
  next();
}
app.use(maintenanceGuard);

// RBAC middleware
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    }
    const userRole = req.session.user.role;
    if (userRole === 'superadmin' || allowedRoles.includes(userRole)) return next();
    return res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini.' });
  };
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
  }
  next();
}

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(path.join(__dirname, 'modules')));
app.use('/plugins', express.static(path.join(__dirname, 'modules'))); // backward compat
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// --- Plugin dispatch (active plugin routes) + management API ---
const pluginRouter = require('./routes/plugins').createPluginRouter(db);
app.use('/api/plugins', (req, res, next) => {
  if (pm.dispatchPluginRoute(req, res)) return;
  next();
});
app.use('/api/plugins', pluginRouter);

// --- API Routes ---

// Konfigurasi publik (tanpa auth) — dipakai halaman login sebelum sesi terbentuk
app.get('/api/public-config', (req, res) => {
  let appName = 'MedRec Starter';
  try {
    const row = db.prepare("SELECT value FROM config WHERE key = 'app_name'").get();
    if (row && row.value) appName = row.value;
  } catch (e) {}
  res.json({ app_name: appName });
});

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT id, username, nama_lengkap, role FROM users WHERE username = ? AND password = ?').get(username, password);
  if (!user) return res.status(401).json({ error: 'Username atau password salah.' });
  req.session.user = user;
  res.json({ user });
});

app.post('/api/logout', (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Config
app.get('/api/config', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT key, value, description FROM config').all();
  const cfg = {};
  rows.forEach((r) => { cfg[r.key] = r.value; });
  res.json({ config: cfg, rows });
});

app.put('/api/config', requireAuth, checkRole(['admin']), (req, res) => {
  const { app_name, maintenance_mode } = req.body || {};
  if (app_name != null) db.prepare("UPDATE config SET value = ? WHERE key = 'app_name'").run(app_name);
  if (maintenance_mode != null) db.prepare("UPDATE config SET value = ? WHERE key = 'maintenance_mode'").run(maintenance_mode);
  res.json({ ok: true });
});

// ==========================================
// Endpoint Publik (tanpa login) — v1.2.0
// ==========================================

// Daftar poli
app.get('/api/public/poli', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, kode, nama, lantai, keterangan FROM poli ORDER BY nama').all();
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Jadwal dokter
app.get('/api/public/jadwal', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT j.id, j.nama_dokter, j.hari, j.jam_buka, j.jam_tutup, j.status,
             p.nama AS nama_poli
      FROM jadwal_dokter j
      JOIN poli p ON p.id = j.poli_id
      WHERE j.status = 'aktif'
      ORDER BY p.nama, j.hari
    `).all();
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pendaftaran pasien publik (tanpa login)
app.post('/api/public/daftar', (req, res) => {
  const body = req.body || {};
  const { nama_lengkap, nik, poli_id, tanggal_kunjungan, keluhan } = body;
  if (!nama_lengkap || !poli_id || !tanggal_kunjungan) {
    return res.status(400).json({ error: 'Nama, poli, dan tanggal kunjungan wajib diisi.' });
  }
  try {
    const info = db.prepare(
      'INSERT INTO pendaftaran_pasien (nama_lengkap, nik, poli_id, tanggal_kunjungan, keluhan) VALUES (?,?,?,?,?)'
    ).run(nama_lengkap, nik || null, poli_id, tanggal_kunjungan, keluhan || null);
    const pendaftaranId = info.lastInsertRowid;

    // Buat antrian otomatis untuk poli tujuan
    const lastAntrian = db.prepare(
      'SELECT MAX(nomor_antrian) AS m FROM antrian WHERE poli_id = ? AND date(created_at) = date("now")'
    ).get(poli_id);
    const nomorAntrian = (lastAntrian.m || 0) + 1;

    db.prepare(
      'INSERT INTO antrian (pendaftaran_id, poli_id, nomor_antrian, status) VALUES (?,?,?,"menunggu")'
    ).run(pendaftaranId, poli_id, nomorAntrian);

    res.status(201).json({ id: pendaftaranId, no_rm: 'RM-' + String(info.lastInsertRowid).padStart(6, '0'), nomor_antrian: nomorAntrian });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Antrian poli (untuk tampilan publik)
app.get('/api/public/antrian', (req, res) => {
  const { poli_id } = req.query;
  try {
    let where = 'WHERE date(a.created_at) = date("now")';
    const params = [];
    if (poli_id) { where += ' AND a.poli_id = ?'; params.push(poli_id); }
    const rows = db.prepare(`
      SELECT a.id, a.nomor_antrian, a.status, a.created_at,
             p.nama_lengkap, p.no_rm,
             pl.nama AS nama_poli
      FROM antrian a
      JOIN pendaftaran_pasien p ON p.id = a.pendaftaran_id
      JOIN poli pl ON pl.id = a.poli_id
      ${where}
      ORDER BY a.nomor_antrian ASC
    `).all(...params);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Kirim pesan pasien ke petugas (tanpa login)
app.post('/api/public/pesan', (req, res) => {
  const body = req.body || {};
  const { nama_pengirim, no_hp, subjek, pesan } = body;
  if (!nama_pengirim || !pesan) {
    return res.status(400).json({ error: 'Nama dan pesan wajib diisi.' });
  }
  try {
    const info = db.prepare(
      'INSERT INTO pesan_pasien (nama_pengirim, no_hp, subjek, pesan) VALUES (?,?,?,?)'
    ).run(nama_pengirim, no_hp || null, subjek || null, pesan);
    res.status(201).json({ id: info.lastInsertRowid, status: 'belum_dibaca' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// Endpoint Staff (butuh login) — v1.2.0
// ==========================================

// Daftar pesan pasien (untuk petugas/admin/superadmin)
app.get('/api/staff/pesan', requireAuth, checkRole(['superadmin', 'admin', 'pendaftaran', 'dokter']), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, nama_pengirim, no_hp, subjek, pesan, status, created_at, dibaca_at
      FROM pesan_pasien
      ORDER BY CASE WHEN status = 'belum_dibaca' THEN 0 ELSE 1 END, created_at DESC
    `).all();
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Tandai pesan sudah dibaca
app.put('/api/staff/pesan/:id/baca', requireAuth, checkRole(['superadmin', 'admin', 'pendaftaran', 'dokter']), (req, res) => {
  const id = req.params.id;
  try {
    const existing = db.prepare('SELECT id FROM pesan_pasien WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
    db.prepare("UPDATE pesan_pasien SET status = 'dibaca', dibaca_at = CURRENT_TIMESTAMP, petugas_id = ? WHERE id = ?")
      .run(req.session.user.id, id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Patients
app.get('/api/patients', requireAuth, (req, res) => {
  const { page, limit, offset, search } = buildPagination(req.query);
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE nama_lengkap LIKE ? OR nik LIKE ? OR no_rm LIKE ?';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM patients ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT id, no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat, created_at FROM patients ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const role = req.session.user.role;
  const data = rows.map((r) => ({
    ...r,
    nik: role === 'admin' ? r.nik : maskingNIK(r.nik)
  }));
  res.json({ data, total, page, limit });
});

app.post('/api/patients', requireAuth, checkRole(['admin', 'pendaftaran']), (req, res) => {
  const body = req.body || {};
  const nama_lengkap = sanitizeInput(body.nama_lengkap);
  const nik = body.nik;
  const tanggal_lahir = body.tanggal_lahir;
  const jenis_kelamin = body.jenis_kelamin;
  const alamat = sanitizeInput(body.alamat);
  if (!nama_lengkap || !nik || !tanggal_lahir || !jenis_kelamin || !alamat) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (!validasiNIK(nik)) return res.status(400).json({ error: 'NIK harus 16 digit.' });
  const lastRow = db.prepare('SELECT MAX(id) AS m FROM patients').get();
  const no_rm = generateNoRM(lastRow ? lastRow.m : 0);
  try {
    const info = db.prepare('INSERT INTO patients (no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat) VALUES (?,?,?,?,?,?)')
      .run(no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat);
    auditLog(db, req.session.user.id, 'CREATE', 'patients', info.lastInsertRowid, { no_rm, nama_lengkap });
    res.status(201).json({ id: info.lastInsertRowid, no_rm });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'NIK atau No RM sudah terdaftar.' });
    res.status(500).json({ error: e.message });
  }
});

// ICD10
app.get('/api/icd10', requireAuth, (req, res) => {
  const search = (req.query.search || '').trim();
  let rows;
  if (search) {
    const like = `%${search}%`;
    rows = db.prepare('SELECT id, code, name_id FROM icd10 WHERE code LIKE ? OR name_id LIKE ? ORDER BY code LIMIT 50').all(like, like);
  } else {
    rows = db.prepare('SELECT id, code, name_id FROM icd10 ORDER BY code LIMIT 50').all();
  }
  res.json({ data: rows });
});

app.post('/api/icd10', requireAuth, checkRole(['admin']), (req, res) => {
  const { code, name_id } = req.body || {};
  if (!code || !name_id) return res.status(400).json({ error: 'Kode dan nama wajib diisi.' });
  try {
    const info = db.prepare('INSERT INTO icd10 (code, name_id) VALUES (?,?)').run(code, name_id);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Kode ICD-10 sudah ada.' });
    res.status(500).json({ error: e.message });
  }
});

// Encounters
app.get('/api/encounters', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.patient_id, e.user_id, e.tanggal_kunjungan, e.keluhan_utama,
           e.diagnosa_icd_code, e.tindakan, e.status,
           p.no_rm, p.nama_lengkap AS nama_pasien, p.jenis_kelamin,
           u.nama_lengkap AS nama_petugas, i.name_id AS diagnosa_nama
    FROM encounters e
    JOIN patients p ON p.id = e.patient_id
    JOIN users u ON u.id = e.user_id
    LEFT JOIN icd10 i ON i.code = e.diagnosa_icd_code
    ORDER BY e.id DESC
  `).all();
  res.json({ data: rows });
});

app.post('/api/encounters', requireAuth, checkRole(['admin', 'pendaftaran']), (req, res) => {
  const { patient_id, keluhan_utama } = req.body || {};
  if (!patient_id || !keluhan_utama) return res.status(400).json({ error: 'Pasien dan keluhan wajib diisi.' });
  const userId = req.session.user.id;
  try {
    const info = db.prepare('INSERT INTO encounters (patient_id, user_id, keluhan_utama) VALUES (?,?,?)').run(patient_id, userId, keluhan_utama);
    hooks.doAction('encounter.created', { id: info.lastInsertRowid, patient_id, keluhan_utama, user_id: userId });
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/encounters/:id', requireAuth, checkRole(['admin', 'dokter']), (req, res) => {
  const { diagnosa_icd_code, tindakan, status } = req.body || {};
  const id = req.params.id;
  const existing = db.prepare('SELECT id FROM encounters WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Kunjungan tidak ditemukan.' });
  const newStatus = status || 'Selesai';
  db.prepare('UPDATE encounters SET diagnosa_icd_code = ?, tindakan = ?, status = ? WHERE id = ?')
    .run(diagnosa_icd_code || null, tindakan || null, newStatus, id);
  hooks.doAction('encounter.updated', { id, diagnosa_icd_code, tindakan, status: newStatus });
  res.json({ ok: true });
});

// Stats
app.get('/api/stats', requireAuth, (req, res) => {
  const totalPasien = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
  const kunjunganHariIni = db.prepare("SELECT COUNT(*) AS c FROM encounters WHERE date(tanggal_kunjungan)=date('now')").get().c;
  const aktif = db.prepare("SELECT COUNT(*) AS c FROM encounters WHERE status='Pemeriksaan'").get().c;
  res.json({ totalPasien, kunjunganHariIni, aktif });
});

// Fallback: serve index.html for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const file = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send('Not found');
});

// --- Plugin system boot ---
pm.ensurePluginDir();
pm.discoverPlugins(db);
pm.loadActivePlugins(db);

app.listen(PORT, () => {
  console.log(`medrec-starter running at http://localhost:${PORT}`);
});