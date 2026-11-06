(function () {
  async function api(url, opts = {}) {
    const base = (window.config && window.config.endpoint_active === '1' && window.config.base_url_endpoint) ? window.config.base_url_endpoint.replace(/\/$/, '') : '';
    const res = await fetch(base + url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderSettings(vc) {
    let s = {};
    try { const d = await api('/api/plugins/settings'); s = d.data || {}; } catch (e) { s = {}; }
    const appName = s.app_name || (config.app_name || 'MedRec Starter');
    const baseUrl = s.base_url_endpoint || '';
    const active = s.endpoint_active === '1';
    vc.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">Settings</h2>
      <div class="bg-white rounded-xl shadow-sm p-5 mb-4">
        <div class="font-semibold mb-1">${esc(currentUser.nama_lengkap)}</div>
        <div class="text-sm text-gray-500">Username: ${esc(currentUser.username)} · Role: ${esc(currentUser.role)}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h3 class="font-semibold mb-3">Nama Aplikasi</h3>
        <div class="flex gap-2">
          <input id="appNameInput" value="${esc(appName)}" class="flex-1 border rounded-lg px-3 py-2" />
          <button onclick="saveAppName()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Simpan</button>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h3 class="font-semibold mb-3">Base URL Endpoint (Source of Truth)</h3>
        <p class="text-xs text-gray-500 mb-3">Jika aktif, data (pasien, kunjungan, dll.) diambil dari endpoint ini, bukan SQLite lokal.</p>
        <div class="mb-3">
          <input id="baseUrlInput" value="${esc(baseUrl)}" placeholder="https://api.example.com" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div class="flex items-center gap-3">
          <span>Status: <b id="endpointStatus">${active ? 'Aktif' : 'Nonaktif'}</b></span>
          <button id="toggleEndpointBtn" onclick="toggleEndpoint(${active})" class="px-4 py-2 rounded-lg ${active ? 'bg-red-600' : 'bg-blue-600'} text-white text-sm">${active ? 'Nonaktifkan' : 'Aktifkan'}</button>
        </div>
      </div>
      ${currentUser.role === 'superadmin' ? '<div class="mt-4"><button onclick="switchTab(\'modular\')" class="px-4 py-2 rounded-lg bg-indigo-600 text-white">🧩 Panel Modular</button></div>' : ''}
      <div class="mt-4"><button onclick="logout()" class="px-4 py-2 rounded-lg border text-red-600">Logout</button></div>`;
  }

  async function saveAppName() {
    const val = document.getElementById('appNameInput').value.trim();
    if (!val) { alert('Nama aplikasi tidak boleh kosong.'); return; }
    try {
      await api('/api/plugins/settings', { method: 'PUT', body: JSON.stringify({ app_name: val }) });
      config.app_name = val;
      document.getElementById('clinicName').textContent = val;
      document.getElementById('clinicNameM').textContent = val;
      alert('Nama aplikasi disimpan.');
    } catch (e) { alert(e.message); }
  }
  window.saveAppName = saveAppName;

  async function toggleEndpoint(currentlyActive) {
    const baseUrl = document.getElementById('baseUrlInput').value.trim();
    if (!currentlyActive) {
      if (!baseUrl) { alert('Isi Base URL Endpoint terlebih dahulu.'); return; }
      if (!confirm('Aktifkan endpoint eksternal sebagai source of truth? Data akan diambil dari ' + baseUrl)) return;
      try {
        await api('/api/plugins/settings', { method: 'PUT', body: JSON.stringify({ base_url_endpoint: baseUrl, endpoint_active: true }) });
        config.endpoint_active = '1';
        config.base_url_endpoint = baseUrl;
        alert('Endpoint diaktifkan.');
        renderSettings(document.getElementById('viewContainer'));
      } catch (e) { alert(e.message); }
    } else {
      if (!confirm('Nonaktifkan endpoint eksternal dan kembali ke SQLite lokal?')) return;
      try {
        await api('/api/plugins/settings', { method: 'PUT', body: JSON.stringify({ endpoint_active: false }) });
        config.endpoint_active = '0';
        alert('Endpoint dinonaktifkan. Kembali ke SQLite lokal.');
        renderSettings(document.getElementById('viewContainer'));
      } catch (e) { alert(e.message); }
    }
  }
  window.toggleEndpoint = toggleEndpoint;

  window.Module_settings = { render: (vc) => renderSettings(vc) };
})();