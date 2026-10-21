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
 if (req.user && req.db) return next();
 try {
  const saved = cookies(req);
  if (!saved.high5_access && !saved.high5_refresh) return res.status(401).json({ message: 'Please log in' });
  const auth = publicClient();
  let token = saved.high5_access, refreshToken = saved.high5_refresh;
  let result = token ? await auth.auth.getUser(token) : { error: true };
  if (result.error && saved.high5_refresh) {
   const refreshed = await auth.auth.refreshSession({ refresh_token: saved.high5_refresh });
   if (!refreshed.error && refreshed.data.session) {
    setSession(res, refreshed.data.session); token = refreshed.data.session.access_token; refreshToken = refreshed.data.session.refresh_token;
    result = await auth.auth.getUser(token);
   }
  }
  if (result.error || !result.data?.user) { clearSession(res); return res.status(401).json({ message: 'Session expired. Please log in.' }); }
  if (!result.data.user.email_confirmed_at) {
   clearSession(res);
   return res.status(403).json({ code: 'email_not_confirmed', message: 'Verify your email before logging in.' });
  }
  req.db = publicClient(token);
  const profile = unwrap(await req.db.from('profiles').select('id,name,role').eq('id', result.data.user.id).maybeSingle());
  if (!profile) { clearSession(res); return res.status(403).json({ message: 'This account has been deactivated' }); }
  if (!['applicant', 'hiring_manager'].includes(profile.role)) return res.status(403).json({ message: 'Account has no supported role' });
  // Decode assurance only AFTER getUser has validated this access token with Supabase.
  let aal = 'aal1';
  try { aal = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).aal || 'aal1'; } catch (_) {}
  const factors = result.data.user.factors || [];
  const enrolled = factors.some(factor => factor.status === 'verified');
  req.user = { ...profile, email: result.data.user.email, mfa: {
   required: profile.role === 'hiring_manager' || enrolled,
   enrolled, verified: aal === 'aal2'
  } };
  req.authUser = result.data.user;
  req.refreshToken = refreshToken;
  req.accessToken = token;
  next();
 } catch (error) { next(error); }
}
function requireMfa(req, res, next) {
 if (req.user.mfa.required && !req.user.mfa.verified) return res.status(403).json({
  code: 'mfa_required', message: req.user.mfa.enrolled ? 'Enter your authenticator code to continue.' : 'Set up an authenticator app to continue.'
 });
 next();
}
const requireRole = role => [requireUser, requireMfa, (req, res, next) => req.user.role === role ? next() : res.status(403).json({ message: 'You do not have access to this area' })];
module.exports = { requireMfa, requireUser, requireRole, setSession, clearSession, cookies };
