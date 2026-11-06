#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q, def) {
  return new Promise((resolve) => {
    rl.question(`${q} (default: ${def}): `, (ans) => {
      resolve((ans || '').trim() || def);
    });
  });
}

async function main() {
  const projectName = process.argv[2];
  if (!projectName) {
    console.error('Usage: npx medrec-starter <project-name>');
    process.exit(1);
  }
  const target = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(target)) {
    console.error('❌ Folder "' + projectName + '" sudah ada. Gunakan nama lain.');
    process.exit(1);
  }

  const appName = await ask('Nama Klinik / Instansi', 'Klinik Sehat Mandiri');
  const devName = await ask('Nama Pengembang / Mahasiswa', 'Mahasiswa RMIK');
  const port = await ask('Port Aplikasi', '3000');
  rl.close();

  const template = path.resolve(__dirname, '..');
  fs.mkdirSync(target, { recursive: true });

  // Copy template. Lewati artefak lokal & repositori induk supaya proyek baru bersih.
  const exclude = new Set(['node_modules', '.git', '.env', 'package-lock.json', 'handoffs', '.github', 'tmp_simple.js']);
  function copyDir(src, dest) {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      // database.sqlite, database.sqlite-shm, database.sqlite-wal
      if (exclude.has(entry.name) || entry.name.startsWith('database.sqlite')) continue;
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); }
      else { fs.copyFileSync(s, d); }
    }
  }
  copyDir(template, target);

  // Samakan nama paket proyek baru dengan nama folder (template memakai nama paket CLI)
  try {
    const pkgPath = path.join(target, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.name = projectName.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    pkg.author = devName;
    delete pkg.bin;
    delete pkg.repository;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (e) {
    console.warn('⚠️  Tidak bisa menyesuaikan package.json: ' + e.message);
  }

  // Write .env (APP_NAME/DEVELOPER_NAME disuntikkan ke DB saat server pertama kali jalan)
  fs.writeFileSync(path.join(target, '.env'), `PORT=${port}\nSESSION_SECRET=medrec-starter-secret-change-me\nAPP_NAME=${appName}\nDEVELOPER_NAME=${devName}\n`);

  console.log('\n✅ Proyek "' + projectName + '" berhasil dibuat!');
  console.log('   Klinik: ' + appName);
  console.log('   Developer: ' + devName);
  console.log('\nLangkah selanjutnya:');
  console.log('   cd ' + projectName);
  console.log('   npm install');
  console.log('   npm start');
}

main().catch((e) => { console.error(e); process.exit(1); });