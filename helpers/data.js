// Data & API helper untuk rekam medis

function generateNoRM(lastId) {
  const next = (lastId ? lastId : 0) + 1;
  return 'RM-' + String(next + 100).padStart(6, '0');
}

function buildPagination(params) {
  const page = Math.max(1, parseInt((params && params.page) || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt((params && params.limit) || 20, 10)));
  const offset = (page - 1) * limit;
  const search = (params && params.search) ? String(params.search).trim() : '';
  return { page, limit, offset, search };
}

function formatResponse(res, status, data, message) {
  const ok = status >= 200 && status < 300;
  const body = { success: ok, data: data != null ? data : null, message: message || '' };
  if (res && typeof res.status === 'function') {
    return res.status(status).json(body);
  }
  return body;
}

module.exports = { generateNoRM, buildPagination, formatResponse };