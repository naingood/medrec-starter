require('dotenv').config();
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.sqlite');

// --- Database init ---
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema.sql (idempotent) on boot
const schemaPath = path.join(__dirname, 'database', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Inject nama klinik/pengembang dari .env (hasil CLI wizard) bila ada
if (process.env.APP_NAME) {
  db.prepare("UPDATE config SET value = ? WHERE key = 'app_name'").run(process.env.APP_NAME);
}
db.prepare("INSERT OR IGNORE INTO config (key, value, description) VALUES ('developer_name', ?, 'Nama pengembang')").run(process.env.DEVELOPER_NAME || '');

// --- Helpers ---
function maskNIK(nik) {
  if (!nik || nik.length !== 16) return nik;
  return nik.substring(0, 4) + '************';
}

function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function genNoRM() {
  const row = db.prepare('SELECT MAX(id) AS m FROM patients').get();
  const next = (row && row.m ? row.m : 0) + 1;
  return 'RM-' + String(next + 100).padStart(6, '0');
  // Note: keeps demo-style RM-000101+
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
    req.path.startsWith('/api/me')
  ) {
    return next();
  }
  let maintenance = null;
  try { maintenance = db.prepare("SELECT value FROM config WHERE key = 'maintenance_mode'").get(); } catch (e) {}
  if (maintenance && maintenance.value === 'on') {
    const user = req.session ? req.session.user : null;
    if (user && user.role === 'admin') return next();
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
    if (allowedRoles.includes(userRole)) return next();
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

// --- API Routes ---

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

// Patients
app.get('/api/patients', requireAuth, (req, res) => {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;
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
    nik: role === 'admin' ? r.nik : maskNIK(r.nik)
  }));
  res.json({ data, total, page, limit });
});

app.post('/api/patients', requireAuth, checkRole(['admin', 'pendaftaran']), (req, res) => {
  const { nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat } = req.body || {};
  if (!nama_lengkap || !nik || !tanggal_lahir || !jenis_kelamin || !alamat) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (!/^\d{16}$/.test(nik)) return res.status(400).json({ error: 'NIK harus 16 digit.' });
  const no_rm = genNoRM();
  try {
    const info = db.prepare('INSERT INTO patients (no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat) VALUES (?,?,?,?,?,?)')
      .run(no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat);
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

app.listen(PORT, () => {
  console.log(`medrec-starter running at http://localhost:${PORT}`);
});