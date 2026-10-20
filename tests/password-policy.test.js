const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidPassword, getPasswordIssues } = require('../src/auth/passwordPolicy');

test('accepts 12 or more characters with all four character classes', () => {
 assert.equal(isValidPassword('StrongPass1!'), true);
 assert.equal(isValidPassword('LongerStrongPass1!'), true);
 for (const symbol of '!@#$%^&*()-_=+[]{};:\'",.<>/?`~\\|') {
  assert.equal(isValidPassword('Abcdefghij1' + symbol), true);
 }
});
test('rejects missing character classes and treats whitespace as no special character', () => {
 for (const password of ['Abcdefghi1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'MissingDigits!', 'MissingSymbol12', 'Abcdefghij1 ', 'Abcdefghij1\n', null, {}, 123]) {
  assert.equal(isValidPassword(password), false);
 }
});

test('reports only the unmet requirements', () => {
 assert.deepEqual(getPasswordIssues('Abcdefghij12'), ['A special character (e.g. !, @, #)']);
 assert.deepEqual(getPasswordIssues('Ab1!'), ['At least 12 characters']);
 assert.deepEqual(getPasswordIssues('StrongPass1!'), []);
 assert.equal(getPasswordIssues('').length, 5);
});
