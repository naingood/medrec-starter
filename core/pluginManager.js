const fs = require('fs');
const path = require('path');
const hooks = require('./hooks');

const PLUGIN_DIR = path.join(__dirname, '..', 'modules');

function ensurePluginDir() {
  if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR, { recursive: true });
}

function readManifest(pluginPath) {
  let manifestPath = path.join(pluginPath, 'module.json');
  if (!fs.existsSync(manifestPath)) manifestPath = path.join(pluginPath, 'plugin.json');
  if (!fs.existsSync(manifestPath)) throw new Error('module.json/plugin.json tidak ditemukan');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  let m;
  try { m = JSON.parse(raw); } catch (e) { throw new Error('plugin.json tidak valid JSON: ' + e.message); }
  if (!m.name || !m.slug || !m.version || !m.main) throw new Error('Manifest tidak lengkap (butuh name, slug, version, main)');
  if (m.slug !== path.basename(pluginPath)) throw new Error('slug harus sama dengan nama folder');
  return m;
}

function validateManifest(m) {
  // minimal interface
  if (typeof m.name !== 'string' || typeof m.slug !== 'string') throw new Error('name/slug harus string');
  if (typeof m.version !== 'string') throw new Error('version harus string');
  if (typeof m.main !== 'string') throw new Error('main harus string');
  return true;
}

// Registry of active contributions per slug
const contributions = new Map(); // slug -> { routes:[], menus:[], actions:[], filters:[] }
const activeRoutes = new Map(); // slug -> [{method, regex, paramNames, handler, roles}]
const activeMenus = []; // {slug, label, icon, order, render}

function compilePath(p) {
  // supports :param
  const paramNames = [];
  const regexStr = p.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { regex: new RegExp('^' + regexStr.replace(/\//g, '\\/') + '$'), paramNames };
}

function registerRoute(slug, method, routePath, handler, roles) {
  if (!activeRoutes.has(slug)) activeRoutes.set(slug, []);
  const { regex, paramNames } = compilePath(routePath.startsWith('/') ? routePath : '/' + routePath);
  activeRoutes.get(slug).push({ method: method.toUpperCase(), regex, paramNames, handler, roles: roles || ['admin'] });
}

function unregisterRoutes(slug) { activeRoutes.delete(slug); }

function registerMenu(item) {
  // item: {slug, label, icon, order, render}
  const idx = activeMenus.findIndex((m) => m.slug === item.slug);
  if (idx >= 0) activeMenus[idx] = item; else activeMenus.push(item);
  activeMenus.sort((a, b) => (a.order || 100) - (b.order || 100));
}

function unregisterMenus(slug) {
  const i = activeMenus.findIndex((m) => m.slug === slug);
  if (i >= 0) activeMenus.splice(i, 1);
}

function dispatchPluginRoute(req, res) {
  const fullPath = (req.baseUrl || '') + (req.path || '');
  let m = fullPath.match(/^\/api\/plugins\/([^/]+)(\/.*)?$/);
  if (!m) m = (req.path || '').match(/^\/([^/]+)(\/.*)?$/);
  if (!m) return false;
  const slug = m[1];
  const subPath = m[2] || '/';
  const list = activeRoutes.get(slug);
  if (!list) return false;
  for (const r of list) {
    if (r.method !== req.method) continue;
    const mm = subPath.match(r.regex);
    if (!mm) continue;
    // role check
    const user = req.session && req.session.user;
    if (!user) { res.status(401).json({ error: 'Sesi telah berakhir.' }); return true; }
    if (user.role !== 'superadmin' && !r.roles.includes(user.role)) {
      res.status(403).json({ error: 'Akses Ditolak.' }); return true;
    }
    req.params = req.params || {};
    r.paramNames.forEach((name, idx) => { req.params[name] = mm[idx + 1]; });
    try { r.handler(req, res); } catch (e) { res.status(500).json({ error: e.message }); }
    return true;
  }
  return false;
}

function createContext(slug, manifest, db, logger) {
  const handle = { slug, routes: [], menus: [], actions: [], filters: [], events: [] };
  contributions.set(slug, handle);
  const ctx = {
    slug,
    manifest,
    db,
    hooks,
    logger,
    config: {},
    registerRoute(method, routePath, handler, roles) {
      registerRoute(slug, method, routePath, handler, roles);
      handle.routes.push({ method, routePath });
    },
    registerMenu(item) {
      const mi = Object.assign({ slug, order: 100 }, item);
      registerMenu(mi);
      handle.menus.push(mi);
    },
    addAction(name, fn) {
      hooks.addAction(name, fn, slug);
      handle.actions.push(name);
    },
    registerEvent(name, description) {
      if (!handle.events) handle.events = [];
      handle.events.push({ name, description: description || '' });
      // update registry incrementally
      const current = hooks.getModuleEvents().find((m) => m.slug === slug);
      const list = current ? current.events.slice() : [];
      if (!list.find((e) => e.name === name)) list.push({ name, description: description || '' });
      hooks.registerModuleEvents(slug, list);
    },
    on(eventName, fn) {
      hooks.addAction(eventName, fn, slug);
      handle.actions.push(eventName);
    },
    emit(eventName, payload) {
      hooks.doAction(eventName, payload);
    },
    addFilter(name, fn) {
      hooks.addFilter(name, fn, slug);
      handle.filters.push(name);
    },
    doAction: hooks.doAction,
    applyFilter: hooks.applyFilter
  };
  return { ctx, handle };
}

function cleanupContributions(slug) {
  unregisterRoutes(slug);
  unregisterMenus(slug);
  hooks.removeActionsByOwner(slug);
  hooks.removeFiltersByOwner(slug);
  hooks.removeModuleEvents(slug);
  contributions.delete(slug);
}

function runMigrations(db, slug, manifest, pluginPath, logger) {
  const files = manifest.migrations || [];
  const applied = db.prepare('SELECT file FROM plugin_migrations WHERE slug = ?').all(slug).map((r) => r.file);
  const pending = files.filter((f) => !applied.includes(f));
  const newlyApplied = [];
  for (const file of pending) {
    const full = path.join(pluginPath, file);
    if (!fs.existsSync(full)) throw new Error('Migration file tidak ditemukan: ' + file);
    const sql = fs.readFileSync(full, 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO plugin_migrations (slug, file) VALUES (?, ?)').run(slug, file);
    newlyApplied.push(file);
    logger.info('migration applied', file);
  }
  return newlyApplied;
}

function rollbackMigrations(db, slug, files) {
  for (const file of files) {
    db.prepare('DELETE FROM plugin_migrations WHERE slug = ? AND file = ?').run(slug, file);
  }
}

function discoverPlugins(db) {
  ensurePluginDir();
  const folders = fs.readdirSync(PLUGIN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const found = [];
  for (const folder of folders) {
    const p = path.join(PLUGIN_DIR, folder);
    try {
      const m = readManifest(p);
      validateManifest(m);
      const isCore = m.core === true;
      db.prepare(`INSERT INTO plugins (slug, name, version, description, author, status, config, core)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(slug) DO UPDATE SET name=excluded.name, version=excluded.version, description=excluded.description, author=excluded.author, core=excluded.core`)
        .run(m.slug, m.name, m.version, m.description || '', m.author || '', 'active', JSON.stringify(m.config || {}), isCore ? 1 : 0);
      found.push({ slug: m.slug, manifest: m, path: p });
    } catch (e) {
      // record error if already in db
      db.prepare(`INSERT INTO plugins (slug, name, status, last_error) VALUES (?,?,?,?)
        ON CONFLICT(slug) DO UPDATE SET status='error', last_error=excluded.last_error`)
        .run(folder, folder, 'error', e.message);
    }
  }
  // mark missing folders as error
  const dbSlugs = db.prepare('SELECT slug FROM plugins').all().map((r) => r.slug);
  for (const s of dbSlugs) {
    if (!folders.includes(s)) {
      db.prepare("UPDATE plugins SET status='error', last_error='Folder plugin tidak ditemukan' WHERE slug=?").run(s);
    }
  }
  return found;
}

function getPluginRecord(db, slug) {
  return db.prepare('SELECT * FROM plugins WHERE slug = ?').get(slug);
}

function activatePlugin(db, slug, loggerFactory) {
  const record = getPluginRecord(db, slug);
  if (!record) throw new Error('Plugin tidak terdaftar. Jalankan scan terlebih dahulu.');
  const pluginPath = path.join(PLUGIN_DIR, slug);
  if (!fs.existsSync(pluginPath)) throw new Error('Folder plugin tidak ditemukan');
  const manifest = readManifest(pluginPath);
  validateManifest(manifest);
  const logger = { info: (m,...a)=>console.log(`[plugin:${slug}]`, m, ...a), warn: (m,...a)=>console.warn(`[plugin:${slug}]`, m, ...a), error: (m,...a)=>console.error(`[plugin:${slug}]`, m, ...a) };
  // migrations
  let appliedThisRun = [];
  const { ctx, handle } = createContext(slug, manifest, db, logger);
  try {
    appliedThisRun = runMigrations(db, slug, manifest, pluginPath, logger);
    // load module
    const mainPath = path.join(pluginPath, manifest.main);
    if (!fs.existsSync(mainPath)) throw new Error('File main tidak ditemukan: ' + manifest.main);
    delete require.cache[require.resolve(mainPath)];
    const mod = require(mainPath);
    const registerFn = typeof mod === 'function' ? mod : (mod && typeof mod.register === 'function' ? mod.register : null);
    if (typeof registerFn !== 'function') throw new Error('Plugin main harus mengekspor function atau { register }');
    registerFn(ctx);
    if (Array.isArray(manifest.events)) {
      hooks.registerModuleEvents(slug, manifest.events);
    }
    if (handle.events && handle.events.length) {
      hooks.registerModuleEvents(slug, handle.events);
    }
    if (manifest.menu) {
      try { ctx.registerMenu(Object.assign({ slug }, manifest.menu)); } catch (e) { logger.warn('registerMenu failed', e.message); }
    }
    if (typeof mod.unregister === 'function') handle.unregister = mod.unregister;
    handle.registered = true;
    // update db
    db.prepare("UPDATE plugins SET status='active', activated_at=CURRENT_TIMESTAMP, deactivated_at=NULL, last_error=NULL, version=?, name=?, description=?, author=? WHERE slug=?")
      .run(manifest.version, manifest.name, manifest.description || '', manifest.author || '', slug);
    logger.info('activated');
    return { ok: true };
  } catch (e) {
    // rollback
    cleanupContributions(slug);
    rollbackMigrations(db, slug, appliedThisRun);
    db.prepare("UPDATE plugins SET status='inactive', last_error=? WHERE slug=?").run(String(e.message), slug);
    logger.error('activation failed, rolled back:', e.message);
    throw e;
  }
}

function deactivatePlugin(db, slug) {
  const rec = db.prepare('SELECT core FROM plugins WHERE slug=?').get(slug);
  if (rec && rec.core) throw new Error('Modul core tidak dapat dinonaktifkan.');
  const handle = contributions.get(slug);
  if (handle && typeof handle.unregister === 'function') {
    try { handle.unregister(); } catch (e) { console.error('[plugin]', slug, e.message); }
  }
  cleanupContributions(slug);
  db.prepare("UPDATE plugins SET status='inactive', deactivated_at=CURRENT_TIMESTAMP WHERE slug=?").run(slug);
  return { ok: true };
}

function deletePlugin(db, slug) {
  const rec = db.prepare('SELECT core FROM plugins WHERE slug=?').get(slug);
  if (rec && rec.core) throw new Error('Modul core tidak dapat dihapus.');
  deactivatePlugin(db, slug);
  const pluginPath = path.join(PLUGIN_DIR, slug);
  if (fs.existsSync(pluginPath)) {
    fs.rmSync(pluginPath, { recursive: true, force: true });
  }
  db.prepare('DELETE FROM plugin_migrations WHERE slug = ?').run(slug);
  db.prepare('DELETE FROM plugins WHERE slug = ?').run(slug);
  return { ok: true };
}

function loadActivePlugins(db) {
  const rows = db.prepare("SELECT slug FROM plugins WHERE status='active'").all();
  for (const r of rows) {
    try { activatePlugin(db, r.slug); }
    catch (e) { console.error('[plugin] failed to load active', r.slug, e.message); }
  }
}

function getPlugins(db) {
  return db.prepare('SELECT slug, name, version, description, author, status, core, menu_active, installed_at, activated_at, last_error FROM plugins ORDER BY name').all();
}

function getActiveMenus(db) {
  // only non-core plugins with menu_active=1
  const rows = db.prepare("SELECT slug FROM plugins WHERE status='active' AND core=0 AND menu_active=1").all();
  const slugs = new Set(rows.map(r=>r.slug));
  return activeMenus.filter(m => slugs.has(m.slug));
}

function getMenuCandidates(db) {
  return db.prepare("SELECT slug, name, version, description, core, menu_active, status FROM plugins WHERE status='active' AND core=0 ORDER BY name").all();
}

function toggleMenuActive(db, slug, active) {
  const rec = db.prepare('SELECT slug, core, status FROM plugins WHERE slug=?').get(slug);
  if (!rec) throw new Error('Modul tidak ditemukan.');
  if (rec.core) throw new Error('Modul core tidak dapat diatur via Tampil Menu.');
  if (rec.status !== 'active') throw new Error('Modul harus aktif terlebih dahulu.');
  if (active) {
    const count = db.prepare("SELECT COUNT(*) AS c FROM plugins WHERE status='active' AND core=0 AND menu_active=1").get().c;
    if (count >= 4) throw new Error('Maksimal 4 menu plugin aktif. Nonaktifkan salah satu terlebih dahulu.');
  }
  db.prepare('UPDATE plugins SET menu_active=? WHERE slug=?').run(active ? 1 : 0, slug);
  return { ok: true };
}

function getClientScripts(db) {
  const rows = db.prepare("SELECT slug FROM plugins WHERE status='active'").all();
  const scripts = [];
  for (const r of rows) {
    let manifestPath = path.join(PLUGIN_DIR, r.slug, 'module.json');
    if (!fs.existsSync(manifestPath)) manifestPath = path.join(PLUGIN_DIR, r.slug, 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (m.client) scripts.push({ slug: r.slug, src: `/modules/${r.slug}/${m.client}` });
    } catch (e) {}
  }
  return scripts;
}

module.exports = {
  PLUGIN_DIR,
  ensurePluginDir,
  discoverPlugins,
  activatePlugin,
  deactivatePlugin,
  deletePlugin,
  loadActivePlugins,
  getPlugins,
  getActiveMenus,
  getMenuCandidates,
  toggleMenuActive,
  getClientScripts,
  dispatchPluginRoute
};