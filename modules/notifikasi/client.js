(function () {
  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  function render(container) {
    container.innerHTML = '<div class="text-gray-400">Memuat notifikasi...</div>';
    load(container);
  }

  async function load(container) {
    try {
      const data = await api('/api/plugins/notifikasi');
      const rows = data.data || [];
      if (!rows.length) { container.innerHTML = '<div class="p-5 text-gray-400">Belum ada notifikasi.</div>'; return; }
      container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm divide-y">
          ${rows.map(n => `
            <div class="p-4 flex items-start gap-3 ${n.read_at ? 'opacity-60' : ''}">
              <div class="text-xl">${n.level === 'error' ? '⛔' : n.level === 'warning' ? '⚠️' : '🔔'}</div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900">${escape(n.title)}</div>
                <div class="text-sm text-gray-600 break-words">${escape(n.message || '')}</div>
                <div class="text-xs text-gray-400 mt-1">${escape(n.created_at)}</div>
              </div>
              ${n.read_at ? '' : `<button data-id="${n.id}" class="text-xs text-blue-600 shrink-0">Tandai dibaca</button>`}
            </div>`).join('')}
        </div>`;
      container.querySelectorAll('button[data-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try { await api('/api/plugins/notifikasi/' + btn.dataset.id + '/read', { method: 'POST' }); load(container); }
          catch (e) { alert(e.message); }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="text-red-600">Error: ${escape(e.message)}</div>`;
    }
  }

  function escape(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, (t) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  window.Module_notifikasi = { render };
})();