// Helper popup alert reusable (Bahasa Indonesia)
(function () {
  function ensureToastContainer() {
    let c = document.getElementById('popupToastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'popupToastContainer';
      c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(pesan, tipe) {
    const colors = { info: '#2563eb', success: '#16a34a', warning: '#d97706', error: '#dc2626' };
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '⛔' };
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.style.cssText = 'background:' + (colors[tipe] || colors.info) + ';color:#fff;padding:10px 14px;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.15);min-width:220px;max-width:360px;';
    t.textContent = (icons[tipe] || icons.info) + ' ' + pesan;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2500);
  }

  function showModal(pesan, tipe) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9998;display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:12px;padding:20px;max-width:400px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.2);';
      const title = tipe === 'confirm' ? 'Konfirmasi' : (tipe === 'error' ? 'Error' : (tipe === 'warning' ? 'Peringatan' : 'Informasi'));
      box.innerHTML = '<div style="font-weight:600;font-size:16px;margin-bottom:8px;">' + title + '</div>' +
        '<div style="color:#374151;margin-bottom:16px;">' + String(pesan).replace(/</g, '&lt;') + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        (tipe === 'confirm' ? '<button id="popupCancel" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;">Batal</button>' : '') +
        '<button id="popupOk" style="padding:8px 14px;background:#2563eb;color:#fff;border-radius:8px;">OK</button></div>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      const ok = box.querySelector('#popupOk');
      const cancel = box.querySelector('#popupCancel');
      function close(result) { overlay.remove(); resolve(result); }
      ok.addEventListener('click', () => close(true));
      if (cancel) cancel.addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  }

  async function tampilkanPopup(pesan, tipe) {
    tipe = tipe || 'info';
    if (tipe === 'confirm') return showModal(pesan, tipe);
    if (tipe === 'error' || tipe === 'warning') {
      // error/warning pakai modal agar terlihat jelas
      await showModal(pesan, tipe);
      return true;
    }
    showToast(pesan, tipe);
    return true;
  }

  window.tampilkanPopup = tampilkanPopup;
})();