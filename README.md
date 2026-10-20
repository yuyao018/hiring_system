# High5 recruitment system — Supabase edition

Applicants and hiring managers share `/login`. Supabase Auth verifies their credentials, and a protected `profiles` record determines their role. Applicants land on `/applicant/dashboard` and see only their own applications. Hiring managers land on `/recruiter/dashboard` to manage jobs and review applicants. Signed-out visitors have read-only access to published job listings at `/`. Applying prompts sign-in and resumes the selected application afterward. All feature APIs are private by default, apart from published job browsing and the login/registration endpoints. Role restrictions still apply after sign-in.

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

## Confirmation link opens an unreachable localhost page

Keep `npm run dev` running while opening confirmation emails on this computer. The website runs on port 3000, independently of the API's `PORT=5000`. `FRONTEND_PORT` can override the frontend port; if changed, update Supabase Authentication > URL Configuration to match. For the default local setup use Site URL `http://localhost:3000` and allow redirects to `http://localhost:3000/**`.

If email verification redirects to an unavailable page, verification may already have succeeded. Start the app and try logging in at `http://localhost:3000/login`. A localhost link only works on the computer running the app. For other devices or a deployed website, configure the corresponding reachable site URL in Supabase.

## Password requirements

New accounts require at least 12 characters, including uppercase and lowercase letters, a digit, and a special character. Whitespace alone does not count as a special character. The registration form, Express registration endpoint, and account-provisioning script share this policy. Existing accounts can still log in using their current passwords. Configure the same password policy in Supabase Authentication settings to also enforce it for requests made directly to Supabase, outside the application API.

## Login throttling

The login endpoint allows five failed authentication attempts per normalized email address in a 15-minute window. The sixth attempt returns HTTP 429 before contacting Supabase, including a `Retry-After` header, rate-limit headers and a user-friendly message. Successful requests do not consume the failed-attempt quota; earlier failures remain counted until the window resets. A second limit permits 30 failed login requests per client IP per 15 minutes to discourage attempts across many accounts. Supabase throttling responses also remain HTTP 429 rather than being disguised as invalid credentials.

Only loopback proxies are trusted for forwarded client IPs, matching the local Caddy and React proxy setup. If moving to another proxy, configure its trusted addresses explicitly and restrict direct access to the backend. Counters use process memory and reset on restart; use a shared persistent store such as Redis for multi-instance or restart-resilient deployment. Account-wide throttling can temporarily block a legitimate user targeted by repeated failures, so monitor this trade-off and consider MFA or challenge-based controls for production.

Failed-login messages show the remaining attempts (4, 3, 2, 1, then 0) without identifying whether the email or password was incorrect. When the quota is exhausted, the response includes the remaining wait time. The IP quota can shorten the displayed allowance if the connection is already throttled.

## Security headers and ZAP scans

The Express server sends a restrictive Content Security Policy, clickjacking and MIME-sniffing protections, a referrer policy, and a minimal permissions policy. It disables the Express fingerprint header, sends `Cache-Control: no-store` for API responses, and does not enable cross-origin access because the frontend uses same-origin API routes. HSTS is sent only for HTTPS requests in production.

`npm start` and `npm run dev` serve the React development server on an internal loopback port behind a local proxy on `FRONTEND_PORT` (default `3000`). The proxy applies the browser security headers and removes the development server's wildcard CORS headers. Stop any React server that was already running before using the new scripts; an older process can keep port 3000 and bypass the proxy. A successful start prints `Hardened development origin listening on http://localhost:3000`, while React runs internally on port 3001. The development bundle still contains development-only source text, so run ZAP against the production build or deployed HTTPS site rather than using development bundle findings as deployment findings. `npm run build` disables public source maps. Google Fonts imports were removed; the UI uses local system fonts so the browser does not request third-party font files.

To inspect the production build locally, run `npm run build`, set `NODE_ENV=production`, then run `npm run server` and point ZAP at `http://localhost:5000`. HSTS is only sent when the production request reaches Express over HTTPS, so verify that header against the deployed HTTPS URL.
