const { adminClient, unwrap } = require('../../../lib/supabase');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const CompatibilityScorer = require('../services/compatibilityScorer');
async function addApplicants(user, data, file) {
 const db = adminClient();
 const job = unwrap(await db.from('job').select('job_id,status').eq('job_id', data.job_id).maybeSingle());
 if (!job || job.status !== 'Active') throw Object.assign(new Error('This job is no longer accepting applications'), { status: 400 });
 if (!data.fullName?.trim() || !file) throw Object.assign(new Error('Name and resume are required'), { status: 400 });
 const id = randomUUID();
 const resume = `${user.id}/${id}${path.extname(file.originalname).toLowerCase()}`;
 const bucket = db.storage.from(process.env.SUPABASE_RESUME_BUCKET || 'resumes');
 let uploaded = false;
 try {
  let compatibility_score = null, compatibility_breakdown = null;
  try {
   const scored = await new CompatibilityScorer().calculateCompatibilityScore(file.path, data.job_id, file.originalname);
   compatibility_score = scored.overallScore; compatibility_breakdown = JSON.stringify(scored.detailedBreakdown);
  } catch (error) { console.error('Resume scoring failed:', error.message); }
  unwrap(await bucket.upload(resume, await fs.readFile(file.path), { contentType: file.mimetype, upsert: false })); uploaded = true;
  return unwrap(await db.from('applicant').insert({ applicant_id: id, user_id: user.id, applicant_name: data.fullName.trim(), email: user.email,
   contact_number: data.phone, address: data.address, personality_test_score: data.mbti, personality_type: data.personality_type,
   role_applied: data.job_id, status: 'Reviewing', resume, compatibility_score, compatibility_breakdown }).select().single());
 } catch (error) {
  if (uploaded) { const cleanup = await bucket.remove([resume]); if (cleanup.error) console.error('Resume cleanup failed:', cleanup.error.message); }
  if (error.status === 409) error.message = "You have already applied for this job";
  throw error;
 }
}
module.exports = { addApplicants };
