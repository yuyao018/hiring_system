const router = require('express').Router();
const { requireRole } = require('./session');
const { unwrap } = require('./lib/supabase');
const jobs = require('./src/recruiter/database/job');
const applicants = require('./src/recruiter/database/applicant');
router.use(...requireRole('hiring_manager'));
router.get('/jobs', async (req, res) => res.json({ success: true, jobs: await jobs.getJob(req.db) }));
router.get('/allJobs', async (req, res) => res.json({ success: true, jobs: await jobs.getAllJobs(req.db) }));
router.get('/editJob/:jobId', async (req, res) => {
 const rows = await jobs.editJob(req.db, req.params.jobId);
 res.status(rows.length ? 200 : 404).json({ success: !!rows.length, job: rows[0] });
});
router.put('/updateJob/:jobId', async (req, res) => {
 const result = await jobs.updateJob(req.db, req.params.jobId, req.body);
 res.status(result.success ? 200 : 404).json(result);
});
router.put('/updateStatus/:jobId', async (req, res) => {
 const rows = await jobs.updateStatus(req.db, req.params.jobId, req.body.status);
 res.status(rows.length ? 200 : 404).json({ success: !!rows.length, job: rows[0] });
});
router.post('/jobs', async (req, res) => res.json({ success: true, job: await jobs.createJob(req.db, { ...req.body, created_by: req.user.id }) }));
router.post('/applicants', async (req, res) => res.json({ success: true, applicants: await applicants.getApplicants(req.db) }));
router.put('/updateApplicantStatus/:applicantId', async (req, res) => {
 const result = await applicants.updateApplicantStatus(req.db, req.params.applicantId, req.body.status);
 res.status(result.success ? 200 : 404).json(result);
});
router.get('/resume/:id', async (req, res) => {
 const row = unwrap(await req.db.from('applicant').select('resume').eq('applicant_id', req.params.id).maybeSingle());
 if (!row?.resume) return res.status(404).json({ message: 'Resume not found' });
 const signed = unwrap(await req.db.storage.from(process.env.SUPABASE_RESUME_BUCKET || 'resumes').createSignedUrl(row.resume, 60));
 res.redirect(signed.signedUrl);
});
module.exports = router;
