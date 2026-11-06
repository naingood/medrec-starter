const express = require('express');
const pm = require('../core/pluginManager');

function createPluginRouter(db) {
  const router = express.Router();

  function requireSuperAdmin(req, res, next) {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Sesi telah berakhir.' });
    if (req.session.user.role !== 'superadmin') return res.status(403).json({ error: 'Hanya superadmin.' });
    next();
  }

  router.get('/', requireSuperAdmin, (req, res) => {
    try { res.json({ data: pm.getPlugins(db) }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/scan', requireSuperAdmin, (req, res) => {
    try {
      pm.ensurePluginDir();
      pm.discoverPlugins(db);
      res.json({ ok: true, data: pm.getPlugins(db) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/:slug/activate', requireSuperAdmin, (req, res) => {
    try {
      const r = pm.activatePlugin(db, req.params.slug);
      res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.post('/:slug/deactivate', requireSuperAdmin, (req, res) => {
    try {
      const r = pm.deactivatePlugin(db, req.params.slug);
      res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.delete('/:slug', requireSuperAdmin, (req, res) => {
    try {
      const r = pm.deletePlugin(db, req.params.slug);
      res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  // menus available to any authenticated user (filtered by active plugins)
  router.get('/menus', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Sesi telah berakhir.' });
    res.json({ data: pm.getActiveMenus(db) });
  });

  router.get('/menu-candidates', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Sesi telah berakhir.' });
    if (req.session.user.role !== 'superadmin' && req.session.user.role !== 'admin') return res.status(403).json({ error: 'Hanya admin/superadmin.' });
    res.json({ data: pm.getMenuCandidates(db) });
  });

  router.post('/:slug/menu', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Sesi telah berakhir.' });
    if (req.session.user.role !== 'superadmin' && req.session.user.role !== 'admin') return res.status(403).json({ error: 'Hanya admin/superadmin.' });
    const active = !!(req.body && req.body.active);
    try {
      const r = pm.toggleMenuActive(db, req.params.slug, active);
      res.json(r);
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  router.get('/client-scripts', (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'Sesi telah berakhir.' });
    res.json({ data: pm.getClientScripts(db) });
  });

  return router;
}

module.exports = { createPluginRouter };