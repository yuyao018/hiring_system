const { unwrap } = require('../../../lib/supabase');
const getJob = async db => unwrap(await db.from('job').select('job_id,job,created_by'));
const getAllJobs = async db => unwrap(await db.from('job').select('*').order('created_at', { ascending: false }));
const editJob = async (db, id) => unwrap(await db.from('job').select('*').eq('job_id', id));
function fields(data) {
 if (!data.job_title?.trim() || !['Full-time','Part-time','Intern'].includes(data.job_type)) throw Object.assign(new Error('Job title and valid job type are required'), { status: 400 });
 return { job: data.job_title.trim(), job_type: data.job_type, education: data.education, experience: data.experience, description: data.overview,
 requirement: Array.isArray(data.requirements) ? data.requirements.filter(r => r.trim()).join(';') : data.requirements };
}
function validStatus(status) {
 if (!['Active','Draft','Closed'].includes(status)) throw Object.assign(new Error('Invalid job status'), { status: 400 });
 return status;
}
const createJob = async (db, data) => unwrap(await db.from('job').insert({ ...fields(data), status: validStatus(data.status || 'Draft'), created_by: data.created_by }).select().single());
async function updateJob(db, id, data) {
 const rows = unwrap(await db.from('job').update({ ...fields(data), updated_at: new Date().toISOString() }).eq('job_id', id).select());
 return { success: rows.length > 0, job: rows[0] };
}
const updateStatus = async (db, id, status) => unwrap(await db.from('job').update({ status: validStatus(status), updated_at: new Date().toISOString() }).eq('job_id', id).select());
module.exports = { getJob, getAllJobs, editJob, createJob, updateJob, updateStatus };
