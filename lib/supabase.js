const { createClient } = require('@supabase/supabase-js');
function client(key, token) {
 if (!process.env.SUPABASE_URL || !key) throw Object.assign(new Error('Supabase is not configured'), { status: 503 });
 return createClient(process.env.SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {})
 });
}
const publicClient = token => client(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY, token);
const adminClient = () => client(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
function unwrap({ data, error }) {
 if (error) throw Object.assign(new Error('Database operation failed'), {
  status: error.code === '23505' ? 409 : 500,
  publicMessage: error.code === '23505' ? 'This record conflicts with existing information.' : undefined,
  databaseCode: error.code
 });
 return data;
}
module.exports = { publicClient, adminClient, unwrap };
