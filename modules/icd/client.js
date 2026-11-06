(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderICD(vc) {
    vc.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Pencarian ICD-10</h2>
        ${currentUser.role === 'admin' ? '<button onclick="showAddICD()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kode</button>' : ''}
      </div>
      <div class="mb-3"><input id="searchICD" placeholder="Cari kode atau nama penyakit..." class="w-full border border-gray-300 rounded-lg px-3 py-2" oninput="clearTimeout(window._ist); window._ist=setTimeout(()=>loadICD(document.getElementById('searchICD').value),300)" /></div>
      <div id="icdList" class="bg-white rounded-xl shadow-sm"></div>`;
    await loadICD('');
  }

  async function loadICD(q) {
    const data = await api('/api/icd10?search=' + encodeURIComponent(q || ''));
    const el = document.getElementById('icdList');
    if (!data.data.length) { el.innerHTML = '<div class="p-5 text-gray-400">Tidak ada data.</div>'; return; }
    const icdCards = data.data.map(i => `
      <div class="p-4 flex items-start gap-3">
        <div class="font-mono font-semibold text-blue-600 shrink-0">${esc(i.code)}</div>
        <div class="text-sm text-gray-800">${esc(i.name_id)}</div>
      </div>`).join('');
    el.innerHTML = `
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr><th class="text-left p-3">Kode</th><th class="text-left p-3">Nama Penyakit</th></tr></thead>
          <tbody>${data.data.map(i => `<tr class="border-t"><td class="p-3 font-mono font-semibold">${esc(i.code)}</td><td class="p-3">${esc(i.name_id)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="md:hidden divide-y divide-gray-100">${icdCards}</div>`;
  }

  function showAddICD() {
    const code = prompt('Kode ICD-10 (contoh: J02.9):');
    if (!code) return;
    const name = prompt('Nama penyakit (Bahasa Indonesia):');
    if (!name) return;
    api('/api/icd10', { method: 'POST', body: JSON.stringify({ code, name_id: name }) })
      .then(() => { alert('Kode tersimpan.'); loadICD(document.getElementById('searchICD').value); })
      .catch(e => alert(e.message));
  }
  window.showAddICD = showAddICD;

  window.Module_icd = { render: (vc) => renderICD(vc) };
})();