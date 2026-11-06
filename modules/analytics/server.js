const crypto = require('crypto');

module.exports = function register(ctx) {
  const { db, registerRoute, logger } = ctx;

  function cleanup() {
    try {
      db.prepare("DELETE FROM analytics_sessions WHERE started_at < datetime('now','-7 days')").run();
      db.prepare("DELETE FROM analytics_events WHERE created_at < datetime('now','-7 days')").run();
    } catch (e) { logger.error('cleanup', e.message); }
  }

  registerRoute('POST', '/track', (req, res) => {
    const userId = req.session.user.id;
    const page = (req.body && req.body.page) || 'unknown';
    const eventType = (req.body && req.body.event_type) || 'page_view';
    let sessionId = req.body && req.body.session_id;
    let session = sessionId ? db.prepare('SELECT * FROM analytics_sessions WHERE session_id = ?').get(sessionId) : null;
    const now = Date.now();
    let isNew = false;
    if (!session) isNew = true;
    else {
      const last = new Date(String(session.last_seen_at).replace(' ', 'T') + 'Z').getTime();
      if ((now - last) / 60000 > 30) isNew = true;
    }
    if (isNew) {
      sessionId = (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
      db.prepare('INSERT INTO analytics_sessions (session_id, user_id, started_at, last_seen_at, page_views) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)').run(sessionId, userId);
    }
    db.prepare('UPDATE analytics_sessions SET last_seen_at = CURRENT_TIMESTAMP, page_views = page_views + 1 WHERE session_id = ?').run(sessionId);
    db.prepare('INSERT INTO analytics_events (session_id, user_id, event_type, page, user_agent) VALUES (?, ?, ?, ?, ?)').run(sessionId, userId, eventType, page, req.headers['user-agent'] || '');
    cleanup();
    res.json({ session_id: sessionId });
  });

  function buildWhere(req) {
    const from = (req.query.from || '').trim() || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const to = (req.query.to || '').trim() || new Date().toISOString().slice(0, 10);
    const role = (req.query.role || '').trim();
    let where = "WHERE date(s.started_at) BETWEEN ? AND ?";
    const params = [from, to];
    if (role) { where += " AND u.role = ?"; params.push(role); }
    return { from, to, role, where, params };
  }

  registerRoute('GET', '/summary', (req, res) => {
    if (req.session.user.role !== 'superadmin') return res.status(403).json({ error: 'Hanya superadmin.' });
    const { from, to, role, where, params } = buildWhere(req);
    const totalSessions = db.prepare('SELECT COUNT(*) AS c FROM analytics_sessions s LEFT JOIN users u ON u.id = s.user_id ' + where).get(...params).c;
    const totalPageViews = db.prepare('SELECT COUNT(*) AS c FROM analytics_events e JOIN analytics_sessions s ON s.session_id = e.session_id LEFT JOIN users u ON u.id = s.user_id ' + where + " AND e.event_type = 'page_view'").get(...params).c;
    const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT s.user_id) AS c FROM analytics_sessions s LEFT JOIN users u ON u.id = s.user_id ' + where).get(...params).c;
    const avgDur = db.prepare('SELECT AVG((julianday(s.last_seen_at) - julianday(s.started_at)) * 24 * 60) AS v FROM analytics_sessions s LEFT JOIN users u ON u.id = s.user_id ' + where).get(...params).v;
    const byPage = db.prepare('SELECT e.page AS page, COUNT(*) AS views FROM analytics_events e JOIN analytics_sessions s ON s.session_id = e.session_id LEFT JOIN users u ON u.id = s.user_id ' + where + " AND e.event_type = 'page_view' GROUP BY e.page ORDER BY views DESC").all(...params);
    const byDay = db.prepare('SELECT date(s.started_at) AS day, COUNT(DISTINCT s.session_id) AS sessions, COUNT(e.id) AS page_views, COUNT(DISTINCT s.user_id) AS users FROM analytics_sessions s LEFT JOIN analytics_events e ON e.session_id = s.session_id AND e.event_type = \'page_view\' LEFT JOIN users u ON u.id = s.user_id ' + where + ' GROUP BY date(s.started_at) ORDER BY day').all(...params);
    res.json({ from, to, role: role || 'all', totalSessions, totalPageViews, uniqueUsers, avgDurationMinutes: Math.round((avgDur || 0) * 10) / 10, byPage, byDay });
  });

  registerRoute('GET', '/export', (req, res) => {
    if (req.session.user.role !== 'superadmin') return res.status(403).json({ error: 'Hanya superadmin.' });
    const { from, to, role, where, params } = buildWhere(req);
    const rows = db.prepare('SELECT date(s.started_at) AS day, COUNT(DISTINCT s.session_id) AS sessions, COUNT(e.id) AS page_views, COUNT(DISTINCT s.user_id) AS users FROM analytics_sessions s LEFT JOIN analytics_events e ON e.session_id = s.session_id AND e.event_type = \'page_view\' LEFT JOIN users u ON u.id = s.user_id ' + where + ' GROUP BY date(s.started_at) ORDER BY day').all(...params);
    let csv = 'date,sessions,page_views,unique_users\n';
    rows.forEach(r => { csv += r.day + ',' + r.sessions + ',' + r.page_views + ',' + r.users + '\n'; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    res.send(csv);
  });

  logger.info('analytics registered');
};