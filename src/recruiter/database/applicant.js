const { unwrap } = require('../../../lib/supabase');
async function getApplicants(db) {
 return unwrap(await db.from('applicant').select('*,job:job!role_applied(job,job_id,created_by)').order('created_at', { ascending: false })).map(({ job, ...row }) => ({ ...row, job_name: job?.job, job_id: job?.job_id, created_by: job?.created_by, score: row.compatibility_score }));
}
async function updateApplicantStatus(db, id, status) {
 if (!['Reviewing','Shortlisted','Rejected'].includes(status)) throw Object.assign(new Error('Invalid application status'), { status: 400 });
 const rows = unwrap(await db.from('applicant').update({ status, updated_at: new Date().toISOString() }).eq('applicant_id', id).select());
 return { success: rows.length > 0, applicant: rows[0] || null };
}
module.exports = { getApplicants, updateApplicantStatus };
