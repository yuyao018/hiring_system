const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createLoginLimiters } = require('../lib/login-rate-limit');
async function fixture(t, options = {}) {
 const app = express();
 app.set('trust proxy', 'loopback');
 app.use(express.json());
 const { ipLimiter, accountLimiter } = createLoginLimiters(options);
 let attempts = 0;
 app.post('/login', ipLimiter, accountLimiter, (req, res) => { attempts++; res.status(req.body.password === 'correct' ? 200 : 401).json({}); });
 const server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 return {
  attempts: () => attempts,
  request: (email = 'test@example.com', password = 'incorrect', ip = '198.51.100.1') => fetch(`http://127.0.0.1:${server.address().port}/login`, {
   method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify({ email, password })
  })
 };
}
test('successful logins do not consume the failed-attempt quota', async t => {
 const app = await fixture(t);
 for (let i = 0; i < 6; i++) assert.equal((await app.request('success@example.com', 'correct')).status, 200);
 for (let i = 0; i < 5; i++) assert.equal((await app.request('success@example.com')).status, 401);
 assert.equal((await app.request('success@example.com')).status, 429);
});
test('account limit applies across client IPs', async t => {
 const app = await fixture(t);
 for (let i = 1; i <= 5; i++) assert.equal((await app.request('same@example.com', 'incorrect', `198.51.100.${i}`)).status, 401);
 assert.equal((await app.request('same@example.com', 'incorrect', '198.51.100.6')).status, 429);
 assert.equal(app.attempts(), 5);
});
test('IP limit blocks attempts distributed across different email addresses', async t => {
 const app = await fixture(t, { ipLimit: 2 });
 assert.equal((await app.request('one@example.com')).status, 401);
 assert.equal((await app.request('two@example.com')).status, 401);
 const blocked = await app.request('three@example.com');
 assert.equal(blocked.status, 429);
 assert.match((await blocked.json()).message, /connection/);
 assert.equal(app.attempts(), 2);
 assert.equal((await app.request('three@example.com', 'incorrect', '203.0.113.1')).status, 401);
});
test('requests are accepted again after the rate-limit window expires', async t => {
 const app = await fixture(t, { windowMs: 1000, accountLimit: 1 });
 assert.equal((await app.request()).status, 401);
 const blocked = await app.request();
 assert.equal(blocked.status, 429);
 assert.equal(Number(blocked.headers.get('retry-after')), 1);
 await new Promise(resolve => setTimeout(resolve, 1100));
 assert.equal((await app.request()).status, 401);
});
