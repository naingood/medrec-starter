(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

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
            <li class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium">${esc(e.nama_pasien)} <span class="text-xs text-gray-400">(${esc(e.no_rm)})</span></div>
                <div class="text-sm text-gray-500 break-words">Keluhan: ${esc(e.keluhan_utama)}</div>
              </div>
              <button onclick="switchTab('daftar')" class="self-start sm:self-auto text-sm text-blue-600 shrink-0">Lihat</button>
            </li>`).join('')}</ul>`}
      </div>${(currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) ? `
      <div class="bg-white rounded-xl shadow-sm p-5 mt-6">
        <h3 class="font-semibold mb-3">Tampil Menu (Bottom Nav)</h3>
        <p class="text-xs text-gray-400 mb-3">Aktifkan maksimal 4 modul untuk ditampilkan di bottom menu.</p>
        <div id="menuSettings" class="text-sm text-gray-500">Memuat...</div>
      </div>` : ''}`;
  }


  async function loadMenuSettings() {
    const el = document.getElementById('menuSettings');
    if (!el) return;
    try {
      const data = await api('/api/plugins/menu-candidates');
      const items = data.data || [];
      const activeCount = items.filter(i => i.menu_active).length;
      el.innerHTML = '<div class="mb-2 text-xs text-gray-400">Menu aktif: ' + activeCount + '/4</div>' +
        items.map(i => `
          <div class="flex items-center justify-between py-2 border-b last:border-0">
            <div class="min-w-0">
              <div class="font-medium text-gray-900">${esc(i.name)}</div>
              <div class="text-xs text-gray-400 truncate">${esc(i.description || '')}</div>
            </div>
            <label class="inline-flex items-center cursor-pointer ml-3">
              <input type="checkbox" ${i.menu_active ? 'checked' : ''} onchange="toggleMenu('${esc(i.slug)}', this.checked)" class="sr-only peer">
              <div class="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full relative transition"><span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4"></span></div>
            </label>
          </div>`).join('');
    } catch (e) { el.innerHTML = '<div class="text-red-600">' + esc(e.message) + '</div>'; }
  }
  async function toggleMenu(slug, active) {
    try {
      await api('/api/plugins/' + slug + '/menu', { method: 'POST', body: JSON.stringify({ active: !!active }) });
      await renderBottomNav();
      await loadMenuSettings();
    } catch (e) { alert(e.message); await loadMenuSettings(); }
  }
  window.toggleMenu = toggleMenu;

  const homeModule = new ModuleBuilder('home')
    .screen('main', async (vc) => { await renderHome(vc); loadMenuSettings(); })
    .fn('refreshStats', async () => { /* hook: dapat dipanggil add-on */ })
    .addon('welcome-banner', (mod) => {
      const originalRender = mod.render;
      mod.render = async (vc) => { await originalRender(vc); const banner = document.createElement('div'); banner.className = 'mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm'; banner.textContent = 'Add-on: Selamat datang di Modul Beranda'; vc.appendChild(banner); };
    })
    .build();
  window.Module_home = homeModule;
})();