(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  // ---------- HOME (beranda publik) ----------
  async function renderHome(vc) {
    let poli = [], jadwal = [], appName = 'MedRec Starter';
    try { const cfg = await api('/api/public-config'); if (cfg.app_name) appName = cfg.app_name; } catch (e) {}
    try { poli = (await api('/api/public/poli')).data || []; } catch (e) {}
    try { jadwal = (await api('/api/public/jadwal')).data || []; } catch (e) {}

    const poliCards = poli.map(p => `
      <div class="bg-white rounded-xl shadow-sm p-4">
        <div class="flex items-start justify-between">
          <div>
            <div class="font-semibold text-gray-900">${esc(p.nama)}</div>
            <div class="text-xs text-gray-500">${esc(p.kode)} · ${esc(p.lantai ? 'Lantai ' + p.lantai : '-')}</div>
            ${p.keterangan ? '<div class="text-xs text-gray-400 mt-1">' + esc(p.keterangan) + '</div>' : ''}
          </div>
          <button onclick="switchTab('daftar')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm">Daftar</button>
        </div>
      </div>
    `).join('');

    const jadwalCards = jadwal.map(j => `
      <div class="bg-white rounded-xl shadow-sm p-4 mb-3">
        <div class="flex items-start justify-between">
          <div>
            <div class="font-semibold text-gray-900">${esc(j.nama_dokter)}</div>
            <div class="text-sm text-gray-600">${esc(j.nama_poli)}</div>
            <div class="text-xs text-gray-500">${esc(j.hari)} · ${esc(j.jam_buka)} s.d ${esc(j.jam_tutup)}</div>
          </div>
        </div>
      </div>
    `).join('');

    vc.innerHTML = `
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">${esc(appName)}</h1>
        <p class="text-gray-600 mt-1">Sistem informasi rekam medis sederhana — layanan publik untuk pendaftaran pasien.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-2xl font-bold text-blue-600">${poli.length}</div>
          <div class="text-sm text-gray-500">Poli Tersedia</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="text-2xl font-bold text-indigo-600">${jadwal.length}</div>
          <div class="text-sm text-gray-500">Jadwal Dokter</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-green-600" id="antrianCount">0</div>
            <div class="text-sm text-gray-500">Antrian Menunggu</div>
          </div>
          <div class="text-right">
            <button onclick="switchTab('antrian')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm">Lihat Antrian</button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 class="font-bold text-lg mb-3">Poli Tersedia</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">${poliCards || '<div class="col-span-full text-gray-400">Belum ada data poli.</div>'}</div>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5">
        <h2 class="font-bold text-lg mb-3">Jadwal Dokter</h2>
        <div class="overflow-x-auto">${jadwalCards || '<div class="text-gray-400">Belum ada jadwal.</div>'}</div>
      </div>
    `;
    await updateAntrianCount();
  }

  // ---------- DAFTAR PASIEN PUBLIK ----------
  async function renderDaftar(vc) {
    let poli = [];
    try { poli = (await api('/api/public/poli')).data || []; } catch (e) {}
    const poliOptions = poli.map(p => '<option value="' + p.id + '">' + esc(p.nama) + ' (' + esc(p.kode) + ')' + '</option>').join('');

    vc.innerHTML = `
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Pendaftaran Pasien</h1>
        <p class="text-gray-600 mt-1">Isi formulir berikut untuk mendaftar ke poli yang dituju. Tanpa perlu login.</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <form id="daftarForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input id="daftarNama" type="text" required placeholder="Contoh: Dewi Lestari" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NIK (opsional)</label>
            <input id="daftarNik" type="text" placeholder="16 digit NIK" pattern="\\d{16}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Poli Tujuan</label>
            <select id="daftarPoli" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Pilih poli</option>
              ${poliOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Kunjungan</label>
            <input id="daftarTanggal" type="date" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Keluhan (opsional)</label>
            <textarea id="daftarKeluhan" rows="3" placeholder="Ceritakan keluhan Anda singkat..." class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div id="daftarErr" class="text-red-600 text-sm hidden"></div>
          <div class="flex gap-2 justify-end">
            <button type="button" onclick="switchTab('home')" class="px-4 py-2 rounded-lg border">Batal</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium">Daftar Sekarang</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('daftarForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('daftarErr');
      err.classList.add('hidden');
      const body = {
        nama_lengkap: document.getElementById('daftarNama').value,
        nik: document.getElementById('daftarNik').value || null,
        poli_id: parseInt(document.getElementById('daftarPoli').value),
        tanggal_kunjungan: document.getElementById('daftarTanggal').value,
        keluhan: document.getElementById('daftarKeluhan').value || null
      };
      try {
        const r = await api('/api/public/daftar', { method: 'POST', body: JSON.stringify(body) });
        alert('Pendaftaran berhasil!\nNo RM: ' + r.no_rm + '\nNomor Antrian: ' + r.nomor_antrian);
        switchTab('home');
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      }
    });
  }

  // ---------- JADWAL DOKTER ----------
  async function renderJadwal(vc) {
    let jadwal = [];
    try { jadwal = (await api('/api/public/jadwal')).data || []; } catch (e) {}
    const rows = jadwal.map(j => `
      <tr class="border-t">
        <td class="p-3">${esc(j.nama_dokter)}</td>
        <td class="p-3">${esc(j.nama_poli)}</td>
        <td class="p-3">${esc(j.hari)}</td>
        <td class="p-3">${esc(j.jam_baku)} - ${esc(j.jam_tutup)}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded text-xs ${j.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${esc(j.status)}</span></td>
      </tr>
    `).join('');
    vc.innerHTML = `
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Jadwal Dokter</h1>
        <p class="text-gray-600 mt-1">Lihat jadwal praktek dokter di setiap poli.</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="text-left p-3">Dokter</th><th class="text-left p-3">Poli</th><th class="text-left p-3">Hari</th><th class="text-left p-3">Jam</th><th class="text-left p-3">Status</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="p-5 text-gray-400">Belum ada jadwal.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  // ---------- ANTRIAN POLI ----------
  async function renderAntrian(vc) {
    let antrian = [];
    try { antrian = (await api('/api/public/antrian')).data || []; } catch (e) {}
    const menunggu = antrian.filter(a => a.status === 'menunggu').length;
    const rows = antrian.map(a => `
      <tr class="border-t">
        <td class="p-3 font-mono text-blue-600">#${a.nomor_antrian}</td>
        <td class="p-3">${esc(a.nama_lengkap)}</td>
        <td class="p-3">${esc(a.no_rm || '-')}</td>
        <td class="p-3">${esc(a.nama_poli)}</td>
        <td class="p-3"><span class="px-2 py-0.5 rounded text-xs ${a.status === 'menunggu' ? 'bg-yellow-100 text-yellow-700' : a.status === 'dipanggil' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">${esc(a.status)}</span></td>
      </tr>
    `).join('');
    vc.innerHTML = `
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Antrian Poli</h1>
        <p class="text-gray-600 mt-1">Lihat antrian pasien hari ini per poli.</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">${menunggu}</div>
            <div class="text-sm text-gray-500">Antrian menunggu hari ini</div>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="text-left p-3">No. Antrian</th><th class="text-left p-3">Nama Pasien</th><th class="text-left p-3">No RM</th><th class="text-left p-3">Poli</th><th class="text-left p-3">Status</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="5" class="p-5 text-gray-400">Belum ada antrian hari ini.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  // ---------- render utama ----------
  async function render(vc) {
    const tab = window.currentTab || 'home';
    if (tab === 'home') await renderHome(vc);
    else if (tab === 'daftar') await renderDaftar(vc);
    else if (tab === 'jadwal') await renderJadwal(vc);
    else if (tab === 'antrian') await renderAntrian(vc);
    else vc.innerHTML = '<div class="text-red-600">Halaman tidak ditemukan.</div>';
  }

  async function updateAntrianCount() {
    try {
      const data = await api('/api/public/antrian');
      const count = data.data ? data.data.filter(a => a.status === 'menunggu').length : 0;
      const el = document.getElementById('antrianCount');
      if (el) el.textContent = count;
      const badge = document.getElementById('antrianCountBadge');
      if (badge) {
        if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');
      }
    } catch (e) {}
  }

  window.Module_publik = { render: render };
  window.updateAntrianCount = updateAntrianCount;
})();
