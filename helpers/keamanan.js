// Keamanan & akses untuk rekam medis
const crypto = require('crypto');

function maskingNIK(nik) {
  if (!nik || String(nik).length !== 16) return nik;
  return String(nik).substring(0, 4) + '************';
}

function maskingTelepon(no) {
  if (!no) return no;
  const s = String(no).trim();
  if (s.length < 6) return s;
  return s.substring(0, 4) + '****' + s.substring(s.length - 2);
}

function cekRole(user, roles) {
  if (!user || !user.role) return false;
  if (user.role === 'superadmin') return true;
  return Array.isArray(roles) && roles.includes(user.role);
}

function hashSensitive(value) {
  if (value == null) return '';
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { maskingNIK, maskingTelepon, cekRole, hashSensitive };