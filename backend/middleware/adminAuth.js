const { verifyToken } = require('../config/jwt');
const db = require('../config/db');

/**
 * Middleware to authenticate requests and verify that user has Admin privileges
 */
module.exports = async function adminAuthMiddleware(req, res, next) {
  // If already verified by previous auth middleware
  if (req.user) {
    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'staff' || role === 'worker' || role === 'social worker';
    if (isAdmin) {
      return next();
    }
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  } else if (req.query && (req.query.token || req.query.sessionToken)) {
    token = req.query.token || req.query.sessionToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required. No token provided.',
      code: 'AUTH_NO_TOKEN',
    });
  }

  const decoded = verifyToken(token);
  if (decoded) {
    const role = (decoded.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'staff' || role === 'worker' || role === 'social worker';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have sufficient administrative permissions.',
        code: 'AUTH_FORBIDDEN',
      });
    }

    req.user = decoded;
    return next();
  }

  // Check active DB session
  try {
    const sessionRes = await db.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE active_session_token = $1',
      [token]
    );
    if (sessionRes.rows.length > 0) {
      const dbUser = sessionRes.rows[0];
      const role = (dbUser.role || '').toLowerCase();
      const isAdmin = role === 'admin' || role === 'superadmin' || role === 'staff' || role === 'worker' || role === 'social worker';
      if (isAdmin) {
        req.user = dbUser;
        return next();
      }
    }
  } catch {}

  return res.status(401).json({
    success: false,
    message: 'Invalid or expired admin token. Please log in again.',
    code: 'AUTH_INVALID_TOKEN',
  });
};