#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q, def) {
  return new Promise((resolve) => {
    rl.question(`${q}${def ? ` (default: ${def})` : ''}: `, (ans) => {
      resolve((ans || '').trim() || def || '');
    });
  });
}

async function askRequired(q, def) {
  for (;;) {
    const answer = await ask(q, def);
    if (answer) return answer;
    console.log('   ↳ Wajib diisi.');
  }
}

function fail(message, hint) {
  console.error('\n❌ ' + message);
  if (hint) console.error('   ' + hint);
  process.exit(1);
}

function printHelp() {
  console.log('MedRec Starter — membuat fondasi aplikasi rekam medis.\n');
  console.log('Cara pakai:');
  console.log('  npx medrec-starter <nama-folder>   buat proyek di folder baru');
  console.log('  npx medrec-starter .               buat proyek di folder kosong saat ini');
  console.log('  npx medrec-starter                 tanya nama folder lebih dulu');
}

async function main() {
  const arg = process.argv[2];
  if (arg === '-h' || arg === '--help') {
    printHelp();
    rl.close();
    return;
  }

  const isInPlace = arg === '.';
  let projectName = arg;
  if (!projectName) {
    console.log('MedRec Starter — membuat fondasi aplikasi rekam medis.\n');
    projectName = await askRequired('Nama folder proyek', 'klinik-saya');
  }

  const target = isInPlace ? process.cwd() : path.resolve(process.cwd(), projectName);
  const label = isInPlace ? 'di folder ini' : 'dengan nama "' + projectName + '"';

  if (isInPlace) {
    const entries = fs.readdirSync(target).filter((name) => name !== '.git');
    if (entries.length > 0) {
      fail('Folder ini tidak kosong (' + entries.length + ' item: ' + entries.slice(0, 5).join(', ') + ').',
        'Kosongkan folder dulu, atau jalankan tanpa ".": npx medrec-starter klinik-saya');
    }
  } else if (fs.existsSync(target)) {
    fail('Folder "' + projectName + '" sudah ada.',
      'Pakai nama lain, atau jalankan di folder kosong: npx medrec-starter .');
  }

  const template = path.resolve(__dirname, '..');
  if (path.resolve(template) === path.resolve(target)) {
    fail('Tidak bisa membuat proyek di dalam folder template.', 'Jalankan dari folder lain.');
  }

  const appName = await ask('Nama Klinik / Instansi', 'Klinik Sehat Mandiri');
  const devName = await ask('Nama Pengembang / Mahasiswa', 'Mahasiswa RMIK');
  const port = await ask('Port Aplikasi', '3000');
  rl.close();

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
    pkg.name = path.basename(target).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    pkg.author = devName;
    delete pkg.bin;
    delete pkg.repository;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (e) {
    console.warn('⚠️  Tidak bisa menyesuaikan package.json: ' + e.message);
  }

  // Write .env (APP_NAME/DEVELOPER_NAME disuntikkan ke DB saat server pertama kali jalan)
  fs.writeFileSync(path.join(target, '.env'), `PORT=${port}\nSESSION_SECRET=medrec-starter-secret-change-me\nAPP_NAME=${appName}\nDEVELOPER_NAME=${devName}\n`);

  console.log('\n✅ Proyek ' + label + ' berhasil dibuat!');
  console.log('   Klinik: ' + appName);
  console.log('   Developer: ' + devName);
  console.log('\nLangkah selanjutnya:');
  if (!isInPlace) console.log('   cd ' + projectName);
  console.log('   npm install');
  console.log('   npm start');
}

main().catch((e) => { console.error(e); process.exit(1); });
