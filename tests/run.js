const { spawn } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; console.log('  PASS: ' + msg); } else { failed++; console.log('  FAIL: ' + msg); } }

// DB checks
const dbPath = path.join(__dirname, '..', 'database', 'database.sqlite');
// ensure schema applied
const schema = require('fs').readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
const db = new Database(dbPath);
db.exec(schema);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
['config','users','patients','icd10','encounters'].forEach(t => assert(tables.includes(t), 'table ' + t + ' exists'));
assert(db.prepare('SELECT COUNT(*) c FROM users').get().c === 4, '4 seed users');
assert(db.prepare('SELECT COUNT(*) c FROM icd10').get().c >= 6, 'icd10 seed >=6');
assert(db.prepare('SELECT COUNT(*) c FROM patients').get().c >= 2, 'patients seed >=2');
db.close();

// HTTP smoke: start server
const port = 3999;
const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: Object.assign({}, process.env, { PORT: String(port), SESSION_SECRET: 'test' }),
  cwd: path.join(__dirname, '..'),
  stdio: 'ignore'
});

// Poll until the server answers instead of waiting a fixed delay.
// A fixed delay races against startup (plugin loading takes longer on slow machines).
async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      lastError = e;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server tidak siap di ' + url + ' setelah ' + timeoutMs + ' ms' + (lastError ? ' (' + lastError.message + ')' : ''));
}

async function http(pathname, opts) {
  const res = await fetch('http://localhost:' + port + pathname, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  await waitForServer('http://localhost:' + port + '/login.html', 20000);

  // login
  const login = await http('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
  assert(login.status === 200, 'admin login 200');
  const setCookie = login.headers?.get ? login.headers.get('set-cookie') : null;
  const headers = setCookie ? { Cookie: setCookie.split(';')[0] } : {};
  const me = await http('/api/me', { headers });
  assert(me.status === 200 && me.data.user && me.data.user.role === 'admin', '/api/me returns admin');

  const pat = await http('/api/patients', { headers });
  assert(pat.status === 200 && Array.isArray(pat.data.data), '/api/patients list');
  // NIK masking for admin? admin sees full; check masked for petugas
  const login2 = await http('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'petugas', password: 'petugas123' }) });
  const sc2 = login2.headers?.get ? login2.headers.get('set-cookie') : null;
  const h2 = sc2 ? { Cookie: sc2.split(';')[0] } : {};
  const pat2 = await http('/api/patients', { headers: h2 });
  if (pat2.data.data && pat2.data.data.length) {
    const nik = pat2.data.data[0].nik;
    assert(/\*{8,}/.test(nik), 'NIK masked for petugas');
  } else assert(true, 'no patients to check masking');

  // RBAC: petugas POST icd10 -> 403
  const r = await http('/api/icd10', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h2), body: JSON.stringify({ code: 'Z99', name_id: 'test' }) });
  assert(r.status === 403, 'petugas POST icd10 -> 403');

  // maintenance mode
  await http('/api/config', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify({ maintenance_mode: 'on' }) });
  const cfg = await http('/api/config', { headers: h2 });
  // non-admin accessing /api/patients during maintenance -> 503
  const p3 = await http('/api/patients', { headers: h2 });
  assert(p3.status === 503, 'maintenance blocks non-admin API with 503');
  // turn off
  await http('/api/config', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify({ maintenance_mode: 'off' }) });
}

main()
  .catch((e) => {
    console.error('Test error:', e);
    failed++;
  })
  .finally(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    server.kill();
    process.exit(failed > 0 ? 1 : 0);
  });
