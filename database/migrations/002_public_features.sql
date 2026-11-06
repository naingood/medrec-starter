-- Migrasi v1.2.0: Tabel untuk fitur publik (pasien umum)
-- Tabel lama (users, patients, encounters, icd10, config, dll.) dipertahankan.

-- 1. Master Data Poli / Klinik
CREATE TABLE IF NOT EXISTS poli (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    lantai TEXT,
    keterangan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO poli (kode, nama, lantai, keterangan) VALUES
('POL001', 'Poli Umum', '1', 'Pelayanan umum dan pemeriksaan awal'),
('POL002', 'Poli Gigi', '2', 'Pelayanan kesehatan gigi dan mulut'),
('POL003', 'Poli KIA', '1', 'Kesehatan Ibu dan Anak'),
('POL004', 'Poli Penyakit Dalam', '2', 'Penyakit dalam umum');

-- 2. Jadwal Dokter
CREATE TABLE IF NOT EXISTS jadwal_dokter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_dokter TEXT NOT NULL,
    poli_id INTEGER NOT NULL REFERENCES poli(id),
    hari TEXT NOT NULL,
    jam_buka TEXT NOT NULL,
    jam_tutup TEXT NOT NULL,
    status TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'libur')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(poli_id) REFERENCES poli(id) ON DELETE RESTRICT
);

INSERT OR IGNORE INTO jadwal_dokter (nama_dokter, poli_id, hari, jam_buka, jam_tutup, status) VALUES
('Dr. Aris, Sp.RM', 1, 'Senin', '08:00', '14:00', 'aktif'),
('Dr. Aris, Sp.RM', 1, 'Rabu', '08:00', '14:00', 'aktif'),
('Dr. Aris, Sp.RM', 1, 'Jumat', '08:00', '12:00', 'aktif'),
('Dr. Siti, Sp.G', 2, 'Selasa', '08:00', '14:00', 'aktif'),
('Dr. Siti, Sp.G', 2, 'Kamis', '08:00', '14:00', 'aktif'),
('Dr. Budi Santoso', 3, 'Senin', '08:00', '14:00', 'aktif'),
('Dr. Budi Santoso', 3, 'Jumat', '08:00', '12:00', 'aktif'),
('Dr. Citra Dewi', 4, 'Selasa', '08:00', '14:00', 'aktif'),
('Dr. Citra Dewi', 4, 'Kamis', '08:00', '14:00', 'aktif');

-- 3. Pendaftaran Pasien Publik (tanpa login)
CREATE TABLE IF NOT EXISTS pendaftaran_pasien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_lengkap TEXT NOT NULL,
    nik TEXT,
    no_rm TEXT UNIQUE,
    poli_id INTEGER NOT NULL REFERENCES poli(id),
    tanggal_kunjungan DATE NOT NULL,
    keluhan TEXT,
    status TEXT DEFAULT 'terdaftar' CHECK(status IN ('terdaftar', 'diperiksa', 'selesai', 'batal')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(poli_id) REFERENCES poli(id) ON DELETE RESTRICT
);

-- 4. Antrian Poli (untuk tampilan publik)
CREATE TABLE IF NOT EXISTS antrian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pendaftaran_id INTEGER NOT NULL REFERENCES pendaftaran_pasien(id),
    poli_id INTEGER NOT NULL REFERENCES poli(id),
    nomor_antrian INTEGER NOT NULL,
    status TEXT DEFAULT 'menunggu' CHECK(status IN ('menunggu', 'dipanggil', 'selesai', 'batal')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dipanggil_at DATETIME,
    FOREIGN KEY(pendaftaran_id) REFERENCES pendaftaran_pasien(id) ON DELETE CASCADE,
    FOREIGN KEY(poli_id) REFERENCES poli(id) ON DELETE RESTRICT
);

-- 5. Pesan Pasien ke Petugas (untuk publik)
CREATE TABLE IF NOT EXISTS pesan_pasien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pengirim TEXT NOT NULL,
    no_hp TEXT,
    subjek TEXT,
    pesan TEXT NOT NULL,
    petugas_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'belum_dibaca' CHECK(status IN ('belum_dibaca', 'dibaca')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dibaca_at DATETIME,
    FOREIGN KEY(petugas_id) REFERENCES users(id) ON DELETE SET NULL
);
