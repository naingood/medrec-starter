module.exports = function register(ctx) {
  const { db, registerRoute, addAction, logger } = ctx;

  function notifyUsers(title, message, level, roles) {
    try {
      const users = db.prepare('SELECT id FROM users WHERE role IN (' + roles.map(() => '?').join(',') + ')').all(...roles);
      const stmt = db.prepare('INSERT INTO notifications (user_id, title, message, level) VALUES (?,?,?,?)');
      for (const u of users) stmt.run(u.id, title, message, level || 'info');
    } catch (e) { logger.error('notifyUsers', e.message); }
  }

  registerRoute('GET', '/', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC LIMIT 50').all(req.session.user.id);
      res.json({ data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('GET', '/unread-count', (req, res) => {
    try {
      const c = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND read_at IS NULL').get(req.session.user.id).c;
      res.json({ count: c });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('POST', '/', (req, res) => {
    if (req.session.user.role !== 'superadmin' && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses Ditolak.' });
    }
    const { title, message, level } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title wajib.' });
    db.prepare('INSERT INTO notifications (user_id, title, message, level) VALUES (NULL,?,?,?)').run(title, message || null, level || 'info');
    res.status(201).json({ ok: true });
  });

  registerRoute('POST', '/:id/read', (req, res) => {
    db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(req.params.id, req.session.user.id);
    res.json({ ok: true });
  });

  addAction('encounter.created', (enc) => {
    notifyUsers('Kunjungan baru', `Pasien baru terdaftar (encounter #${enc.id})`, 'info', ['superadmin', 'admin', 'dokter', 'pendaftaran']);
  });

  addAction('encounter.updated', (enc) => {
    if (enc.status && enc.status !== 'Pemeriksaan') {
      notifyUsers('Kunjungan diperbarui', `Encounter #${enc.id} status: ${enc.status}`, 'info', ['superadmin', 'admin', 'dokter']);
    }
  });

  logger.info('registered');
};