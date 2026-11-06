(function () {
  async function api(url, opts = {}) {
    const base = (window.config && window.config.endpoint_active === '1' && window.config.base_url_endpoint) ? window.config.base_url_endpoint.replace(/\/$/, '') : '';
    const res = await fetch(base + url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderRawatInap(vc) {
    vc.innerHTML = '<div class="text-gray-400">Memuat rawat inap...</div>';
    try {
      const stats = await api('/api/plugins/rawat-inap/stats');
      const beds = await api('/api/plugins/rawat-inap/beds');
      const admissions = await api('/api/plugins/rawat-inap/admissions?status=inap');
      const patients = await api('/api/patients');
      vc.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Rawat Inap</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Total Bed</div><div class="text-3xl font-bold text-blue-600">${stats.totalBeds}</div></div>
          <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Terisi</div><div class="text-3xl font-bold text-red-600">${stats.terisi}</div></div>
          <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Tersedia</div><div class="text-3xl font-bold text-green-600">${stats.tersedia}</div></div>
          <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Pasien Inap</div><div class="text-3xl font-bold text-amber-600">${stats.inap}</div></div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 class="font-semibold mb-3">Pendaftaran Rawat Inap</h3>
          <form id="admitForm" class="space-y-3">
            <select name="patient_id" required class="w-full border rounded-lg px-3 py-2">
              <option value="">-- Pilih Pasien --</option>
              ${patients.data.map(p => `<option value="${p.id}">${esc(p.no_rm)} - ${esc(p.nama_lengkap)}</option>`).join('')}
            </select>
            <select name="bed_id" required class="w-full border rounded-lg px-3 py-2">
              <option value="">-- Pilih Bed Tersedia --</option>
              ${beds.data.filter(b=>b.status==='tersedia').map(b => `<option value="${b.id}">${esc(b.kode_bed)} (${esc(b.nama_kamar)})</option>`).join('')}
            </select>
            <textarea name="diagnosa_masuk" placeholder="Diagnosa masuk" class="w-full border rounded-lg px-3 py-2"></textarea>
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Inapkan</button>
            <div id="admitErr" class="text-red-600 text-sm hidden"></div>
          </form>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-5">
          <h3 class="font-semibold mb-3">Pasien Rawat Inap</h3>
          <div id="inapList"></div>
        </div>`;
      renderAdmissions(admissions.data);
      const form = document.getElementById('admitForm');
      if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        const err = document.getElementById('admitErr');
        err.classList.add('hidden');
        try {
          await api('/api/plugins/rawat-inap/admit', { method: 'POST', body: JSON.stringify(body) });
          alert('Pasien diinapkan.');
          switchTab('plugin:rawat-inap');
        } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); }
      });
    } catch (e) {
      vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
    }
  }

  function renderAdmissions(data) {
    const el = document.getElementById('inapList');
    if (!data || !data.length) { el.innerHTML = '<div class="text-gray-400">Tidak ada pasien inap.</div>'; return; }
    const cards = data.map(a => `
      <div class="p-4 border-b last:border-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-gray-900">${esc(a.nama_pasien)} <span class="text-xs text-gray-400">(${esc(a.no_rm)})</span></div>
            <div class="text-sm text-gray-500">Bed: ${esc(a.kode_bed)} (${esc(a.nama_kamar)})</div>
            <div class="text-sm text-gray-500">Diagnosa: ${esc(a.diagnosa_masuk || '-')}</div>
            <div class="text-xs text-gray-400">Masuk: ${esc(a.tanggal_masuk)}</div>
          </div>
          <button onclick="dischargeInap(${a.id})" class="text-sm text-red-600 font-medium shrink-0">Pulangkan</button>
        </div>
      </div>`).join('');
    el.innerHTML = `<div class="divide-y divide-gray-100">${cards}</div>`;
  }

  async function dischargeInap(id) {
    if (!confirm('Pulangkan pasien ini?')) return;
    try {
      await api('/api/plugins/rawat-inap/admissions/' + id + '/discharge', { method: 'PUT' });
      alert('Pasien dipulangkan.');
      switchTab('plugin:rawat-inap');
    } catch (e) { alert(e.message); }
  }
  window.dischargeInap = dischargeInap;

  window.Module_rawat_inap = { render: (vc) => renderRawatInap(vc) };
})();