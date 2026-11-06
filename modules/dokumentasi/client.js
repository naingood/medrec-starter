(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderDokumentasi(vc) {
    vc.innerHTML = `
      <div class="mb-4">
        <h2 class="text-2xl font-bold">Dokumentasi</h2>
        <p class="text-gray-500 text-sm">Panduan Backend, Frontend, dan Sistem Modular (superadmin).</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <iframe src="/docs/documentation.html" title="Dokumentasi" class="w-full" style="height:80vh;border:0;"></iframe>
      </div>`;
  }

  window.Module_dokumentasi = { render: (vc) => renderDokumentasi(vc) };
})();