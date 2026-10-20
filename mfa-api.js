const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { publicClient } = require('./lib/supabase');
const { requireUser, setSession } = require('./session');
router.use(requireUser);
const limiter = (limit, message) => rateLimit({
 windowMs: 15 * 60 * 1000, limit, keyGenerator: req => req.user.id,
 standardHeaders: 'draft-8', legacyHeaders: false,
 handler: (req, res) => res.status(429).json({ message })
});
const verifyLimit = limiter(5, 'Too many code attempts. Wait 15 minutes before trying again.');
const setupLimit = limiter(5, 'Too many setup attempts. Wait 15 minutes before trying again.');
async function authFor(req, res) {
 // Every request gets its own auth session; never share a logged-in SDK client.
 const client = publicClient();
 const { error } = await client.auth.setSession({ access_token: req.accessToken, refresh_token: req.refreshToken || '' });
 if (error) { res.status(401).json({ message: 'Please log in again.' }); return null; }
 return client.auth;
}
const check = result => {
 if (result.error) throw Object.assign(new Error('Authenticator request failed. Please try again.'), { status: result.error.status === 429 ? 429 : 400 });
 return result.data;
};
router.get('/status', (req, res) => res.json({ ...req.user.mfa,
 factors: (req.authUser.factors || []).filter(f => f.factor_type === 'totp' && f.status === 'verified').map(f => ({ id: f.id, name: f.friendly_name || 'Authenticator app' }))
}));
router.post('/enroll', setupLimit, async (req, res, next) => {
 try {
  if (req.user.mfa.enrolled) return res.status(409).json({ message: 'An authenticator is already enabled. Use your existing app, or contact the administrator if it is lost.' });
  const auth = await authFor(req, res); if (!auth) return;
  // Remove abandoned, unverified setups only. A verified factor can never be replaced here.
  for (const factor of req.authUser.factors || []) {
   if (factor.factor_type === 'totp' && factor.status === 'unverified') check(await auth.mfa.unenroll({ factorId: factor.id }));
  }
  const data = check(await auth.mfa.enroll({ factorType: 'totp', issuer: 'High5', friendlyName: 'High5 authenticator' }));
  res.json({ factorId: data.id, qrCode: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data.totp.qr_code.replace(/^data:image\/svg\+xml[^,]*,/, '')), secret: data.totp.secret });
 } catch (error) { next(error); }
});
router.post('/verify', verifyLimit, async (req, res, next) => {
 try {
  const { factorId, code } = req.body || {};
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || typeof factorId !== 'string') return res.status(400).json({ message: 'Enter the six-digit code from your authenticator app.' });
  if (!(req.authUser.factors || []).some(f => f.id === factorId && f.factor_type === 'totp')) return res.status(400).json({ message: 'Authenticator not found. Reload this page and try again.' });
  const auth = await authFor(req, res); if (!auth) return;
  const challenge = check(await auth.mfa.challenge({ factorId }));
  const result = await auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (result.error) return res.status(result.error.status === 429 ? 429 : 400).json({ message: 'The code could not be verified. Check your phone time and enter a new code.' });
  setSession(res, result.data);
  res.json({ success: true });
 } catch (error) { next(error); }
});
module.exports = router;
