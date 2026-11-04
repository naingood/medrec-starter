# 📐 Modelling & Database Design Document: medrec-starter

Dokumen ini berisi rancangan pemodelan sistem rekam medis **medrec-starter** berbasis UML (Unified Modeling Language), DFD (Data Flow Diagram), serta pemodelan basis data terstruktur (ERD & Konseptual SQLite).

---

## 1. Use Case Diagram

Use Case Diagram menggambarkan interaksi antara aktor (Admin, Petugas Pendaftaran, Dokter) dengan sistem **medrec-starter**.

```
+-------------------------------------------------------------------------+
|                           medrec-starter System                         |
|                                                                         |
|  (( Login / Authenticate )) <--------------------+                      |
|                                                  |                      |
|  (( Kelola Konfigurasi & Maintenance )) <---+   |                      |
|  (( Kelola Master User & RBAC )) <----------|---+--- ( Admin )          |
|  (( Kelola Master Data ICD-10 )) <----------+    |                      |
|                                                  |                      |
|  (( Kelola Data Pasien )) <----------------------+--- ( Petugas )       |
|  (( Registrasi Kunjungan Pasien )) <-------------+    Pendaftaran       |
|                                                  |                      |
|  (( Input Diagnosa & Catatan Medis )) <----------+--- ( Dokter )        |
|  (( Lihat Rekam Medis Pasien )) <----------------+                      |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.1 Matriks Otorisasi Aktor (RBAC Use Case)

| Use Case | Admin | Petugas Pendaftaran | Dokter |
| :--- | :---: | :---: | :---: |
| Authenticate / Login | ✅ | ✅ | ✅ |
| Kelola Config & Maintenance Mode | ✅ | ❌ | ❌ |
| Kelola Data Pasien (CRUD) | ✅ | ✅ | ❌ (View Only) |
| Registrasi Kunjungan Pasien | ✅ | ✅ | ❌ |
| Cari Kode ICD-10 | ✅ | ✅ | ✅ |
| Tambah Master ICD-10 | ✅ | ❌ | ❌ |
| Input Diagnosa & Tindakan | ✅ | ❌ | ✅ |
| Lihat Riwayat Rekam Medis | ✅ | ✅ | ✅ |

---

## 2. Data Flow Diagram (DFD)

### 2.1 DFD Level 0 (Context Diagram)

Context Diagram mendefinisikan batasan sistem dan entitas luar yang berinteraksi langsung.

```
                  +--------------------------+
                  |  Petugas Pendaftaran     |
                  +--------------------------+
                    |                      ^
  Data Pasien Baru, |                      | Struk Pendaftaran,
  Pendaftaran       v                      | Informasi Pasien
            +----------------------------------+
            |                                  | <--- Data Diagnosa (ICD-10),
( Admin ) ->|   0.0 SISTEM REKAM MEDIS         |      Tindakan Medis
Config,     |       (medrec-starter)           | ---> Status Pasien,
Master User |                                  |      ( Dokter )
            +----------------------------------+
```

### 2.2 DFD Level 1 (Proses Utama)

```
[ Entitas: User ] ---> ( 1.0 Otentikasi & Session ) <---> [ DB: users ]
                                 |
                                 v
[ Petugas ] ---------> ( 2.0 Kelola Data Pasien ) <----> [ DB: patients ]
                                 |
                                 v
[ Petugas ] ---------> ( 3.0 Pendaftaran Kunjungan ) <--> [ DB: encounters ]
                                 |
                                 v
[ Dokter ] ----------> ( 4.0 Pelayanan & Diagnosa ) <--> [ DB: encounters ]
                                                            ^
                                                            | (Fetch Kode)
                                                         [ DB: icd10 ]

[ Admin ] -----------> ( 5.0 Pengaturan Sistem ) <-----> [ DB: config ]
```

---

## 3. UML Class Diagram

Class Diagram menunjukkan struktur kelas, variabel, dan relasi antar-entitas pada sistem `medrec-starter`.

```
+------------------------------------+          +------------------------------------+
|               User                 |          |              Patient               |
+------------------------------------+          +------------------------------------+
| - id: Integer                      |          | - id: Integer                      |
| - username: String                 |          | - no_rm: String                    |
| - password: String                 |          | - nama_lengkap: String             |
| - nama_lengkap: String             |          | - nik: String                      |
| - role: Enum                       |          | - tanggal_lahir: String            |
+------------------------------------+          | - jenis_kelamin: Enum              |
| + login(): Boolean                 |          | - alamat: String                   |
| + checkPermission(): Boolean       |          +------------------------------------+
+------------------------------------+          | + getMaskedNIK(): String           |
                  | 1                           +------------------------------------+
                  |                                               | 1
                  |                                               |
                  | 0..* (Melayani)                               | 0..* (Memiliki)
                  v                                               v
+------------------------------------------------------------------------------------+
|                                     Encounter                                      |
+------------------------------------------------------------------------------------+
| - id: Integer                                                                      |
| - patient_id: Integer (FK)                                                         |
| - user_id: Integer (FK)                                                            |
| - tanggal_kunjungan: DateTime                                                      |
| - keluhan_utama: String                                                            |
| - diagnosa_icd_code: String (FK)                                                   |
| - tindakan: String                                                                 |
| - status: Enum('Pemeriksaan', 'Selesai', 'Dirujuk')                                |
+------------------------------------------------------------------------------------+
| + updateDiagnosa(): Void                                                           |
| + completeEncounter(): Void                                                        |
+------------------------------------------------------------------------------------+
                                          | 0..*
                                          |
                                          v 1 (Rujukan Kode)
                        +------------------------------------+
                        |               ICD10                |
                        +------------------------------------+
                        | - id: Integer                      |
                        | - code: String                     |
                        | - name_id: String                  |
                        +------------------------------------+
                        | + searchByCodeOrName(): List       |
                        +------------------------------------+
```

---

## 4. Entity Relationship Diagram (ERD)

ERD menggambarkan pemodelan hubungan data fisik di dalam basis data **SQLite 3**.

```
+----------------+              +-------------------+
|     USERS      |              |     PATIENTS      |
+----------------+              +-------------------+
| PK | id        |              | PK | id           |
|    | username  |              |    | no_rm        |
|    | password  |              |    | nama_lengkap |
|    | role      |              |    | nik          |
+----------------+              +-------------------+
        | 1                            | 1
        |                              |
        | 1:N                          | 1:N
        v                              v
+---------------------------------------------------+            +-------------------+
|                    ENCOUNTERS                     |            |       ICD10       |
+---------------------------------------------------+            +-------------------+
| PK   | id                                         |            | PK | id           |
| FK1  | user_id -----------------------------------+            | UK | code         |<---+
| FK2  | patient_id --------------------------------+            |    | name_id      |    |
| FK3  | diagnosa_icd_code ---------------------------------------------------------------+
|      | keluhan_utama                              |                 +-------------------+
|      | status                                     |                 |      CONFIG       |
+---------------------------------------------------+                 +-------------------+
                                                                      | PK | key          |
                                                                      |    | value        |
                                                                      +-------------------+
```

---

## 5. DDL (Data Definition Language) & Inisialisasi Database

Berikut adalah script SQL murni (`database/schema.sql`) yang siap dieksekusi oleh SQLite saat proses setup CLI.

```sql
-- Disable Foreign Keys temporer saat pembuatan skema
PRAGMA foreign_keys = OFF;

-- 1. TABEL CONFIG
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- 2. TABEL USERS (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'pendaftaran', 'dokter')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL PATIENTS
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

-- 4. TABEL ICD10
CREATE TABLE IF NOT EXISTS icd10 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name_id TEXT NOT NULL
);

-- 5. TABEL ENCOUNTERS
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (diagnosa_icd_code) REFERENCES icd10(code) ON DELETE SET NULL
);

-- Enable Foreign Keys kembali
PRAGMA foreign_keys = ON;
```