(function () {
  async function api(url, opts = {}) {
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

  async function renderFormPesan(vc) {
    vc.innerHTML = `
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Kirim Pesan ke Petugas</h1>
        <p class="text-gray-600 mt-1">Kirim pertanyaan, keluhan, atau masukan kepada petugas klinik.</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <form id="pesanForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Anda</label>
            <input id="pesanNama" type="text" required placeholder="Contoh: Dewi Lestari" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nomor HP (opsional)</label>
            <input id="pesanHp" type="text" placeholder="08123456789" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
            <input id="pesanSubjek" type="text" placeholder="Contoh: Jadwal dokter gigi" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
            <textarea id="pesanIsi" rows="4" required placeholder="Tulis pesan Anda di sini..." class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div id="pesanErr" class="text-red-600 text-sm hidden"></div>
          <div class="flex gap-2 justify-end">
            <button type="button" onclick="switchTab('home')" class="px-4 py-2 rounded-lg border">Batal</button>
            <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium">Kirim Pesan</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('pesanForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('pesanErr');
      err.classList.add('hidden');
      const body = {
        nama_pengirim: document.getElementById('pesanNama').value,
        no_hp: document.getElementById('pesanHp').value || null,
        subjek: document.getElementById('pesanSubjek').value || null,
        pesan: document.getElementById('pesanIsi').value
      };
      try {
        await api('/api/public/pesan', { method: 'POST', body: JSON.stringify(body) });
        alert('Pesan terkirim. Petugas akan membalas secepatnya.');
        switchTab('home');
      } catch (ex) {
        err.textContent = ex.message;
        err.classList.remove('hidden');
      }
    });
  }

  async function renderDaftarPesanStaff(vc) {
    let pesan = [];
    try { pesan = (await api('/api/staff/pesan')).data || []; } catch (e) {}
    const rows = pesan.map(p => `
      <tr class="border-t">
        <td class="p-3">${esc(p.nama_pengirim)}</td>
        <td class="p-3">${esc(p.no_hp || '-')}</td>
        <td class="p-3">${esc(p.subjek || '-')}</td>
        <td class="p-3 max-w-xs truncate">${esc(p.pesan)}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded text-xs ${p.status === 'belum_dibaca' ? 'bg-red-100 text-red-700 font-semibold' : 'bg-green-100 text-green-700'}">${esc(p.status === 'belum_dibaca' ? 'Belum Dibaca' : 'Dibaca')}</span>
        </td>
        <td class="p-3 text-xs text-gray-500">${esc(p.created_at)}</td>
        <td class="p-3">
          ${p.status === 'belum_dibaca' ? `<button onclick="tandaiDibaca(${p.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs">Tandai Dibaca</button>` : '<span class="text-xs text-gray-400">-</span>'}
        </td>
      </tr>
    `).join('');
    vc.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Pesan Masuk</h2>
        <span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">${pesan.filter(p => p.status === 'belum_dibaca').length} Belum Dibaca</span>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="text-left p-3">Pengirim</th><th class="text-left p-3">No HP</th><th class="text-left p-3">Subjek</th><th class="text-left p-3">Pesan</th><th class="text-left p-3">Status</th><th class="text-left p-3">Waktu</th><th class="text-left p-3">Aksi</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="p-5 text-gray-400">Belum ada pesan.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  async function render(vc) {
    const tab = window.currentTab || 'pesan';
    if (tab === 'pesan-publik') await renderFormPesan(vc);
    else if (tab === 'pesan') await renderDaftarPesanStaff(vc);
    else vc.innerHTML = '<div class="text-red-600">Halaman tidak ditemukan.</div>';
  }

  window.tandaiDibaca = async (id) => {
    if (!confirm('Tandai pesan ini sudah dibaca?')) return;
    try {
      await api('/api/staff/pesan/' + id + '/baca', { method: 'PUT' });
      render(document.getElementById('viewContainer'));
    } catch (e) { alert(e.message); }
  };

  window.Module_pesan = { render: render };
})();
