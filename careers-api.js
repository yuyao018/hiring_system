const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { requireRole } = require('./session');
const { unwrap } = require('./lib/supabase');
const { getJobs } = require('./src/candidate/database/jobs');
const { addApplicants } = require('./src/candidate/database/applicants');
const { validateResumeFile } = require('./lib/validate-resume');
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;
const upload = multer({ dest: path.join(__dirname, 'uploads/temp'), limits: { fileSize: MAX_RESUME_SIZE_BYTES }, fileFilter(req, file, done) {
 if (!['.pdf','.docx','.doc','.txt'].includes(path.extname(file.originalname).toLowerCase())) return done(Object.assign(new Error('Unsupported resume type'), { status: 400, publicMessage: 'Upload a PDF, DOCX, DOC, or TXT resume.' }));
 done(null, true);
} });
async function validateUploadedResume(req, res, next) {
 try { await validateResumeFile(req.file); next(); }
 catch (error) {
  if (req.file) await fs.unlink(req.file.path).catch(() => {});
  next(error);
 }
}
router.get('/jobs', async (req, res) => res.json(await getJobs()));
router.get('/applications', ...requireRole('applicant'), async (req, res) => {
 const applications = unwrap(await req.db.from('applicant').select('applicant_id,applicant_name,status,created_at,role_applied,job:job!role_applied(job,job_type)').eq('user_id', req.user.id).order('created_at', { ascending: false }));
 res.json({ applications });
});
router.delete('/applications/:applicationId', ...requireRole('applicant'), async (req, res) => {
 const result = await require('./src/recruiter/database/applicant').softDeleteApplicant(req.db, req.params.applicationId, req.user.id);
 res.status(result.success ? 200 : 404).json(result);
});
router.post('/applicants', ...requireRole('applicant'), upload.single('resume'), validateUploadedResume, async (req, res) => {
 try { await addApplicants(req.user, req.body, req.file); res.status(201).json({ message: 'Submitted successfully!' }); }
 finally { if (req.file) await fs.unlink(req.file.path).catch(() => {}); }
});
module.exports = router;
