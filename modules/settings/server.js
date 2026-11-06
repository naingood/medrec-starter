module.exports = function register(ctx) {
  const { db, registerRoute, logger } = ctx;

  function getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const out = {};
    rows.forEach(r => { out[r.key] = r.value; });
    return out;
  }

  registerRoute('GET', '/', (req, res) => {
    const s = getSettings();
    // only admin/superadmin for full settings; others can read app_name
    res.json({ data: s });
  });

  registerRoute('PUT', '/', (req, res) => {
    if (req.session.user.role !== 'superadmin' && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin/superadmin.' });
    }
    const { app_name, base_url_endpoint, endpoint_active } = req.body || {};
    if (app_name != null) {
      db.prepare("INSERT INTO settings (key,value,updated_at) VALUES ('app_name',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").run(String(app_name));
      db.prepare("UPDATE config SET value = ? WHERE key = 'app_name'").run(String(app_name));
    }
    if (base_url_endpoint != null) {
      db.prepare("INSERT INTO settings (key,value,updated_at) VALUES ('base_url_endpoint',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").run(String(base_url_endpoint));
    }
    if (endpoint_active != null) {
      const v = endpoint_active ? '1' : '0';
      db.prepare("INSERT INTO settings (key,value,updated_at) VALUES ('endpoint_active',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").run(v);
    }
    logger.info('settings updated');
    res.json({ ok: true, data: getSettings() });
  });

  logger.info('settings registered');
};