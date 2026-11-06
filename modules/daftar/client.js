(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

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
    const encCards = data.map(e => `
      <div class="p-4 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-xs text-gray-400">${esc(e.tanggal_kunjungan)}</div>
            <div class="font-medium text-gray-900">${esc(e.nama_pasien)}</div>
          </div>
          <span class="shrink-0 px-2 py-1 rounded text-xs ${e.status==='Selesai'?'bg-green-100 text-green-700':e.status==='Dirujuk'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}">${esc(e.status)}</span>
        </div>
        <div class="text-sm text-gray-600"><span class="text-gray-400">Keluhan:</span> ${esc(e.keluhan_utama)}</div>
        <div class="text-sm text-gray-600"><span class="text-gray-400">Diagnosa:</span> ${esc(e.diagnosa_icd_code || '-')} ${e.diagnosa_nama ? '('+esc(e.diagnosa_nama)+')' : ''}</div>
        ${(currentUser.role==='admin'||currentUser.role==='dokter') && e.status==='Pemeriksaan' ? `<div><button onclick="showDiagnosa(${e.id})" class="text-blue-600 text-sm font-medium">Periksa</button></div>` : ''}
      </div>`).join('');
    el.innerHTML = `
      <div class="hidden md:block overflow-x-auto">
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
        </table>
      </div>
      <div class="md:hidden divide-y divide-gray-100">${encCards}</div>`;
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
  window.showDiagnosa = showDiagnosa;

  window.Module_daftar = { render: (vc) => renderDaftar(vc) };
})();