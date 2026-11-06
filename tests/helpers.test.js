const assert = require('assert');
const { validasiNIK, sanitizeInput, validasiICD } = require('../helpers/validasi');
const { hitungUmur, formatTanggalIndo, labelStatusKunjungan } = require('../helpers/format');
const { maskingNIK, maskingTelepon, cekRole, hashSensitive } = require('../helpers/keamanan');
const { generateNoRM, buildPagination, formatResponse } = require('../helpers/data');
const { auditLog } = require('../helpers/audit');

function ok(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); }

ok(validasiNIK('3507123456780001') === true, 'validasiNIK valid');
ok(validasiNIK('123') === false, 'validasiNIK invalid');
ok(sanitizeInput('  <b>Halo</b>  ') === 'Halo', 'sanitizeInput');
ok(validasiICD('J02.9') === true, 'validasiICD valid');
ok(validasiICD('123') === false, 'validasiICD invalid');

const umur = hitungUmur('1995-05-14');
ok(umur && typeof umur.tahun === 'number', 'hitungUmur');
ok(formatTanggalIndo('1995-05-14') === '14 Mei 1995', 'formatTanggalIndo');
ok(labelStatusKunjungan('Selesai').color === 'green', 'labelStatusKunjungan');

ok(maskingNIK('3507123456780001') === '3507************', 'maskingNIK');
ok(maskingTelepon('081234567890') === '0812****90', 'maskingTelepon');
ok(cekRole({ role: 'admin' }, ['admin', 'dokter']) === true, 'cekRole true');
ok(cekRole({ role: 'dokter' }, ['admin']) === false, 'cekRole false');
ok(hashSensitive('abc').length === 64, 'hashSensitive');

ok(generateNoRM(2) === 'RM-000103', 'generateNoRM');
const pg = buildPagination({ page: 2, limit: 10, search: 'dewi' });
ok(pg.offset === 10 && pg.search === 'dewi', 'buildPagination');

const fakeRes = { status: (c) => ({ json: (b) => ({ code: c, body: b }) }) };
const r = formatResponse(fakeRes, 200, { id: 1 }, 'OK');
ok(r.code === 200 && r.body.success === true, 'formatResponse');

ok(typeof auditLog === 'function', 'auditLog exists');

console.log('Helper tests: ALL PASS');