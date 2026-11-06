const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3(dbPath);

function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const folder = path.join(__dirname, 'migrations');
  if (!fs.existsSync(folder)) { console.log('No migrations folder.'); return; }
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.sql')).sort();
  let count = 0;
  for (const file of files) {
    const row = db.prepare('SELECT name FROM migrations WHERE name = ?').get(file);
    if (!row) {
      const sql = fs.readFileSync(path.join(folder, file), 'utf8');
      try {
        db.exec(sql);
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log('✅ Migrasi berhasil: ' + file);
        count++;
      } catch (e) {
        console.error('❌ Gagal migrasi ' + file + ': ' + e.message);
      }
    }
  }
  if (count === 0) console.log('Tidak ada migrasi baru.');
}

runMigrations();