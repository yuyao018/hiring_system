const { publicClient, unwrap } = require('../../../lib/supabase');
function parse(job) {
 const split = text => (text || '').toLowerCase().split(/[;,\n\r]+/).map(x => x.trim()).filter(Boolean);
 return { job_id: job.job_id, job_title: job.job, job_type: job.job_type, experience: job.experience, education: job.education,
 qualifications: job.education ? [job.education.toLowerCase()] : [], skills: split(job.requirement).slice(0, 10), projects: split(job.description).slice(0, 5),
 achievements: ['team leadership','project management','problem solving','communication','champion','volunteer'], description: job.description, created_at: job.created_at };
}
async function getJobRequirements(id) { return parse(unwrap(await publicClient().from('job').select('*').eq('job_id', id).eq('status','Active').single())); }
async function getAllJobsWithRequirements() { return unwrap(await publicClient().from('job').select('*').eq('status','Active')).map(parse); }
module.exports = { getJobRequirements, getAllJobsWithRequirements };
