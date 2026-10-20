const { unwrap } = require('../../../lib/supabase');
async function getApplicants(db) {
 return unwrap(await db.from('applicant').select('*,job:job!role_applied(job,job_id,created_by)').order('created_at', { ascending: false })).map(({ job, ...row }) => ({ ...row, job_name: job?.job, job_id: job?.job_id, created_by: job?.created_by, score: row.compatibility_score }));
}
async function updateApplicantStatus(db, id, status) {
 if (!['Reviewing','Shortlisted','Rejected'].includes(status)) throw Object.assign(new Error('Invalid application status'), { status: 400, publicMessage: 'Choose a valid application status.' });
 const rows = unwrap(await db.from('applicant').update({ status, updated_at: new Date().toISOString() }).eq('applicant_id', id).select());
 return { success: rows.length > 0, applicant: rows[0] || null };
}
async function softDeleteApplicant(db, id, userId) {
 let find = db.from('applicant').select('applicant_id').eq('applicant_id', id).eq('is_deleted', false);
 if (userId) find = find.eq('user_id', userId);
 if (!unwrap(await find.maybeSingle())) return { success: false };
 const deletedAt = new Date().toISOString();
 let update = db.from('applicant').update({ is_deleted: true, deleted_at: deletedAt, updated_at: deletedAt }).eq('applicant_id', id).eq('is_deleted', false);
 if (userId) update = update.eq('user_id', userId);
 unwrap(await update);
 return { success: true };
}
module.exports = { getApplicants, updateApplicantStatus, softDeleteApplicant };
