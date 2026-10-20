const crypto = require('crypto');

const productionPolicy = [
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 "script-src 'self'",
 "style-src 'self' 'nonce-__CSP_NONCE__'",
 "style-src-attr 'none'",
 "img-src 'self' data: blob:",
 "font-src 'self' data:",
 "connect-src 'self'"
].join('; ');

const developmentPolicy = [
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: blob:",
 "font-src 'self' data:",
 "connect-src 'self' ws: wss:"
].join('; ');

function applySecurityHeaders(req, res, next, { development = false } = {}) {
 const nonce = crypto.randomBytes(18).toString('base64');
 res.locals = res.locals || {};
 res.locals.cspNonce = nonce;
 res.setHeader('Content-Security-Policy', development ? developmentPolicy : productionPolicy.replace('__CSP_NONCE__', nonce));
 res.setHeader('X-Content-Type-Options', 'nosniff');
 res.setHeader('X-Frame-Options', 'DENY');
 res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
 res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
 res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

 // Only send HSTS when the original client connection used HTTPS.
 if (process.env.NODE_ENV === 'production' && req.secure) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
 }

 next();
}

module.exports = { applySecurityHeaders };
