(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderAnalytics(vc) {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    vc.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">Analitik (Superadmin)</h2>
      <div class="bg-white rounded-xl shadow-sm p-5 mb-4 flex flex-wrap gap-3 items-end">
        <div><label class="text-xs text-gray-500">Dari</label><input id="anFrom" type="date" value="${weekAgo}" class="border rounded-lg px-3 py-2" /></div>
        <div><label class="text-xs text-gray-500">Sampai</label><input id="anTo" type="date" value="${today}" class="border rounded-lg px-3 py-2" /></div>
        <div><label class="text-xs text-gray-500">Role</label><select id="anRole" class="border rounded-lg px-3 py-2"><option value="">Semua</option><option value="superadmin">Superadmin</option><option value="admin">Admin</option><option value="pendaftaran">Pendaftaran</option><option value="dokter">Dokter</option></select></div>
        <button onclick="loadAnalytics()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Terapkan</button>
        <button onclick="exportAnalytics()" class="border px-4 py-2 rounded-lg text-sm">Export CSV</button>
      </div>
      <div id="anSummary" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h3 class="font-semibold mb-3">Page Views per Modul</h3>
          <div id="anByPage"></div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h3 class="font-semibold mb-3">Tren Harian</h3>
          <div id="anByDay"></div>
        </div>
      </div>`;
    await loadAnalytics();
  }

  async function loadAnalytics() {
    const from = document.getElementById('anFrom').value;
    const to = document.getElementById('anTo').value;
    const role = document.getElementById('anRole').value;
    const qs = 'from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to) + (role ? '&role=' + encodeURIComponent(role) : '');
    const data = await api('/api/plugins/analytics/summary?' + qs);
    document.getElementById('anSummary').innerHTML = `
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Kunjungan (Session)</div><div class="text-3xl font-bold text-blue-600">${data.totalSessions}</div></div>
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Page Views</div><div class="text-3xl font-bold text-green-600">${data.totalPageViews}</div></div>
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Unique User</div><div class="text-3xl font-bold text-amber-600">${data.uniqueUsers}</div></div>
      <div class="bg-white rounded-xl p-5 shadow-sm"><div class="text-gray-500 text-sm">Durasi Sesi (mnt)</div><div class="text-3xl font-bold text-indigo-600">${data.avgDurationMinutes}</div></div>`;
    document.getElementById('anByPage').innerHTML = (data.byPage.length ? '<table class="w-full text-sm"><tbody>' + data.byPage.map(p => '<tr class="border-t"><td class="p-2">' + esc(p.page) + '</td><td class="p-2 text-right font-mono">' + p.views + '</td></tr>').join('') + '</tbody></table>' : '<div class="text-gray-400 text-sm">Tidak ada data.</div>');
    document.getElementById('anByDay').innerHTML = (data.byDay.length ? '<table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-2">Tanggal</th><th class="p-2 text-right">Sesi</th><th class="p-2 text-right">PV</th><th class="p-2 text-right">User</th></tr></thead><tbody>' + data.byDay.map(d => '<tr class="border-t"><td class="p-2">' + esc(d.day) + '</td><td class="p-2 text-right">' + d.sessions + '</td><td class="p-2 text-right">' + d.page_views + '</td><td class="p-2 text-right">' + d.users + '</td></tr>').join('') + '</tbody></table>' : '<div class="text-gray-400 text-sm">Tidak ada data.</div>');
  }

  async function exportAnalytics() {
    const from = document.getElementById('anFrom').value;
    const to = document.getElementById('anTo').value;
    const role = document.getElementById('anRole').value;
    const qs = 'from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to) + (role ? '&role=' + encodeURIComponent(role) : '');
    window.location.href = '/api/plugins/analytics/export?' + qs;
  }
  window.loadAnalytics = loadAnalytics;
  window.exportAnalytics = exportAnalytics;

  window.Module_analytics = { render: (vc) => renderAnalytics(vc) };
})();