CREATE TABLE IF NOT EXISTS ri_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_kamar TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kelas TEXT,
    kapasitas INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ri_beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    kode_bed TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('tersedia','terisi','maintenance')) DEFAULT 'tersedia',
    FOREIGN KEY (room_id) REFERENCES ri_rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ri_admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    bed_id INTEGER NOT NULL,
    tanggal_masuk DATETIME DEFAULT CURRENT_TIMESTAMP,
    tanggal_keluar DATETIME,
    diagnosa_masuk TEXT,
    status TEXT CHECK(status IN ('inap','pulang')) DEFAULT 'inap',
    user_id INTEGER,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    FOREIGN KEY (bed_id) REFERENCES ri_beds(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ri_daily_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_id INTEGER NOT NULL,
    tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
    catatan TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (admission_id) REFERENCES ri_admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed contoh kamar & bed
INSERT OR IGNORE INTO ri_rooms (id, kode_kamar, nama, kelas, kapasitas) VALUES
(1, 'MEL-1', 'Mawar 1', 'Kelas 3', 2),
(2, 'MEL-2', 'Mawar 2', 'Kelas 2', 2);

INSERT OR IGNORE INTO ri_beds (id, room_id, kode_bed, status) VALUES
(1, 1, 'MEL-1-A', 'tersedia'),
(2, 1, 'MEL-1-B', 'tersedia'),
(3, 2, 'MEL-2-A', 'tersedia'),
(4, 2, 'MEL-2-B', 'tersedia');