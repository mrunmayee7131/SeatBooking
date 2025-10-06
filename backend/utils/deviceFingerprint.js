const crypto = require('crypto');

/**
 * Generate a device fingerprint from request headers and IP
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint hash
 */
function generateDeviceFingerprint(req) {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || req.connection.remoteAddress || '',
    req.headers['x-forwarded-for'] || ''
  ];

  const fingerprint = components.join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Validate if device fingerprint is provided in request
 * @param {Object} req - Express request object
 * @returns {boolean} True if fingerprint can be generated
 */
function hasValidFingerprint(req) {
  return !!(req.headers['user-agent'] || req.ip || req.connection.remoteAddress);
}

module.exports = {
  generateDeviceFingerprint,
  hasValidFingerprint
};