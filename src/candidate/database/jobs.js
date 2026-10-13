const { publicClient, unwrap } = require('../../../lib/supabase');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/relativeTime'));
async function getJobs() {
 return unwrap(await publicClient().from('job').select('*').eq('status', 'Active').order('created_at', { ascending: false })).map(job => ({ ...job, created_at: dayjs(job.created_at).fromNow() }));
}
module.exports = { getJobs };
