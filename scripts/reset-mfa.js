const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { adminClient } = require('../lib/supabase');
const [userId, factorId, confirmation] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function main() {
 if (!uuid.test(userId || '')) throw new Error('Usage: node scripts/reset-mfa.js USER_UUID [FACTOR_UUID --identity-verified]');
 const admin = adminClient().auth.admin;
 const { data, error } = await admin.mfa.listFactors({ userId });
 if (error) throw new Error('Could not list authenticators. Check the user ID and server credentials.');
 if (!factorId) {
  console.table(data.factors.map(f => ({ id: f.id, type: f.factor_type, status: f.status })));
  console.log('Verify the account owner through a trusted channel before resetting a factor.');
  return;
 }
 if (!uuid.test(factorId) || confirmation !== '--identity-verified') throw new Error('Reset requires a factor UUID and --identity-verified after manual identity verification.');
 if (!data.factors.some(f => f.id === factorId && f.factor_type === 'totp')) throw new Error('This TOTP factor does not belong to the specified user.');
 const deleted = await admin.mfa.deleteFactor({ userId, id: factorId });
 if (deleted.error) throw new Error('Authenticator reset failed.');
 console.log('Authenticator removed. The user must log in again. Managers must enroll a new authenticator.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
