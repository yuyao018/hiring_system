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
 if (error) return res.status(400).json({ message: 'Unable to register. Check your details and try again.' });
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
