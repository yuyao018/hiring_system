const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
let server, base, verifyError = null, confirmed = false, verifyCalls = 0;
const validHash = 'a'.repeat(64);
before(async () => {
 require('../lib/supabase').publicClient = () => ({ auth: {
  verifyOtp: async params => { verifyCalls++; assert.deepEqual(params, { token_hash: validHash, type: 'email' }); return { data: { user: { email_confirmed_at: confirmed ? '2026-10-20T00:00:00Z' : null }, session: { access_token: 'must-not-return' } }, error: verifyError }; }
 } });
 const app = express(); app.use(express.json());
 app.use('/api/auth', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, require('../email-verification-api'));
 server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
 base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
const request = (path, body) => fetch(base + '/api/auth/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('invalid hash never reaches Supabase', async () => {
 const before = verifyCalls;
 assert.equal((await request('confirm-email', { tokenHash: 'bad', type: 'recovery' })).status, 400);
 assert.equal(verifyCalls, before);
});
test('invalid, expired and reused links fail without session cookies', async () => {
 verifyError = { status: 403, code: 'otp_expired' };
 const response = await request('confirm-email', { tokenHash: validHash });
 assert.equal(response.status, 400); assert.match((await response.json()).message, /expired/);
 assert.equal(response.headers.get('set-cookie'), null); verifyError = null;
});
test('confirmation succeeds only for a confirmed user and never exposes a session', async () => {
 assert.equal((await request('confirm-email', { tokenHash: validHash })).status, 400);
 confirmed = true;
 const response = await request('confirm-email', { tokenHash: validHash, type: 'recovery' });
 assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
 const data = await response.json(); assert.equal(data.success, true); assert.equal(data.session, undefined);
 assert.equal(response.headers.get('set-cookie'), null);
});
