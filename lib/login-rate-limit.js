const { rateLimit } = require('express-rate-limit');
const { createHash } = require('crypto');

function accountKey(req) {
 return createHash('sha256').update(req.body.email.trim().toLowerCase()).digest('hex');
}
function blocked(message) {
 return (req, res) => {
  const retryAfter = Math.max(1, Number(res.getHeader('Retry-After')) || 1);
  const minutes = Math.ceil(retryAfter / 60);
  res.status(429).json({ code: 'login_rate_limited', remainingAttempts: 0, message: `${message} Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, retryAfter });
 };
}
function createLoginLimiters({ windowMs = 15 * 60 * 1000, accountLimit = 5, ipLimit = 30 } = {}) {
 const common = { windowMs, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true };
 const ipLimiter = rateLimit({ ...common, limit: ipLimit, identifier: 'login-ip', requestPropertyName: 'loginIpRate', handler: blocked('Too many login attempts from this connection.') });
 const accountLimiter = rateLimit({ ...common, limit: accountLimit, identifier: 'login-account', requestPropertyName: 'loginAccountRate', keyGenerator: accountKey, handler: blocked('Too many failed login attempts for this account.') });
 return { ipLimiter, accountLimiter };
}
module.exports = { createLoginLimiters };
