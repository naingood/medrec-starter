// Validasi input untuk aplikasi rekam medis

function validasiNIK(nik) {
  if (nik == null) return false;
  const s = String(nik).trim();
  if (!/^\d{16}$/.test(s)) return false;
  // checksum sederhana: digit terakhir tidak boleh semua 0
  if (/^0+$/.test(s)) return false;
  return true;
}

function sanitizeInput(str) {
  if (str == null) return '';
  return String(str).trim().replace(/<[^>]*>/g, '');
}

function validasiICD(code) {
  if (code == null) return false;
  const s = String(code).trim();
  // Format ICD-10 sederhana: huruf + angka, opsional titik
  return /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/i.test(s);
}

module.exports = { validasiNIK, sanitizeInput, validasiICD };