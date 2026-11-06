(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderAddons(vc) {
    vc.innerHTML = '<div class="text-gray-400">Memuat Add Ons...</div>';
    try {
      const data = await api('/api/plugins/addons');
      const rows = data.data || [];
      vc.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Add Ons (Hook/Event)</h2>
        <p class="text-gray-500 text-sm mb-4">Daftar modul aktif dan hook/event yang disediakan. Add-on dapat subscribe ke event ini.</p>
        ${rows.length === 0 ? '<div class="text-gray-400">Tidak ada modul dengan event terdaftar.</div>' : ''}
        <div class="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50"><tr><th class="text-left p-3">Modul</th><th class="text-left p-3">Hook/Event</th><th class="text-left p-3">Deskripsi</th></tr></thead>
            <tbody>
              ${rows.map(r => (r.events && r.events.length ? r.events.map(e => `
                <tr class="border-t">
                  <td class="p-3 font-medium">${esc(r.slug)}</td>
                  <td class="p-3 font-mono text-blue-600">${esc(e.name)}</td>
                  <td class="p-3 text-gray-600">${esc(e.description || '-')}</td>
                </tr>`).join('') : `
                <tr class="border-t">
                  <td class="p-3 font-medium">${esc(r.slug)}</td>
                  <td class="p-3 text-gray-400">-</td>
                  <td class="p-3 text-gray-400">Tidak ada event terdaftar</td>
                </tr>`)).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
    }
  }

  window.Module_addons = { render: (vc) => renderAddons(vc) };
})();