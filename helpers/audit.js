// Audit trail helper
function auditLog(db, userId, aksi, entitas, entitasId, detail) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO audit_logs (user_id, aksi, entitas, entitas_id, detail) VALUES (?,?,?,?,?)')
      .run(userId || null, aksi || '', entitas || '', entitasId != null ? entitasId : null, detail ? JSON.stringify(detail) : null);
  } catch (e) {
    // jangan ganggu flow utama
    console.error('[audit]', e.message);
  }
}

module.exports = { auditLog };