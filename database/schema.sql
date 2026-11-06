-- ==========================================
-- MEDREC-STARTER: SQLite Database Schema
-- ==========================================

-- 1. Tabel Konfigurasi Global Aplikasi & Maintenance Mode
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- Seed Data Pengaturan Awal
INSERT OR IGNORE INTO config (key, value, description) VALUES 
('app_name', 'Klinik Sehat Mandiri', 'Nama instansi atau klinik'),
('app_version', '1.0.0', 'Versi sistem rekam medik'),
('maintenance_mode', 'off', 'Status pemeliharaan sistem (on/off)');


-- 2. Tabel Pengguna & Hak Akses (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT CHECK(role IN ('superadmin', 'admin', 'pendaftaran', 'dokter')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Akun Demo RBAC
-- Password default (untuk level starter disimpan plain text agar mudah dipelajari mahasiswa)
INSERT OR IGNORE INTO users (id, username, password, nama_lengkap, role) VALUES 
(1, 'admin', 'admin123', 'Dr. Aris, Sp.RM (Administrator)', 'admin'),
(2, 'petugas', 'petugas123', 'Siti Rahma, A.Md.RMIK (Pendaftaran)', 'pendaftaran'),
(3, 'dokter', 'dokter123', 'Dr. Budi Santoso (Dokter Pemeriksa)', 'dokter'),
(4, 'superadmin', 'superadmin123', 'Super Administrator Sistem', 'superadmin');


-- 3. Tabel Master Data Pasien
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_rm TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    nik TEXT UNIQUE NOT NULL,
    tanggal_lahir TEXT NOT NULL,
    jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
    alamat TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Contoh Pasien
INSERT OR IGNORE INTO patients (id, no_rm, nama_lengkap, nik, tanggal_lahir, jenis_kelamin, alamat) VALUES 
(1, 'RM-000101', 'Dewi Lestari', '3507123456780001', '1995-05-14', 'P', 'Jl. Borobudur No. 12, Malang'),
(2, 'RM-000102', 'Ahmad Fauzi', '3507123456780002', '1988-11-20', 'L', 'Jl. Ijen Boulevard No. 45, Malang');


-- 4. Tabel Master Data ICD-10 (Diagnosa Penyakit)
CREATE TABLE IF NOT EXISTS icd10 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_id TEXT NOT NULL
);

-- Seed Data Contoh Diagnosa ICD-10 yang Sering Digunakan
INSERT OR IGNORE INTO icd10 (code, name_id) VALUES 
('A09', 'Diare dan gastroenteritis diduga infeksius'),
('J02.9', 'Faringitis akut, tidak spesifik (Radang Tenggorokan)'),
('J18.9', 'Pneumonia, tidak spesifik (Paru-paru basah)'),
('I10', 'Hipertensi esensial (Tekanan darah tinggi)'),
('E11', 'Diabetes melitus tipe 2 (Kencing manis)'),
('K30', 'Dispepsia (Maag / Gangguan pencernaan)');


-- 5. Tabel Pendaftaran & Rekam Medis Kunjungan (Encounters)
CREATE TABLE IF NOT EXISTS encounters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    tanggal_kunjungan DATETIME DEFAULT CURRENT_TIMESTAMP,
    keluhan_utama TEXT NOT NULL,
    diagnosa_icd_code TEXT,
    tindakan TEXT,
    status TEXT CHECK(status IN ('Pemeriksaan', 'Selesai', 'Dirujuk')) DEFAULT 'Pemeriksaan',
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Seed Data Contoh Kunjungan
INSERT OR IGNORE INTO encounters (patient_id, user_id, keluhan_utama, diagnosa_icd_code, tindakan, status) VALUES 
(1, 3, 'Nyeri ulu hati dan mual sejak kemarin', 'K30', 'Diberi obat antasida dan istirahat', 'Selesai'),
(2, 3, 'Kepala pusing dan tengkuk terasa berat', 'I10', 'Pemeriksaan tensi & edukasi pola makan', 'Selesai');

-- 6. Tabel Registry Plugin Modular
CREATE TABLE IF NOT EXISTS plugins (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    description TEXT,
    author TEXT,
    status TEXT CHECK(status IN ('inactive', 'active', 'error')) DEFAULT 'inactive',
    core INTEGER DEFAULT 0,
    menu_active INTEGER DEFAULT 0,
    installed_at DATETIME,
    activated_at DATETIME,
    deactivated_at DATETIME,
    config TEXT,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_migrations (
    slug TEXT NOT NULL,
    file TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (slug, file),
    FOREIGN KEY (slug) REFERENCES plugins(slug) ON DELETE CASCADE
);

-- 7. Tabel Settings Aplikasi
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value) VALUES
('app_name', 'Klinik Sehat Mandiri'),
('base_url_endpoint', ''),
('endpoint_active', '0');

-- 8. Tabel Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    aksi TEXT NOT NULL,
    entitas TEXT,
    entitas_id INTEGER,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);