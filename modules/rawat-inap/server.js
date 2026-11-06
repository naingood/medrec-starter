module.exports = function register(ctx) {
  const { db, registerRoute, hooks, logger } = ctx;

  function q(sql, params) { return db.prepare(sql).all(...(params || [])); }
  function g(sql, params) { return db.prepare(sql).get(...(params || [])); }
  function run(sql, params) { return db.prepare(sql).run(...(params || [])); }

  // Rooms & beds
  registerRoute('GET', '/rooms', (req, res) => {
    try {
      const rooms = q('SELECT * FROM ri_rooms ORDER BY kode_kamar');
      const beds = q('SELECT * FROM ri_beds ORDER BY kode_bed');
      const byRoom = {};
      rooms.forEach(r => { byRoom[r.id] = Object.assign({}, r, { beds: beds.filter(b => b.room_id === r.id) }); });
      res.json({ data: Object.values(byRoom) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('GET', '/beds', (req, res) => {
    try {
      const status = (req.query.status || '').trim();
      let sql = 'SELECT b.*, r.nama AS nama_kamar, r.kelas FROM ri_beds b JOIN ri_rooms r ON r.id = b.room_id';
      const params = [];
      if (status) { sql += ' WHERE b.status = ?'; params.push(status); }
      sql += ' ORDER BY b.kode_bed';
      res.json({ data: q(sql, params) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Admissions
  registerRoute('GET', '/admissions', (req, res) => {
    try {
      const status = (req.query.status || '').trim();
      let sql = `SELECT a.*, p.no_rm, p.nama_lengkap AS nama_pasien, b.kode_bed, r.nama AS nama_kamar
                 FROM ri_admissions a
                 JOIN patients p ON p.id = a.patient_id
                 JOIN ri_beds b ON b.id = a.bed_id
                 JOIN ri_rooms r ON r.id = b.room_id`;
      const params = [];
      if (status) { sql += ' WHERE a.status = ?'; params.push(status); }
      sql += ' ORDER BY a.id DESC';
      res.json({ data: q(sql, params) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('GET', '/admissions/:id', (req, res) => {
    try {
      const adm = g(`SELECT a.*, p.no_rm, p.nama_lengkap AS nama_pasien, b.kode_bed, r.nama AS nama_kamar
                     FROM ri_admissions a
                     JOIN patients p ON p.id = a.patient_id
                     JOIN ri_beds b ON b.id = a.bed_id
                     JOIN ri_rooms r ON r.id = b.room_id
                     WHERE a.id = ?`, [req.params.id]);
      if (!adm) return res.status(404).json({ error: 'Data inap tidak ditemukan.' });
      const notes = q('SELECT n.*, u.nama_lengkap AS nama_petugas FROM ri_daily_notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.admission_id = ? ORDER BY n.id DESC', [req.params.id]);
      res.json({ data: adm, notes });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('POST', '/admit', (req, res) => {
    const { patient_id, bed_id, diagnosa_masuk } = (req.body || {});
    if (!patient_id || !bed_id) return res.status(400).json({ error: 'Pasien dan bed wajib diisi.' });
    const bed = g('SELECT * FROM ri_beds WHERE id = ?', [bed_id]);
    if (!bed) return res.status(404).json({ error: 'Bed tidak ditemukan.' });
    if (bed.status !== 'tersedia') return res.status(400).json({ error: 'Bed tidak tersedia.' });
    const patient = g('SELECT id FROM patients WHERE id = ?', [patient_id]);
    if (!patient) return res.status(404).json({ error: 'Pasien tidak ditemukan.' });

    hooks.doAction('rawat-inap.before_admit', { patient_id, bed_id, diagnosa_masuk });
    try {
      const info = run('INSERT INTO ri_admissions (patient_id, bed_id, diagnosa_masuk, user_id) VALUES (?,?,?,?)', [patient_id, bed_id, diagnosa_masuk || null, req.session.user.id]);
      run("UPDATE ri_beds SET status = 'terisi' WHERE id = ?", [bed_id]);
      hooks.doAction('rawat-inap.after_admit', { id: info.lastInsertRowid, patient_id, bed_id });
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('POST', '/admissions/:id/notes', (req, res) => {
    const { catatan } = (req.body || {});
    if (!catatan) return res.status(400).json({ error: 'Catatan wajib diisi.' });
    const adm = g('SELECT id FROM ri_admissions WHERE id = ?', [req.params.id]);
    if (!adm) return res.status(404).json({ error: 'Data inap tidak ditemukan.' });
    try {
      const info = run('INSERT INTO ri_daily_notes (admission_id, catatan, user_id) VALUES (?,?,?)', [req.params.id, catatan, req.session.user.id]);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('PUT', '/admissions/:id/discharge', (req, res) => {
    const adm = g('SELECT * FROM ri_admissions WHERE id = ?', [req.params.id]);
    if (!adm) return res.status(404).json({ error: 'Data inap tidak ditemukan.' });
    if (adm.status !== 'inap') return res.status(400).json({ error: 'Pasien sudah dipulangkan.' });
    hooks.doAction('rawat-inap.before_discharge', { id: adm.id, patient_id: adm.patient_id, bed_id: adm.bed_id });
    try {
      run("UPDATE ri_admissions SET status = 'pulang', tanggal_keluar = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
      run("UPDATE ri_beds SET status = 'tersedia' WHERE id = ?", [adm.bed_id]);
      hooks.doAction('rawat-inap.after_discharge', { id: adm.id, patient_id: adm.patient_id, bed_id: adm.bed_id });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  registerRoute('GET', '/stats', (req, res) => {
    try {
      const totalBeds = g('SELECT COUNT(*) AS c FROM ri_beds').c;
      const terisi = g("SELECT COUNT(*) AS c FROM ri_beds WHERE status = 'terisi'").c;
      const tersedia = g("SELECT COUNT(*) AS c FROM ri_beds WHERE status = 'tersedia'").c;
      const inap = g("SELECT COUNT(*) AS c FROM ri_admissions WHERE status = 'inap'").c;
      res.json({ totalBeds, terisi, tersedia, inap });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Hooks
  hooks.doAction('rawat-inap.loaded', {});
  logger.info('rawat-inap registered');
};