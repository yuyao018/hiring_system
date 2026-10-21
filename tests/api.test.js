const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { termsVersion, privacyVersion } = require('../src/legal/policyVersions');
let signupError = null;
let signupSession = null;
let loginCalls = 0;
let loginError = null;
let server, base, signupOptions, insertedApplication, createdJob, requestedOwner, signedPath;
const users = {
 applicant: { id: 'applicant-id', email: 'applicant@example.com', name: 'Applicant', role: 'applicant', email_confirmed_at: '2026-10-20T00:00:00Z' },
 manager: { id: 'manager-id', email: 'manager@example.com', name: 'Manager', role: 'hiring_manager', email_confirmed_at: '2026-10-20T00:00:00Z' }
};
const managerToken = 'test.' + Buffer.from(JSON.stringify({ aal: 'aal2' })).toString('base64url') + '.signed';
const identityFor = token => users[token === managerToken ? 'manager' : token];
const revoked = new Set();
const session = token => ({ access_token: token, refresh_token: 'refresh-' + token, expires_in: 3600 });
function query(table, identity, admin = false) {
 let filters = {}, operation = 'select', values;
 const result = () => {
  if (table === 'profiles') return { data: identity || null, error: null };
  if (table === 'job') {
   if (operation === 'insert') { createdJob = values; return { data: { job_id: 'new-job', ...values }, error: null }; }
   return { data: filters.job_id ? { job_id: filters.job_id, status: 'Active', job: 'Engineer' } : [{ job_id: 'job', status: 'Active', job: 'Engineer' }], error: null };
  }
  if (table === 'applicant') {
   if (operation === 'insert') { insertedApplication = values; return { data: values, error: null }; }
   if (operation === 'update') return { data: [{ applicant_id: filters.applicant_id, ...values }], error: null };
   if (filters.applicant_id) return { data: { resume: 'applicant-id/application-id.txt' }, error: null };
   requestedOwner = filters.user_id;
   return { data: [{ applicant_id: 'application-id', user_id: identity?.id, job: { job: 'Engineer' }, status: 'Reviewing' }], error: null };
  }
  return { data: [], error: null };
 };
 const chain = {
  select() { return chain; }, eq(key, value) { filters[key] = value; return chain; }, order() { return chain; },
  insert(data) { assert.ok(admin || identity.role === 'hiring_manager'); operation = 'insert'; values = data; return chain; },
  update(data) { operation = 'update'; values = data; return chain; },
  single() { return Promise.resolve(result()); }, maybeSingle() { return Promise.resolve(result()); },
  then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
 };
 return chain;
}
function fakeClient(token, admin = false) {
 const identity = revoked.has(token) ? null : identityFor(token);
 return {
  from: table => query(table, identity, admin),
  storage: { from: () => ({
   upload: async () => ({ data: {}, error: null }), remove: async () => ({ data: {}, error: null }),
   createSignedUrl: async path => { signedPath = path; return { data: { signedUrl: 'https://storage.example.com/signed-resume' }, error: null }; }
  }) },
  auth: {
   signInWithPassword: async ({ email, password }) => {
    loginCalls++;
    if (loginError) return { error: loginError, data: {} };
    const role = email === users.manager.email ? 'manager' : 'applicant';
    return password === 'valid-password' ? { data: { session: session(role), user: users[role] } } : { error: true, data: {} };
   },
   getUser: async jwt => identityFor(jwt) && !revoked.has(jwt) ? { data: { user: identityFor(jwt) } } : { error: true },
   refreshSession: async ({ refresh_token }) => {
    const jwt = refresh_token.replace('refresh-', '');
    return users[jwt] && !revoked.has(jwt) ? { data: { session: session(jwt) } } : { error: true };
   },
   signUp: async options => { signupOptions = options; return { data: { session: signupSession }, error: signupError }; },
   admin: { signOut: async jwt => { revoked.add(jwt); return { error: null }; } }
  }
 };
}
const cookie = role => `high5_access=${role === 'manager' ? managerToken : role}; high5_refresh=refresh-${role}`;
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ termsAccepted: true, privacyAcknowledged: true, termsVersion, privacyVersion, ...body }) });
before(async () => {
 const supabase = require('../lib/supabase');
 supabase.publicClient = token => fakeClient(token);
 supabase.adminClient = () => fakeClient(null, true);
 const scorerPath = require.resolve('../src/candidate/services/compatibilityScorer');
 require.cache[scorerPath] = { id: scorerPath, filename: scorerPath, loaded: true, exports: class { async calculateCompatibilityScore() { return { overallScore: 80, detailedBreakdown: {} }; } } };
 const app = require('../server'); server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
test('public jobs remain available, private APIs reject signed-out users', async () => {
 assert.ok(Array.isArray(await (await fetch(base + '/api/careers/jobs')).json()));
 for (const route of ['/api/auth/session','/api/careers/applications','/api/recruiter/jobs','/api/recruiter/resume/id']) assert.equal((await fetch(base + route)).status, 401);
 assert.equal((await fetch(base + '/api/careers/applicants', { method: 'POST' })).status, 401);
});
test('guests cannot use any application or hiring action, even with invalid credentials', async () => {
 const routes = [
  ['POST','/api/careers/applicants'], ['POST','/api/recruiter/jobs'],
  ['POST','/api/recruiter/applicants'], ['PUT','/api/recruiter/updateJob/job'],
  ['PUT','/api/recruiter/updateStatus/job'], ['PUT','/api/recruiter/updateApplicantStatus/id'],
  ['GET','/api/recruiter/allJobs'], ['GET','/api/recruiter/editJob/job'],
  ['POST','/api/careers/jobs'], ['DELETE','/api/careers/jobs'],
  ['POST','/api/future-feature']
 ];
 for (const [method, route] of routes) {
  for (const headers of [{}, { cookie: 'high5_access=invalid; high5_refresh=invalid' }]) {
   const response = await fetch(base + route, { method, headers });
   assert.equal(response.status, 401, `${method} ${route} should require login`);
  }
 }
 assert.equal((await fetch(base + '/api/careers/jobs', { method: 'HEAD' })).status, 200);
});
test('one login serves both roles, session derives role from trusted profile', async () => {
 for (const [token, user] of Object.entries(users)) {
  const login = await fetch(base + '/api/auth/login', json({ email: user.email, password: 'valid-password', role: 'forged-role' }));
  assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  const response = await fetch(base + '/api/auth/session', { headers: { cookie: cookie(token) } });
  assert.equal((await response.json()).user.role, user.role);
 }
 assert.equal((await fetch(base + '/api/auth/login', json({ email: users.applicant.email, password: 'wrong' }))).status, 401);
});
test('login blocks the sixth failed attempt and cannot bypass the limit with email case or spaces', async () => {
 const email = 'limit-test@example.com';
 for (let i = 0; i < 5; i++) {
  const response = await fetch(base + '/api/auth/login', json({ email, password: 'incorrect' }));
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.remainingAttempts, 4 - i);
  if (i < 4) assert.match(data.message, new RegExp(`${4 - i} more login attempt`));
  else { assert.match(data.message, /No login attempts remaining/); assert.ok(data.retryAfter > 0); }
 }
 const before = loginCalls;
 const response = await fetch(base + '/api/auth/login', json({ email: '  LIMIT-TEST@EXAMPLE.COM  ', password: 'valid-password' }));
 assert.equal(response.status, 429);
 assert.ok(Number(response.headers.get('retry-after')) > 0);
 assert.ok(response.headers.get('ratelimit'));
 assert.equal((await response.json()).code, 'login_rate_limited');
 assert.equal(loginCalls, before, 'Blocked requests must not contact Supabase');
 const other = await fetch(base + '/api/auth/login', json({ email: 'other-test@example.com', password: 'valid-password' }));
 assert.equal(other.status, 200);
});
test('login preserves upstream Supabase rate-limit responses', async () => {
 loginError = { status: 429, code: 'over_request_rate_limit' };
 try {
  const response = await fetch(base + '/api/auth/login', json({ email: 'upstream-test@example.com', password: 'incorrect' }));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, 'login_rate_limited');
 } finally { loginError = null; }
});
test('login explains unconfirmed email and creates no cookies', async () => {
 loginError = { status: 400, code: 'email_not_confirmed' };
 try {
  const response = await fetch(base + '/api/auth/login', json({ email: 'pending@example.com', password: 'valid-password' }));
  assert.equal(response.status, 403); assert.equal((await response.json()).code, 'email_not_confirmed');
  assert.equal(response.headers.get('set-cookie'), null);
 } finally { loginError = null; }
});
test('unconfirmed users are blocked even if an upstream session exists', async () => {
 const confirmed = users.applicant.email_confirmed_at;
 users.applicant.email_confirmed_at = null;
 try {
  const login = await fetch(base + '/api/auth/login', json({ email: users.applicant.email, password: 'valid-password' }));
  assert.equal(login.status, 403); assert.equal(login.headers.get('set-cookie'), null);
  const response = await fetch(base + '/api/careers/applications', { headers: { cookie: cookie('applicant') } });
  assert.equal(response.status, 403); assert.equal((await response.json()).code, 'email_not_confirmed');
 } finally { users.applicant.email_confirmed_at = confirmed; }
});
test('signup never signs a browser in if Supabase confirmation is disabled', async () => {
 signupSession = session('applicant');
 try {
  const response = await fetch(base + '/api/auth/register', json({ name: 'New', email: 'new@example.com', password: 'StrongPass12!' }));
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'email_confirmation_disabled');
  assert.equal(response.headers.get('set-cookie'), null);
 } finally { signupSession = null; }
});

test('signup ignores forged hiring-manager role and supports email confirmation', async () => {
 const response = await fetch(base + '/api/auth/register', json({ name: 'New applicant', email: 'new@example.com', password: 'StrongPass1!', role: 'hiring_manager' }));
 assert.equal(response.status, 201); assert.equal((await response.json()).needsConfirmation, true);
 assert.deepEqual({ ...signupOptions.options.data, policies_acknowledged_at: undefined }, { name: 'New applicant', terms_version: termsVersion, privacy_notice_version: privacyVersion, policies_acknowledged_at: undefined });
 assert.ok(!Number.isNaN(Date.parse(signupOptions.options.data.policies_acknowledged_at)));
});
test('registration rejects absent, false, string and outdated policy acknowledgements', async () => {
 for (const override of [{ termsAccepted: false }, { privacyAcknowledged: false }, { termsAccepted: 'true' }, { termsVersion: 'old' }, { privacyVersion: undefined }]) {
  const before = signupOptions;
  const response = await fetch(base + '/api/auth/register', json({ name: 'New applicant', email: 'new@example.com', password: 'StrongPass12!', ...override }));
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'policy_acceptance_required');
  assert.equal(signupOptions, before, 'Unacknowledged signup must not reach Supabase');
 }
});

test('registration rejects passwords missing any required rule before contacting Supabase', async () => {
 const invalid = ['Aa1!short', 'alllowercase1!', 'ALLUPPERCASE1!', 'MissingDigits!', 'MissingSymbol12', 'Abcdefghij1 ', '', null, 123456789012, ['StrongPass1!']];
 for (const password of invalid) {
  const before = signupOptions;
  const response = await fetch(base + '/api/auth/register', json({ name: 'Applicant', email: 'new@example.com', password }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'weak_password');
  assert.equal(signupOptions, before, 'Rejected password must not reach Supabase signup');
 }
});
test('registration explains duplicate accounts, rate limits and database failures', async () => {
 try {
  for (const [code,status,expected] of [
   ['user_already_exists',422,'already exists'],
   ['over_request_rate_limit',429,'Too many attempts'],
   ['unexpected_failure',500,'Please try again later']
  ]) {
   signupError = { code, status };
   const response = await fetch(base + '/api/auth/register', json({ name: 'Applicant', email: 'new@example.com', password: 'StrongPass1!' }));
   assert.equal(response.status, status === 429 ? 429 : 400);
   const data = await response.json(); assert.equal(data.code, code === 'unexpected_failure' ? 'registration_failed' : code); assert.ok(data.message.includes(expected));
  }
 } finally { signupError = null; }
});
test('applicant cannot access manager reads, writes or resumes', async () => {
 for (const [route, method] of [['/jobs','GET'],['/jobs','POST'],['/applicants','POST'],['/updateStatus/job','PUT'],['/updateApplicantStatus/id','PUT'],['/resume/id','GET']]) {
  assert.equal((await fetch(base + '/api/recruiter' + route, { method, headers: { cookie: cookie('applicant') } })).status, 403);
 }
});
test('manager cannot access applicant-only APIs, applicant reads are owner-filtered', async () => {
 assert.equal((await fetch(base + '/api/careers/applications', { headers: { cookie: cookie('manager') } })).status, 403);
 assert.equal((await fetch(base + '/api/careers/applicants', { method: 'POST', headers: { cookie: cookie('manager') } })).status, 403);
 assert.equal((await fetch(base + '/api/careers/applications?user_id=someone-else', { headers: { cookie: cookie('applicant') } })).status, 200);
 assert.equal(requestedOwner, users.applicant.id);
});
test('job creator comes from manager session and resume URLs are signed', async () => {
 const options = json({ job_title: 'Engineer', job_type: 'Full-time', status: 'Active', created_by: 'forged' }); options.headers.cookie = cookie('manager');
 assert.equal((await fetch(base + '/api/recruiter/jobs', options)).status, 200); assert.equal(createdJob.created_by, users.manager.id);
 const download = await fetch(base + '/api/recruiter/resume/application-id', { redirect: 'manual', headers: { cookie: cookie('manager') } });
 assert.equal(download.status, 302); assert.equal(signedPath, 'applicant-id/application-id.txt');
});
test('submission ignores forged owner, email, status and compatibility score', async () => {
 const form = new FormData();
 for (const [key,value] of Object.entries({ fullName: 'Applicant', job_id: 'job', email: 'forged@example.com', user_id: 'forged-owner', compatibility_score: '100', status: 'Shortlisted' })) form.append(key,value);
 form.append('resume', new Blob(['sample resume'], { type: 'text/plain' }), 'resume.txt');
 const response = await fetch(base + '/api/careers/applicants', { method: 'POST', headers: { cookie: cookie('applicant') }, body: form });
 assert.equal(response.status, 201); assert.equal(insertedApplication.user_id, users.applicant.id);
 assert.equal(insertedApplication.email, users.applicant.email); assert.equal(insertedApplication.status, 'Reviewing'); assert.equal(insertedApplication.compatibility_score, 80);
});
test('expired access refreshes and logout clears cookies and revokes the session', async () => {
 const refreshed = await fetch(base + '/api/auth/session', { headers: { cookie: 'high5_access=expired; high5_refresh=refresh-applicant' } });
 assert.equal(refreshed.status, 200); assert.match(refreshed.headers.get('set-cookie'), /high5_access=applicant/);
 const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { cookie: cookie('applicant') } });
 assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Expires=/);
 assert.equal((await fetch(base + '/api/auth/session', { headers: { cookie: cookie('applicant') } })).status, 401);
});
