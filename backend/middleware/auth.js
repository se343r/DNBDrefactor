/**
 * Middleware xác thực đơn giản cho các route admin.
 * Client gửi mật khẩu qua header: x-import-key
 * Mật khẩu được lưu trong biến môi trường IMPORT_SECRET (không hardcode trong code)
 */
function requireImportKey(req, res, next) {
  const key = req.headers['x-import-key'];
  const secret = process.env.IMPORT_SECRET || '633435';

  if (!key || key !== secret) {
    return res.status(401).json({ error: 'Không có quyền truy cập' });
  }

  next();
}

module.exports = { requireImportKey };
