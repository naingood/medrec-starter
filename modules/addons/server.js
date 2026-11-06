module.exports = function register(ctx) {
  const { registerRoute, hooks, logger } = ctx;

  registerRoute('GET', '/', (req, res) => {
    if (req.session.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Hanya admin/superadmin.' });
    }
    const data = hooks.getModuleEvents();
    // include modules with no declared events too
    res.json({ data });
  });

  logger.info('addons registered');
};