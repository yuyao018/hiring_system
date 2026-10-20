const router = require('express').Router();
const { unwrap } = require('./lib/supabase');

router.delete('/', async (req, res) => {
 const deletedAt = new Date().toISOString();
 unwrap(await req.db.from('profiles').update({ is_deleted: true, deleted_at: deletedAt }).eq('id', req.user.id));
 res.json({ success: true });
});

module.exports = router;
