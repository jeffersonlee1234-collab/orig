const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'qc_social_service_management_secure_jwt_secret_key_2026_@!#';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Signs a payload to create a signed JSON Web Token
 * @param {Object} payload - User identification data (id, email, role, qcidNo)
 * @param {string|number} expiresIn - Optional custom expiration duration (defaults to '8h')
 * @returns {string} Signed JWT string
 */
function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT token signature and expiration
 * @param {string} token - The raw JWT token
 * @returns {Object|null} Decoded payload if valid, or null if invalid/expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  verifyToken,
};
