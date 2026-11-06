// Format & perhitungan untuk rekam medis

function hitungUmur(tanggalLahir) {
  if (!tanggalLahir) return null;
  const tgl = new Date(tanggalLahir);
  if (isNaN(tgl.getTime())) return null;
  const now = new Date();
  let tahun = now.getFullYear() - tgl.getFullYear();
  const m = now.getMonth() - tgl.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < tgl.getDate())) tahun--;
  let bulan = (now.getMonth() - tgl.getMonth() + 12) % 12;
  if (now.getDate() < tgl.getDate()) bulan = (bulan + 11) % 12;
  return { tahun, bulan };
}

function formatTanggalIndo(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function labelStatusKunjungan(status) {
  const map = {
    'Pemeriksaan': { label: 'Pemeriksaan', color: 'amber' },
    'Selesai': { label: 'Selesai', color: 'green' },
    'Dirujuk': { label: 'Dirujuk', color: 'red' }
  };
  return map[status] || { label: status || '-', color: 'gray' };
}

module.exports = { hitungUmur, formatTanggalIndo, labelStatusKunjungan };