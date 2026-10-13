const { publicClient, unwrap } = require('./lib/supabase');
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
function cookies(req) {
 return Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(pair => pair.length === 2));
}
function setSession(res, session) {
 res.cookie('high5_access', session.access_token, { ...cookieOptions, maxAge: session.expires_in * 1000 });
 res.cookie('high5_refresh', session.refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
}
function clearSession(res) {
 res.clearCookie('high5_access', cookieOptions); res.clearCookie('high5_refresh', cookieOptions);
}
async function requireUser(req, res, next) {
 try {
  const saved = cookies(req);
  if (!saved.high5_access && !saved.high5_refresh) return res.status(401).json({ message: 'Please log in' });
  const auth = publicClient();
  let token = saved.high5_access;
  let result = token ? await auth.auth.getUser(token) : { error: true };
  if (result.error && saved.high5_refresh) {
   const refreshed = await auth.auth.refreshSession({ refresh_token: saved.high5_refresh });
   if (!refreshed.error && refreshed.data.session) {
    setSession(res, refreshed.data.session); token = refreshed.data.session.access_token;
    result = await auth.auth.getUser(token);
   }
  }
  if (result.error || !result.data?.user) { clearSession(res); return res.status(401).json({ message: 'Session expired. Please log in.' }); }
  req.db = publicClient(token);
  const profile = unwrap(await req.db.from('profiles').select('id,name,role').eq('id', result.data.user.id).single());
  if (!['applicant', 'hiring_manager'].includes(profile.role)) return res.status(403).json({ message: 'Account has no supported role' });
  req.user = { ...profile, email: result.data.user.email };
  req.accessToken = token;
  next();
 } catch (error) { next(error); }
}
const requireRole = role => [requireUser, (req, res, next) => req.user.role === role ? next() : res.status(403).json({ message: 'You do not have access to this area' })];
module.exports = { requireUser, requireRole, setSession, clearSession, cookies };
