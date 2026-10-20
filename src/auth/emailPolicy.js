const { email: EMAIL_MAX_LENGTH } = require('./inputLimits');

function isValidEmail(email, maxLength = EMAIL_MAX_LENGTH) {
 if (typeof email !== 'string') return false;
 const value = email.trim();
 if (!value || value.length > maxLength || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
 const [local, domain] = value.split('@');
 if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
 return domain.split('.').every(label =>
  label.length > 0 && label.length <= 63
  && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
 );
}

module.exports = { isValidEmail };
