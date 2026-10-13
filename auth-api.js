const router = require('express').Router();
const { publicClient } = require('./lib/supabase');
const { requireUser, setSession, clearSession, cookies } = require('./session');
router.post('/login', async (req, res) => {
 const { email, password } = req.body;
 if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Email and password are required' });
 const { data, error } = await publicClient().auth.signInWithPassword({ email: email.trim(), password });
 if (error || !data.session) return res.status(401).json({ message: 'Invalid email or password' });
 setSession(res, data.session);
 res.json({ success: true });
});
router.post('/register', async (req, res) => {
 const { name, email, password } = req.body;
 if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Enter your name, email and a password of at least 8 characters' });
 // Role is assigned by the database trigger, never by signup metadata.
 const { data, error } = await publicClient().auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
 if (error) {
  const messages = {
   user_already_exists: 'An account with this email already exists. Please log in instead.',
   email_exists: 'An account with this email already exists. Please log in instead.',
   weak_password: 'Your password does not meet the required strength. Use a longer password with uppercase, lowercase, numbers and symbols.',
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
