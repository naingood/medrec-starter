(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderModular(vc) {
    vc.innerHTML = '<div class="text-gray-400">Memuat panel modular...</div>';
    try {
      await api('/api/plugins/scan').catch(() => ({}));
      const data = await api('/api/plugins');
      const plugins = (data.data || []).filter(p => !p.core);
      vc.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold">Panel Modular (Superadmin)</h2>
          <button onclick="renderModular(document.getElementById('viewContainer'))" class="text-sm text-blue-600">↻ Refresh</button>
        </div>
        ${plugins.length === 0 ? '<div class="text-gray-400">Tidak ada plugin. Tambahkan folder ke /modules lalu klik Scan.</div>' : ''}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${plugins.map(p => `
            <div class="bg-white rounded-xl shadow-sm p-5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-semibold text-gray-900">${esc(p.name)} <span class="text-xs text-gray-400">v${esc(p.version || '-')}</span></div>
                  <div class="text-xs text-gray-500 mt-0.5">${esc(p.description || '')}</div>
                  <div class="text-xs text-gray-400 mt-1">slug: ${esc(p.slug)} · author: ${esc(p.author || '-')}</div>
                </div>
                <span class="px-2 py-1 rounded text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}">${esc(p.status)}</span>
              </div>
              ${p.last_error ? `<div class="mt-2 text-xs text-red-600 break-words">Error: ${esc(p.last_error)}</div>` : ''}
              <div class="mt-3 flex flex-wrap gap-2">
                ${p.status !== 'active' ? `<button onclick="pluginAction('activate','${esc(p.slug)}')" class="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm">Aktifkan</button>` : `<button onclick="pluginAction('deactivate','${esc(p.slug)}')" class="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm">Nonaktifkan</button>`}
                <button onclick="pluginAction('delete','${esc(p.slug)}')" class="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">Hapus</button>
                ${p.status === 'active' ? `<button onclick="switchTab('plugin:${esc(p.slug)}')" class="px-3 py-1.5 rounded-lg border text-sm">Buka</button>` : ''}
              </div>
            </div>`).join('')}
        </div>
        <div class="mt-6 text-xs text-gray-400">Modul lokal terbaca dari folder <code>/modules</code>. Tambah folder modul lalu klik Refresh/Scan.</div>`;
    } catch (e) {
      vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
    }
  }

  async function pluginAction(action, slug) {
    try {
      if (action === 'activate') await api('/api/plugins/' + slug + '/activate', { method: 'POST' });
      else if (action === 'deactivate') await api('/api/plugins/' + slug + '/deactivate', { method: 'POST' });
      else if (action === 'delete') { if (!confirm('Hapus modul ' + slug + '?')) return; await api('/api/plugins/' + slug, { method: 'DELETE' }); }
      await loadPluginHost();
      renderModular(document.getElementById('viewContainer'));
    } catch (e) { alert(e.message); }
  }
  window.pluginAction = pluginAction;
  window.renderModular = renderModular;

  window.Module_modular = { render: (vc) => renderModular(vc) };
})();