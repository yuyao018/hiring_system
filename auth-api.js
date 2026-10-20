const { PASSWORD_REQUIREMENTS, isValidPassword, getPasswordIssues } = require('./src/auth/passwordPolicy');
const router = require('express').Router();
const { publicClient } = require('./lib/supabase');
const { requireUser, setSession, clearSession, cookies } = require('./session');
const { ipLimiter, accountLimiter } = require('./lib/login-rate-limit').createLoginLimiters();
router.post('/login', ipLimiter, (req, res, next) => {
 const { email, password } = req.body || {};
 if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Email and password are required' });
 next();
}, accountLimiter, async (req, res) => {
 const { email, password } = req.body;
 const { data, error } = await publicClient().auth.signInWithPassword({ email: email.trim(), password });
 if (error?.status === 429 || error?.code === 'over_request_rate_limit') return res.status(429).json({ code: 'login_rate_limited', message: 'Login is temporarily limited. Please wait and try again.' });
 if (error || !data?.session) {
  const quotas = [req.loginAccountRate, req.loginIpRate];
  const remainingAttempts = Math.max(0, Math.min(...quotas.map(quota => quota.remaining)));
  if (remainingAttempts === 0) {
   const resetAt = Math.max(...quotas.filter(quota => quota.remaining <= 0).map(quota => quota.resetTime.getTime()));
   const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
   const minutes = Math.ceil(retryAfter / 60);
   return res.status(401).json({ code: 'invalid_credentials', remainingAttempts, retryAfter,
    message: `Invalid email or password. No login attempts remaining. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
  }
  return res.status(401).json({ code: 'invalid_credentials', remainingAttempts,
   message: `Invalid email or password. You have ${remainingAttempts} more login attempt${remainingAttempts === 1 ? '' : 's'} before temporary blocking.` });
 }
 setSession(res, data.session);
 res.json({ success: true });
});
router.post('/register', async (req, res) => {
 const { name, email, password } = req.body;
 if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) return res.status(400).json({ message: 'Enter your name and email address' });
 if (!isValidPassword(password)) return res.status(400).json({ code: 'weak_password', message: PASSWORD_REQUIREMENTS, issues: getPasswordIssues(password) });
 // Role is assigned by the database trigger, never by signup metadata.
 const { data, error } = await publicClient().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
 if (error) {
  const messages = {
   user_already_exists: 'An account with this email already exists. Please log in instead.',
   email_exists: 'An account with this email already exists. Please log in instead.',
   weak_password: PASSWORD_REQUIREMENTS,
   email_address_invalid: 'Enter a valid email address.',
   signup_disabled: 'Registration is disabled in Supabase. Enable new user signups in Authentication settings.',
   email_provider_disabled: 'Email and password registration is disabled in Supabase.',
   over_email_send_rate_limit: 'Too many confirmation emails were requested. Please wait before trying again.',
   over_request_rate_limit: 'Too many attempts. Please wait before trying again.',
   captcha_failed: 'Supabase requires CAPTCHA verification. Configure CAPTCHA support before registering.',
   unexpected_failure: 'Supabase could not save your account. Check the Authentication logs and user-profile database trigger.'
  };
  console.error('Registration rejected:', error.code || 'unknown', 'status:', error.status || 'unknown');
  return res.status(error.status === 429 ? 429 : 400).json({ code: error.code || 'registration_failed', message: messages[error.code] || 'Registration failed. Please try again or contact the administrator.' });
 }
 if (data.session) setSession(res, data.session);
 res.status(201).json({ success: true, needsConfirmation: !data.session, message: data.session ? 'Account created' : 'Check your email to confirm your account, then log in.' });
});
router.get('/session', requireUser, (req, res) => res.json({ user: req.user }));
router.post('/logout', async (req, res) => {
 const token = cookies(req).high5_access;
 try { if (token) await publicClient().auth.admin.signOut(token, 'local'); }
 finally { clearSession(res); }
 res.json({ success: true });
});
module.exports = router;
