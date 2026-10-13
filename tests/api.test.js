const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
let server, base, signupOptions, insertedApplication, createdJob, requestedOwner, signedPath;
const users = {
 applicant: { id: 'applicant-id', email: 'applicant@example.com', name: 'Applicant', role: 'applicant' },
 manager: { id: 'manager-id', email: 'manager@example.com', name: 'Manager', role: 'hiring_manager' }
};
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
 const identity = revoked.has(token) ? null : users[token];
 return {
  from: table => query(table, identity, admin),
  storage: { from: () => ({
   upload: async () => ({ data: {}, error: null }), remove: async () => ({ data: {}, error: null }),
   createSignedUrl: async path => { signedPath = path; return { data: { signedUrl: 'https://storage.example.com/signed-resume' }, error: null }; }
  }) },
  auth: {
   signInWithPassword: async ({ email, password }) => {
    const role = email === users.manager.email ? 'manager' : 'applicant';
    return password === 'valid-password' ? { data: { session: session(role) } } : { error: true, data: {} };
   },
   getUser: async jwt => users[jwt] && !revoked.has(jwt) ? { data: { user: users[jwt] } } : { error: true },
   refreshSession: async ({ refresh_token }) => {
    const jwt = refresh_token.replace('refresh-', '');
    return users[jwt] && !revoked.has(jwt) ? { data: { session: session(jwt) } } : { error: true };
   },
   signUp: async options => { signupOptions = options; return { data: { session: null }, error: null }; },
   admin: { signOut: async jwt => { revoked.add(jwt); return { error: null }; } }
  }
 };
}
const cookie = role => `high5_access=${role}; high5_refresh=refresh-${role}`;
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
test('signup ignores forged hiring-manager role and supports email confirmation', async () => {
 const response = await fetch(base + '/api/auth/register', json({ name: 'New applicant', email: 'new@example.com', password: 'long-password', role: 'hiring_manager' }));
 assert.equal(response.status, 201); assert.equal((await response.json()).needsConfirmation, true);
 assert.deepEqual(signupOptions.options.data, { name: 'New applicant' });
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
