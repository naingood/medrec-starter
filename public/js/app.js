let currentUser = null;
let config = {};
let currentTab = 'home';

function apiBase() {
  if (config && config.endpoint_active === '1' && config.base_url_endpoint) return String(config.base_url_endpoint).replace(/\/$/, '');
  return '';
}
async function api(url, opts = {}) {
  const base = String(url).startsWith('/api/plugins/settings') ? '' : apiBase();
  let res;
  try {
    res = await fetch(base + url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  } catch (e) {
    if (base) alert('Data belum tersedia');
    throw e;
  }
  if (base && !res.ok) alert('Data belum tersedia');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>'"]/g, t => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])); }

async function init() {
  try {
    const me = await api('/api/me');
    currentUser = me.user;
  } catch (e) {
    window.location.href = '/login.html';
    return;
  }
  try {
    const c = await api('/api/config');
    config = c.config || {};
  } catch (e) {}
  // Load settings (app name, endpoint) if available
  try {
    const s = await api('/api/plugins/settings');
    const d = s.data || {};
    if (d.app_name) config.app_name = d.app_name;
    if (d.base_url_endpoint != null) config.base_url_endpoint = d.base_url_endpoint;
    if (d.endpoint_active != null) config.endpoint_active = d.endpoint_active;
  } catch (e) {}
  const name = config.app_name || 'MedRec Starter';
  document.getElementById('clinicName').textContent = name;
  document.getElementById('clinicNameM').textContent = name;
  document.getElementById('userInfo').textContent = currentUser.nama_lengkap + ' (' + currentUser.role + ')';
  document.getElementById('userInfoM').textContent = currentUser.nama_lengkap;
  if (currentUser.role === 'superadmin') {
    document.getElementById('navModularDesktop')?.classList.remove('hidden');
    document.getElementById('navModularMobile')?.classList.remove('hidden');
    document.getElementById('navDokumentasiDesktop')?.classList.remove('hidden');
    document.getElementById('navDokumentasiMobile')?.classList.remove('hidden');
    document.getElementById('navAddonsDesktop')?.classList.remove('hidden');
    // Sembunyikan semua screen aplikasi (home/pasien/icd/daftar) untuk superadmin
    ['home','pasien','icd','daftar'].forEach((t) => {
      document.querySelectorAll('[data-tab="' + t + '"]').forEach((el) => el.classList.add('hidden'));
    });
  }
  await loadPluginHost();
  await renderBottomNav();
  switchTab(currentUser.role === 'superadmin' ? 'modular' : 'home');
}

function switchTab(tab) {
  if (currentUser && currentUser.role === 'superadmin' && ['home','pasien','icd','daftar'].includes(tab)) tab = 'modular';
  currentTab = tab;
  // highlight
  document.querySelectorAll('.navbtn').forEach(b => {
    b.classList.toggle('bg-blue-50', b.dataset.tab === tab);
    b.classList.toggle('text-blue-600', b.dataset.tab === tab);
    b.classList.toggle('font-semibold', b.dataset.tab === tab);
  });
  document.querySelectorAll('.mobnav').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('text-blue-600', active);
    b.classList.toggle('text-gray-500', !active);
  });
  const vc = document.getElementById('viewContainer');
  vc.innerHTML = '<div class="text-gray-400">Memuat...</div>';
  renderView(tab);
}

async function renderView(tab) {
  if (currentUser && currentUser.role === 'superadmin' && ['home','pasien','icd','daftar'].includes(tab)) {
    tab = 'modular'; currentTab = 'modular';
  }
  const vc = document.getElementById('viewContainer');
  try {
    if (tab === 'modular') await renderModular(vc);
    else if (tab === 'dokumentasi') await renderDokumentasi(vc);
    else if (tab === 'addons') await renderModule('addons', vc);
    else if (tab.startsWith('plugin:')) await renderPluginView(tab.slice(7), vc);
    else await renderModule(tab, vc);
    trackPageView(tab).catch(()=>{});
  } catch (e) {
    vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
  }
}

let pluginMenusLoaded = false;
async function renderModule(slug, vc) {
  const name = 'Module_' + slug.replace(/[^a-zA-Z0-9]/g, '_');
  let tries = 0;
  while (!window[name] && tries < 30) { await new Promise(r => setTimeout(r, 100)); tries++; }
  const m = window[name];
  if (m && typeof m.render === 'function') { await m.render(vc); return; }
  vc.innerHTML = '<div class="text-red-600">Modul ' + slug + ' tidak tersedia.</div>';
}


async function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;
  let menus = [];
  try { const d = await api('/api/plugins/menus'); menus = d.data || []; } catch (e) {}
  const homeBtn = '<button onclick="switchTab(\'home\')" class="mobnav flex flex-col items-center text-gray-500" data-tab="home"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg><span class="text-xs mt-1">Beranda</span></button>';
  const pluginBtns = menus.map(m => '<button onclick="switchTab(\'plugin:' + m.slug + '\')" class="mobnav flex flex-col items-center text-gray-500" data-tab="plugin:' + m.slug + '"><span class="text-xl">' + (m.icon || 'P') + '</span><span class="text-xs mt-1">' + esc(m.label || m.slug) + '</span></button>').join('');
  nav.innerHTML = homeBtn + pluginBtns;
  document.querySelectorAll('.mobnav').forEach(b => { const active = b.dataset.tab === currentTab; b.classList.toggle('text-blue-600', active); b.classList.toggle('text-gray-500', !active); });
}

async function loadPluginHost() {
  try {
    const menus = await api('/api/plugins/menus');
    const scripts = await api('/api/plugins/client-scripts');
    // load client scripts once
    for (const s of (scripts.data || [])) {
      if (!document.querySelector('script[data-plugin="' + s.slug + '"]')) {
        const sc = document.createElement('script');
        sc.src = s.src;
        sc.dataset.plugin = s.slug;
        document.head.appendChild(sc);
      }
    }
    // inject menu buttons (desktop sidebar) if not exists
    const sidebarNav = document.querySelector('aside nav');
    for (const m of (menus.data || [])) {
      const id = 'pluginNav_' + m.slug;
      if (!document.getElementById(id)) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'navbtn w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50';
        btn.dataset.tab = 'plugin:' + m.slug;
        btn.textContent = (m.icon ? m.icon + ' ' : '') + (m.label || m.slug);
        btn.onclick = () => switchTab('plugin:' + m.slug);
        sidebarNav && sidebarNav.appendChild(btn);
      }
    }
    // Pastikan tombol Settings selalu di paling bawah (setelah injeksi menu plugin)
    const settingsBtn = document.getElementById('navSettingsDesktop') || document.querySelector('[data-tab="settings"]');
    const nav = document.querySelector('aside nav');
    if (settingsBtn && nav && nav.lastElementChild !== settingsBtn) {
      nav.appendChild(settingsBtn);
    }
    pluginMenusLoaded = true;
  } catch (e) {
    // plugin host optional; ignore if not superadmin/no access
  }
}

async function renderModular(vc) {
  vc.innerHTML = '<div class="text-gray-400">Memuat panel modular...</div>';
  try {
    await api('/api/plugins/scan').catch(() => ({}));
    const data = await api('/api/plugins');
    const plugins = data.data || [];
    vc.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Panel Modular (Superadmin)</h2>
        <button onclick="renderModular(document.getElementById('viewContainer'))" class="text-sm text-blue-600">↻ Refresh</button>
      </div>
      ${plugins.length === 0 ? '<div class="text-gray-400">Tidak ada plugin. Tambahkan folder ke /plugins lalu klik Scan.</div>' : ''}
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
      <div class="mt-6 text-xs text-gray-400">Plugin lokal terbaca dari folder <code>/plugins</code>. Tambah folder plugin lalu klik Refresh/Scan.</div>`;
  } catch (e) {
    vc.innerHTML = `<div class="text-red-600">Error: ${esc(e.message)}</div>`;
  }
}

async function pluginAction(action, slug) {
  try {
    if (action === 'activate') await api('/api/plugins/' + slug + '/activate', { method: 'POST' });
    else if (action === 'deactivate') await api('/api/plugins/' + slug + '/deactivate', { method: 'POST' });
    else if (action === 'delete') { if (!confirm('Hapus plugin ' + slug + '?')) return; await api('/api/plugins/' + slug, { method: 'DELETE' }); }
    await loadPluginHost();
    renderModular(document.getElementById('viewContainer'));
  } catch (e) { alert(e.message); }
}
window.pluginAction = pluginAction;

async function renderPluginView(slug, vc) {
  vc.innerHTML = '<div class="text-gray-400">Memuat plugin...</div>';
  const globalName = window['Module_' + slug] ? 'Module_' + slug : 'Plugin_' + slug;
  // wait a tick for script load
  let tries = 0;
  while (!window[globalName] && tries < 20) { await new Promise(r => setTimeout(r, 100)); tries++; }
  const plugin = window[globalName];
  if (!plugin || typeof plugin.render !== 'function') {
    vc.innerHTML = `<div class="text-red-600">Plugin "${esc(slug)}" tidak menyediakan tampilan atau belum dimuat.</div>`;
    return;
  }
  try { plugin.render(vc); } catch (e) { vc.innerHTML = `<div class="text-red-600">Error plugin: ${esc(e.message)}</div>`; }
}

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

async function logout() { try { await api('/api/logout', { method: 'POST' }); } catch (e) {} window.location.href = '/login.html'; }
window.logout = logout;

async function trackPageView(page) {
  try {
    const sid = sessionStorage.getItem('an_session_id');
    const res = await api('/api/plugins/analytics/track', { method: 'POST', body: JSON.stringify({ session_id: sid, page: page, event_type: 'page_view' }) });
    if (res && res.session_id) sessionStorage.setItem('an_session_id', res.session_id);
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', init);
// allow searchPasien defined globally