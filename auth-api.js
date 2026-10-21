const { PASSWORD_REQUIREMENTS, PASSWORD_MAX_LENGTH, isValidPassword, getPasswordIssues } = require('./src/auth/passwordPolicy');
const { isValidEmail } = require('./src/auth/emailPolicy');
const INPUT_LIMITS = require('./src/auth/inputLimits');
const router = require('express').Router();
const { publicClient } = require('./lib/supabase');
const { requireUser, setSession, clearSession, cookies } = require('./session');
const { ipLimiter, accountLimiter } = require('./lib/login-rate-limit').createLoginLimiters();
router.post('/login', (req, res, next) => {
 const { email, password } = req.body || {};
 if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Email and password are required' });
 if (!isValidEmail(email, 254)) return res.status(400).json({ message: 'Enter a valid email address.' });
 next();
}, ipLimiter, accountLimiter, async (req, res) => {
 const { email, password } = req.body;
 const { data, error } = await publicClient().auth.signInWithPassword({ email: email.trim(), password });
 if (error?.code === 'email_not_confirmed') return res.status(403).json({ code: 'email_not_confirmed', message: 'Verify your email before logging in. Check your inbox and spam folder, or contact the administrator for help.' });
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
 if (!data.user?.email_confirmed_at) return res.status(403).json({ code: 'email_not_confirmed', message: 'Verify your email before logging in.' });
 setSession(res, data.session);
 res.json({ success: true });
});
router.post('/register', async (req, res) => {
 const { name, email, password } = req.body || {};
 if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Enter your name.' });
 if (name.trim().length > INPUT_LIMITS.name) return res.status(400).json({ message: `Your name must be ${INPUT_LIMITS.name} characters or fewer.` });
 if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
 if (!isValidPassword(password)) return res.status(400).json({ code: 'weak_password', message: PASSWORD_REQUIREMENTS, issues: getPasswordIssues(password) });
 // Role is assigned by the database trigger, never by signup metadata.
 const { data, error } = await publicClient().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
 if (error) {
  const messages = {
   user_already_exists: 'An account with this email already exists. Please log in instead.',
   email_exists: 'An account with this email already exists. Please log in instead.',
   weak_password: PASSWORD_REQUIREMENTS,
   email_address_not_authorized: 'Email delivery is restricted. Ask the administrator to configure Supabase SMTP.',
   email_address_invalid: 'Enter a valid email address.',
   signup_disabled: 'Unable to create an account right now. Please try again later.',
   email_provider_disabled: 'Unable to create an account right now. Please try again later.',
   over_email_send_rate_limit: 'Too many confirmation emails were requested. Please wait before trying again.',
   over_request_rate_limit: 'Too many attempts. Please wait before trying again.',
   captcha_failed: 'Unable to verify this registration. Please try again.',
   unexpected_failure: 'Registration failed. Please try again later.'
  };
  console.error('Registration rejected:', error.code || 'unknown', 'status:', error.status || 'unknown');
  const publicCodes = new Set(['user_already_exists','email_exists','weak_password','email_address_invalid','signup_disabled','email_provider_disabled','over_email_send_rate_limit','over_request_rate_limit','captcha_failed']);
  const publicCode = publicCodes.has(error.code) ? error.code : 'registration_failed';
  return res.status(error.status === 429 ? 429 : 400).json({ code: publicCode, message: messages[error.code] || 'Registration failed. Please try again or contact the administrator.' });
 }
 // Confirmation must be enabled in Supabase; signup must never create browser login cookies.
 if (data.session) return res.status(503).json({ code: 'email_confirmation_disabled', message: 'Email confirmation is not enabled. Ask the administrator to enable it in Supabase before registering.' });
 res.status(201).json({ success: true, needsConfirmation: true, message: 'Check your inbox and spam folder for the confirmation email. Verify your email, then return here to log in.' });
});
router.get('/session', requireUser, (req, res) => res.json({ user: req.user }));
router.post('/logout', async (req, res) => {
 const token = cookies(req).high5_access;
 try { if (token) await publicClient().auth.admin.signOut(token, 'local'); }
 finally { clearSession(res); }
 res.json({ success: true });
});
module.exports = router;
