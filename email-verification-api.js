const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { publicClient } = require('./lib/supabase');
const limit = (count, options = {}) => rateLimit({
 windowMs: 15 * 60 * 1000, limit: count, standardHeaders: 'draft-8', legacyHeaders: false,
 handler: (req, res) => res.status(429).json({ message: 'Too many confirmation requests. Wait 15 minutes before trying again.' }),
 ...options
});
router.post('/confirm-email', limit(20), async (req, res) => {
 const tokenHash = req.body?.tokenHash;
 if (typeof tokenHash !== 'string' || !/^[a-f0-9]{32,128}$/i.test(tokenHash)) return res.status(400).json({ message: 'This confirmation link is invalid. Contact the administrator for help.' });
 const { data, error } = await publicClient().auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
 if (error || !data?.user?.email_confirmed_at) return res.status(error?.status === 429 ? 429 : 400).json({ message: 'This confirmation link is invalid, expired, or already used. Try logging in, or contact the administrator for help.' });
 // Confirm ownership only. Do not return tokens or sign the browser in via an email link.
 res.json({ success: true, message: 'Email verified. You can now log in with your password.' });
});
module.exports = router;
