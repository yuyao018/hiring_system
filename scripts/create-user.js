const { PASSWORD_REQUIREMENTS, isValidPassword } = require('../src/auth/passwordPolicy');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { adminClient, unwrap } = require('../lib/supabase');
(async () => {
 const [name,email,role = 'applicant'] = process.argv.slice(2);
 if (!name || !email || !process.env.ACCOUNT_PASSWORD || !['applicant','hiring_manager'].includes(role)) throw new Error('Usage: node scripts/create-user.js "Name" "email" applicant|hiring_manager; set ACCOUNT_PASSWORD first');
 if (!isValidPassword(process.env.ACCOUNT_PASSWORD)) throw new Error(PASSWORD_REQUIREMENTS);
 const db = adminClient();
 const data = unwrap(await db.auth.admin.createUser({ email, password: process.env.ACCOUNT_PASSWORD, email_confirm: true, user_metadata: { name } }));
 try { unwrap(await db.from('profiles').update({ role }).eq('id', data.user.id).select().single()); }
 catch (error) { await db.auth.admin.deleteUser(data.user.id); throw error; }
 console.log(`Created ${role} account for ${email}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
