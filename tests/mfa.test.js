const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
let server, base, calls = 0;
const factor = { id: 'totp-id', factor_type: 'totp', status: 'verified', friendly_name: 'My app' };
const users = {
 manager: { id: 'manager', role: 'hiring_manager', factors: [] },
 applicant: { id: 'applicant', role: 'applicant', factors: [] },
 enrolled: { id: 'enrolled', role: 'applicant', factors: [{ ...factor }] },
 guessing: { id: 'guessing', role: 'hiring_manager', factors: [{ ...factor }] }
};
const token = (id, aal = 'aal1') => 'test.' + Buffer.from(JSON.stringify({ sub: id, aal })).toString('base64url') + '.signed';
const session = (id, aal) => ({ access_token: token(id, aal), refresh_token: 'refresh-' + id, expires_in: 3600 });
function identity(jwt) {
 try { return users[JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url')).sub]; } catch (_) { return null; }
}
function client(jwt) {
 let current = jwt;
 return {
  from: () => { const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: identity(current) }), order: async () => ({ data: [] }) }; return chain; },
  auth: {
   getUser: async value => identity(value || current) ? { data: { user: identity(value || current) } } : { error: true },
   setSession: async data => { current = data.access_token; return { data: { session: data } }; },
   mfa: {
    enroll: async () => { identity(current).factors.push({ ...factor, status: 'unverified' }); return { data: { id: factor.id, totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'TEST-SECRET' } } }; },
    unenroll: async ({ factorId }) => { const u = identity(current); u.factors = u.factors.filter(f => f.id !== factorId); return { data: {} }; },
    challenge: async () => ({ data: { id: 'challenge-id' } }),
    verify: async ({ code }) => {
     calls++;
     if (code !== '123456') return { error: { status: 400 } };
     const u = identity(current); u.factors.forEach(f => { f.status = 'verified'; });
     return { data: session(u.id, 'aal2') };
    }
   }
  }
 };
}
before(async () => {
 require('../lib/supabase').publicClient = client;
 const app = require('../server');
 server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
 base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
const request = (path, id, body, aal = 'aal1') => fetch(base + path, {
 method: body ? 'POST' : 'GET', headers: { cookie: `high5_access=${token(id, aal)}; high5_refresh=refresh-${id}`, 'Content-Type': 'application/json' },
 ...(body ? { body: JSON.stringify(body) } : {})
});
test('password-only manager session can reach setup but not private recruitment APIs', async () => {
 const response = await request('/api/auth/session', 'manager');
 assert.deepEqual((await response.json()).user.mfa, { required: true, enrolled: false, verified: false });
 for (const path of ['/api/recruiter/jobs', '/api/recruiter/resume/id', '/api/future-feature']) {
  const denied = await request(path, 'manager'); assert.equal(denied.status, 403); assert.equal((await denied.json()).code, 'mfa_required');
 }
 assert.equal((await request('/api/auth/mfa/status', 'manager')).status, 200);
});
test('applicants may opt in; enrolled applicants must complete MFA', async () => {
 assert.equal((await request('/api/careers/applications', 'applicant')).status, 200);
 assert.equal((await request('/api/careers/applications', 'enrolled')).status, 403);
 assert.equal((await request('/api/careers/applications', 'enrolled', undefined, 'aal2')).status, 200);
});
test('setup is private and requires a correct code to unlock a manager session', async () => {
 const response = await request('/api/auth/mfa/enroll', 'manager', {});
 assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
 const data = await response.json(); assert.equal(data.factorId, factor.id); assert.match(data.qrCode, /^data:image\/svg\+xml/);
 assert.equal((await request('/api/recruiter/jobs', 'manager')).status, 403);
 const wrong = await request('/api/auth/mfa/verify', 'manager', { factorId: factor.id, code: '000000', aal: 'aal2' });
 assert.equal(wrong.status, 400); assert.equal(wrong.headers.get('set-cookie'), null);
 const success = await request('/api/auth/mfa/verify', 'manager', { factorId: factor.id, code: '123456' });
 assert.equal(success.status, 200); assert.match(success.headers.get('set-cookie'), /HttpOnly/);
 assert.deepEqual(await success.json(), { success: true }, 'Access and refresh tokens must not appear in JSON');
 assert.equal((await request('/api/recruiter/jobs', 'manager', undefined, 'aal2')).status, 200);
 assert.equal((await request('/api/recruiter/jobs', 'manager')).status, 403, 'Old AAL1 sessions remain blocked');
 const status = await (await request('/api/auth/mfa/status', 'manager')).json();
 assert.equal(status.enrolled, true); assert.equal(status.secret, undefined); assert.equal(status.qrCode, undefined);
});
test('password-only user cannot replace an enabled factor or use another user factor', async () => {
 assert.equal((await request('/api/auth/mfa/enroll', 'enrolled', {})).status, 409);
 const before = calls;
 assert.equal((await request('/api/auth/mfa/verify', 'enrolled', { factorId: 'other-user-factor', code: '123456' })).status, 400);
 assert.equal(calls, before);
 assert.equal((await request('/api/auth/mfa/verify', 'enrolled', { factorId: factor.id, code: '123' })).status, 400);
});
test('OTP guessing is limited across sessions for the same account', async () => {
 for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/mfa/verify', 'guessing', { factorId: factor.id, code: '000000' })).status, 400);
 const before = calls;
 const blocked = await request('/api/auth/mfa/verify', 'guessing', { factorId: factor.id, code: '123456' });
 assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('retry-after')) > 0); assert.equal(calls, before);
});
