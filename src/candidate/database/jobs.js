const { publicClient, unwrap } = require('../../../lib/supabase');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/relativeTime'));
async function getJobs() {
 let jobs;
 try {
  jobs = unwrap(await publicClient().from('job').select('*').eq('status', 'Active').order('created_at', { ascending: false }));
 } catch (cause) {
  throw Object.assign(new Error('Public job listings are temporarily unavailable', { cause }), {
   status: 503,
   publicMessage: 'Job listings are temporarily unavailable. Please try again later.'
  });
 }
 return jobs.map(job => ({ ...job, created_at: dayjs(job.created_at).fromNow() }));
}
module.exports = { getJobs };
