(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

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

  async function loadPasien(q) {
    const data = await api('/api/patients?search=' + encodeURIComponent(q || ''));
    const el = document.getElementById('pasienList');
    if (!data.data.length) { el.innerHTML = '<div class="p-5 text-gray-400">Tidak ada data.</div>'; return; }
    const patientCards = data.data.map(p => `
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-mono text-xs text-blue-600">${esc(p.no_rm)}</div>
            <div class="font-medium text-gray-900 truncate">${esc(p.nama_lengkap)}</div>
          </div>
          <span class="shrink-0 px-2 py-0.5 rounded text-xs ${p.jenis_kelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}">${esc(p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan')}</span>
        </div>
        <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          <div><dt class="text-gray-400">NIK</dt><dd class="font-mono">${esc(p.nik)}</dd></div>
          <div><dt class="text-gray-400">Tgl Lahir</dt><dd>${esc(p.tanggal_lahir)}</dd></div>
        </dl>
      </div>`).join('');
    el.innerHTML = `
      <div class="hidden md:block overflow-x-auto">
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
        </table>
      </div>
      <div class="md:hidden divide-y divide-gray-100">${patientCards}</div>`;
  }

  async function searchPasien() {
    const q = document.getElementById('searchPasien').value;
    await loadPasien(q);
  }
  window.searchPasien = searchPasien;

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
  window.showAddPatient = showAddPatient;

  window.Module_pasien = { render: (vc) => renderPasien(vc) };
})();