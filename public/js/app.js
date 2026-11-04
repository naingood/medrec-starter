let currentUser = null;
let config = {};
let currentTab = 'home';

async function api(url, opts = {}) {
  const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

async function init() {
  try {
    const me = await api('/api/me');
    currentUser = me.user;
  } catch (e) {
    window.location.href = '/login.html';
    return;
  }
  try {
    const c = await api('/api/config');
    config = c.config || {};
  } catch (e) {}
  const name = config.app_name || 'MedRec Starter';
  document.getElementById('clinicName').textContent = name;
  document.getElementById('clinicNameM').textContent = name;
  document.getElementById('userInfo').textContent = currentUser.nama_lengkap + ' (' + currentUser.role + ')';
  document.getElementById('userInfoM').textContent = currentUser.nama_lengkap;
  switchTab('home');
}

function switchTab(tab) {
  currentTab = tab;
  // highlight
  document.querySelectorAll('.navbtn').forEach(b => {
    b.classList.toggle('bg-blue-50', b.dataset.tab === tab);
    b.classList.toggle('text-blue-600', b.dataset.tab === tab);
    b.classList.toggle('font-semibold', b.dataset.tab === tab);
  });
  document.querySelectorAll('.mobnav').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('text-blue-600', active);
    b.classList.toggle('text-gray-500', !active);
  });
  const vc = document.getElementById('viewContainer');
  vc.innerHTML = '<div class="text-gray-400">Memuat...</div>';
  renderView(tab);
}

async function renderView(tab) {
  const vc = document.getElementById('viewContainer');
  try {
    if (tab === 'home') await renderHome(vc);
    else if (tab === 'pasien') await renderPasien(vc);
    else if (tab === 'icd') await renderICD(vc);
    else if (tab === 'daftar') await renderDaftar(vc);
    else if (tab === 'akun') await renderAkun(vc);
  } catch (e) {
    vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
  }
}

async function renderHome(vc) {
  const stats = await api('/api/stats');
  const enc = await api('/api/encounters');
  const active = enc.data.filter(e => e.status === 'Pemeriksaan');
  vc.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Beranda</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Total Pasien</div><div class="text-3xl font-bold text-blue-600">${stats.totalPasien}</div></div>
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Kunjungan Hari Ini</div><div class="text-3xl font-bold text-green-600">${stats.kunjunganHariIni}</div></div>
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Menunggu Pemeriksaan</div><div class="text-3xl font-bold text-amber-600">${stats.aktif}</div></div>
    </div>
    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="font-semibold mb-3">Pasien Menunggu Pemeriksaan</h3>
      ${active.length === 0 ? '<div class="text-gray-400 text-sm">Tidak ada antrian.</div>' :
        `<ul class="divide-y">${active.map(e => `
          <li class="py-3 flex items-center justify-between">
            <div>
              <div class="font-medium">${esc(e.nama_pasien)} <span class="text-xs text-gray-400">(${esc(e.no_rm)})</span></div>
              <div class="text-sm text-gray-500">Keluhan: ${esc(e.keluhan_utama)}</div>
            </div>
            <button onclick="switchTab('daftar')" class="text-sm text-blue-600">Lihat</button>
          </li>`).join('')}</ul>`}
    </div>`;
}

async function renderPasien(vc) {
  vc.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Data Pasien</h2>
      ${currentUser.role !== 'dokter' ? '<button onclick="showAddPatient()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Tambah Pasien</button>' : ''}
    </div>
    <div class="mb-3"><input id="searchPasien" placeholder="Cari nama / NIK / No RM..." class="w-full border border-gray-300 rounded-lg px-3 py-2" oninput="clearTimeout(window._pst); window._pst=setTimeout(searchPasien,300)" /></div>
    <div id="pasienList" class="bg-white rounded-xl shadow-sm"></div>`;
  await loadPasien('');
}

let searchTimer;
function debounce(fn, ms) { let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
async function searchPasien() {
  const q = document.getElementById('searchPasien').value;
  await loadPasien(q);
}

async function loadPasien(q) {
  const data = await api('/api/patients?search=' + encodeURIComponent(q || ''));
  const el = document.getElementById('pasienList');
  if (!data.data.length) { el.innerHTML = '<div class="p-5 text-gray-400">Tidak ada data.</div>'; return; }
  el.innerHTML = `
    <table class="w-full text-sm">
      <thead class="bg-gray-50"><tr>
        <th class="text-left p-3">No RM</th><th class="text-left p-3">Nama</th><th class="text-left p-3">NIK</th><th class="text-left p-3">JK</th><th class="text-left p-3">Tgl Lahir</th>
      </tr></thead>
      <tbody>${data.data.map(p => `
        <tr class="border-t">
          <td class="p-3 font-mono">${esc(p.no_rm)}</td>
          <td class="p-3">${esc(p.nama_lengkap)}</td>
          <td class="p-3 font-mono">${esc(p.nik)}</td>
          <td class="p-3">${esc(p.jenis_kelamin)}</td>
          <td class="p-3">${esc(p.tanggal_lahir)}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function showAddPatient() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-xl w-full max-w-lg p-6">
      <h3 class="font-bold text-lg mb-4">Tambah Pasien Baru</h3>
      <form id="addPatientForm" class="space-y-3">
        <input name="nama_lengkap" placeholder="Nama Lengkap" required class="w-full border rounded-lg px-3 py-2" />
        <input name="nik" placeholder="NIK (16 digit)" required pattern="\\d{16}" class="w-full border rounded-lg px-3 py-2" />
        <input name="tanggal_lahir" type="date" required class="w-full border rounded-lg px-3 py-2" />
        <select name="jenis_kelamin" required class="w-full border rounded-lg px-3 py-2">
          <option value="">Jenis Kelamin</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
        </select>
        <textarea name="alamat" placeholder="Alamat" required class="w-full border rounded-lg px-3 py-2"></textarea>
        <div id="addErr" class="text-red-600 text-sm hidden"></div>
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 rounded-lg border">Batal</button>
          <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white">Simpan</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#addPatientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const err = modal.querySelector('#addErr');
    err.classList.add('hidden');
    try {
      const r = await api('/api/patients', { method: 'POST', body: JSON.stringify(body) });
      modal.remove();
      alert('Pasien tersimpan. No RM: ' + r.no_rm);
      await loadPasien(document.getElementById('searchPasien')?.value || '');
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('hidden');
    }
  });
}

async function renderICD(vc) {
  vc.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Pencarian ICD-10</h2>
      ${currentUser.role === 'admin' ? '<button onclick="showAddICD()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kode</button>' : ''}
    </div>
    <div class="mb-3"><input id="searchICD" placeholder="Cari kode atau nama penyakit..." class="w-full border border-gray-300 rounded-lg px-3 py-2" oninput="clearTimeout(window._ist); window._ist=setTimeout(()=>loadICD(document.getElementById('searchICD').value),300)" /></div>
    <div id="icdList" class="bg-white rounded-xl shadow-sm"></div>`;
  await loadICD('');
}

async function loadICD(q) {
  const data = await api('/api/icd10?search=' + encodeURIComponent(q || ''));
  const el = document.getElementById('icdList');
  if (!data.data.length) { el.innerHTML = '<div class="p-5 text-gray-400">Tidak ada data.</div>'; return; }
  el.innerHTML = `
    <table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="text-left p-3">Kode</th><th class="text-left p-3">Nama Penyakit</th></tr></thead>
      <tbody>${data.data.map(i => `<tr class="border-t"><td class="p-3 font-mono font-semibold">${esc(i.code)}</td><td class="p-3">${esc(i.name_id)}</td></tr>`).join('')}</tbody>
    </table>`;
}

function showAddICD() {
  const code = prompt('Kode ICD-10 (contoh: J02.9):');
  if (!code) return;
  const name = prompt('Nama penyakit (Bahasa Indonesia):');
  if (!name) return;
  api('/api/icd10', { method: 'POST', body: JSON.stringify({ code, name_id: name }) })
    .then(() => { alert('Kode tersimpan.'); loadICD(document.getElementById('searchICD').value); })
    .catch(e => alert(e.message));
}

async function renderDaftar(vc) {
  const patients = await api('/api/patients');
  const encounters = await api('/api/encounters');
  vc.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Pendaftaran Kunjungan</h2>
    ${currentUser.role !== 'dokter' ? `
    <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h3 class="font-semibold mb-3">Daftarkan Kunjungan Baru</h3>
      <form id="regForm" class="space-y-3">
        <select name="patient_id" required class="w-full border rounded-lg px-3 py-2">
          <option value="">-- Pilih Pasien --</option>
          ${patients.data.map(p => `<option value="${p.id}">${esc(p.no_rm)} - ${esc(p.nama_lengkap)}</option>`).join('')}
        </select>
        <textarea name="keluhan_utama" placeholder="Keluhan utama (anamnesis)" required class="w-full border rounded-lg px-3 py-2"></textarea>
        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Daftarkan</button>
        <div id="regErr" class="text-red-600 text-sm hidden"></div>
      </form>
    </div>` : ''}
    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="font-semibold mb-3">Riwayat Kunjungan</h3>
      <div id="encList"></div>
    </div>`;
  renderEncounters(encounters.data);
  const form = document.getElementById('regForm');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const err = document.getElementById('regErr');
    err.classList.add('hidden');
    try {
      await api('/api/encounters', { method: 'POST', body: JSON.stringify(body) });
      alert('Kunjungan terdaftar.');
      switchTab('daftar');
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
  });
}

function renderEncounters(data) {
  const el = document.getElementById('encList');
  if (!data.length) { el.innerHTML = '<div class="text-gray-400">Belum ada kunjungan.</div>'; return; }
  el.innerHTML = `
    <table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="text-left p-3">Tanggal</th><th class="text-left p-3">Pasien</th><th class="text-left p-3">Keluhan</th><th class="text-left p-3">Diagnosa</th><th class="text-left p-3">Status</th><th class="text-left p-3">Aksi</th></tr></thead>
      <tbody>${data.map(e => `
        <tr class="border-t">
          <td class="p-3 text-xs">${esc(e.tanggal_kunjungan)}</td>
          <td class="p-3">${esc(e.nama_pasien)}</td>
          <td class="p-3">${esc(e.keluhan_utama)}</td>
          <td class="p-3">${esc(e.diagnosa_icd_code || '-')} ${e.diagnosa_nama ? '('+esc(e.diagnosa_nama)+')' : ''}</td>
          <td class="p-3"><span class="px-2 py-1 rounded text-xs ${e.status==='Selesai'?'bg-green-100 text-green-700':e.status==='Dirujuk'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}">${esc(e.status)}</span></td>
          <td class="p-3">${(currentUser.role==='admin'||currentUser.role==='dokter') && e.status==='Pemeriksaan' ? `<button onclick="showDiagnosa(${e.id})" class="text-blue-600 text-xs">Periksa</button>` : ''}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function showDiagnosa(id) {
  const code = prompt('Kode ICD-10 (contoh: J02.9):');
  if (code === null) return;
  const tindakan = prompt('Catatan tindakan/terapi:');
  if (tindakan === null) return;
  const status = confirm('Tandai Selesai? (Cancel = Dirujuk)') ? 'Selesai' : 'Dirujuk';
  api('/api/encounters/' + id, { method: 'PUT', body: JSON.stringify({ diagnosa_icd_code: code, tindakan, status }) })
    .then(() => { alert('Tersimpan.'); switchTab('daftar'); })
    .catch(e => alert(e.message));
}

async function renderAkun(vc) {
  let maint = config.maintenance_mode || 'off';
  try { const c = await api('/api/config'); maint = c.config.maintenance_mode; config = c.config; } catch(e){}
  vc.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Akun & Pengaturan</h2>
    <div class="bg-white rounded-xl shadow-sm p-5 mb-4">
      <div class="font-semibold">${esc(currentUser.nama_lengkap)}</div>
      <div class="text-sm text-gray-500">Username: ${esc(currentUser.username)} · Role: ${esc(currentUser.role)}</div>
    </div>
    ${currentUser.role === 'admin' ? `
    <div class="bg-white rounded-xl shadow-sm p-5">
      <h3 class="font-semibold mb-3">Mode Maintenance</h3>
      <div class="flex items-center gap-3">
        <span>Status: <b id="maintStatus">${esc(maint)}</b></span>
        <button onclick="toggleMaintenance()" class="px-4 py-2 rounded-lg ${maint==='on'?'bg-red-600':'bg-blue-600'} text-white text-sm">${maint==='on'?'Matikan':'Aktifkan'} Maintenance</button>
      </div>
    </div>` : ''}
    <div class="mt-4"><button onclick="logout()" class="px-4 py-2 rounded-lg border text-red-600">Logout</button></div>`;
}

async function toggleMaintenance() {
  const cur = config.maintenance_mode || 'off';
  const next = cur === 'on' ? 'off' : 'on';
  await api('/api/config', { method: 'PUT', body: JSON.stringify({ maintenance_mode: next }) });
  config.maintenance_mode = next;
  switchTab('akun');
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch(e){}
  window.location.href = '/login.html';
}

window.addEventListener('DOMContentLoaded', init);
// allow searchPasien defined globally
window.searchPasien = searchPasien;