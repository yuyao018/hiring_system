# High5 recruitment system — Supabase edition

Applicants and hiring managers share `/login`. Supabase Auth verifies their credentials, and a protected `profiles` record determines their role. Applicants land on `/applicant/dashboard` and see only their own applications. Hiring managers land on `/recruiter/dashboard` to manage jobs and review applicants. Public job browsing remains at `/`; submitting an application requires an applicant account.

## Set up Supabase

1. Create a Supabase project. Run `database/schema.sql` in its SQL Editor **before creating accounts**. It creates profiles, jobs, applications, role policies and the private `resumes` storage bucket. This script is for a fresh project and safely rejects the original legacy applicant schema.
2. Copy `.env.example` to `.env` in this folder. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` using your project API settings. Legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names also work. Secret keys must remain on the server; do not prefix them with `REACT_APP_` or put them in browser code.
3. Under Supabase Authentication settings, enable email/password authentication and public signup if applicants should register themselves. Configure the Site URL (development: `http://localhost:3000`) and confirmation email redirects. Signup respects the project's email confirmation setting: applicants with confirmation enabled must confirm before logging in.
4. Run `npm install`.
5. Create the first hiring manager with the server-only provisioning script. In PowerShell:

   ```powershell
   $env:ACCOUNT_PASSWORD = 'choose-a-strong-password'
   node scripts/create-user.js "Hiring Manager" "manager@example.com" hiring_manager
   Remove-Item Env:ACCOUNT_PASSWORD
   ```

   The script confirms this provisioned account's email. Use it only for accounts you intend to provision. Replace the example name and email. Public registration always creates an applicant; there is no role selector or client-controlled promotion. You can provision an applicant with the same script using `applicant` as its last argument.
6. Run `npm run dev`, then visit `http://localhost:3000/login`.

## Access rules

| Area | Applicant | Hiring manager | Signed out |
| --- | --- | --- | --- |
| Active job listings | Yes | Yes | Yes |
| Submit an application | Yes | No | No |
| Applicant dashboard | Own applications | No | No |
| Hiring dashboard, jobs and applicant review | No | Yes | No |
| Resume downloads | No | Yes, temporary signed links | No |

Role enforcement exists in frontend routes, Express handlers, and Supabase row-level policies. Roles live in `profiles`; authenticated users have no write grants to that table. Signup's database trigger always uses `applicant`, ignoring user-supplied role metadata. The service key is used only in server code for provisioning and scored application/resume insertion, after the handler has authenticated the applicant. Applicants cannot insert forged scores directly through the Supabase API.

Supabase access and refresh tokens are held in HTTP-only, same-site cookies. Requests validate the access token with Supabase Auth and reload the trusted profile role. Expired access tokens refresh automatically when possible. For HTTPS deployment set `NODE_ENV=production` so cookies use Secure. The server uses user-scoped Supabase clients for reads and manager changes, preserving row-level security. Public browsing uses the publishable key. Sessions survive server restarts.

Resumes are uploaded to the private `resumes` bucket. Set `SUPABASE_RESUME_BUCKET` only if you also update the schema's bucket name and storage policy. Files are limited to 10 MB and PDF, DOCX, DOC or TXT extensions. Temp files are cleaned after submission; failed database inserts trigger storage cleanup. A user may apply to multiple jobs, once per job. The application email and owner come from the authenticated account, never the form. Resume scoring and optional `HUGGINGFACE_API_KEY` enhancement are retained.

## Existing data

This refactor does not automatically move existing PostgreSQL records or passwords. Do not run the new schema over the old tables. See `database/MIGRATION.md` for the required account and data mapping. Original project folders are unchanged.

## Run and verify

- `npm run dev`: frontend on 3000 and API on 5000.
- `npm run build`: production frontend.
- `npm run server`: serve the production build and API on `PORT` (default 5000).
- `npm run test:integration`: role, ownership, session and API tests with an in-process Supabase double; no cloud credentials needed.

The `/api/health` endpoint checks server liveness, not Supabase connectivity. For live verification, create one applicant and one manager, publish a job, submit a resume, confirm that only its owner sees the application, then shortlist it as the manager and verify the updated applicant status. Try each role's forbidden API and dashboard paths. Cloud connectivity, SQL policies and Storage must also be checked against your configured Supabase project; mocked tests do not establish deployed policy behavior.
