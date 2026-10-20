const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_REQUIREMENTS = `Use 12 to ${PASSWORD_MAX_LENGTH} characters, including an uppercase letter, a lowercase letter, a digit, and a special character (for example !, @ or #).`;

function isValidPassword(password) {
 return typeof password === 'string'
  && password.length >= 12
  && password.length <= PASSWORD_MAX_LENGTH
  && /[A-Z]/.test(password)
  && /[a-z]/.test(password)
  && /[0-9]/.test(password)
  && /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password);
}

function getPasswordIssues(password) {
 const value = typeof password === 'string' ? password : '';
 const issues = [];
 if (value.length < 12) issues.push('At least 12 characters');
 if (value.length > PASSWORD_MAX_LENGTH) issues.push(`At most ${PASSWORD_MAX_LENGTH} characters`);
 if (!/[A-Z]/.test(value)) issues.push('An uppercase letter (A-Z)');
 if (!/[a-z]/.test(value)) issues.push('A lowercase letter (a-z)');
 if (!/[0-9]/.test(value)) issues.push('A digit (0-9)');
 if (!/[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(value)) issues.push('A special character (e.g. !, @, #)');
 return issues;
}

module.exports = { PASSWORD_REQUIREMENTS, PASSWORD_MAX_LENGTH, isValidPassword, getPasswordIssues };
