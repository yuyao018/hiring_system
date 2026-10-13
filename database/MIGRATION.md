# Move legacy data to Supabase

Use a new Supabase project and retain a backup of the old PostgreSQL database and resume folder. The application no longer connects to the old database; changing `.env` alone does not transfer data.

1. Apply `schema.sql` before creating Supabase Auth users.
2. Recreate/invite each old administrator as a Supabase Auth user. Assign `hiring_manager` in `public.profiles` through a trusted administrative connection. Never expose a role-changing API to ordinary users. For new confirmed accounts the `scripts/create-user.js` script handles both steps.
3. Map each old `admin.admin_id` to the new user's Auth/profile UUID. Export jobs, preserve their `job_id` values, replace `created_by` using that mapping, and normalize status to `Active`, `Draft`, or `Closed` before importing into `public.job`.
4. Create/invite an applicant Auth account for each applicant email, then map legacy applications to those new profile IDs through `user_id`. Existing plaintext passwords must not be imported; users need a Supabase-supported signup/invitation/password-reset flow. Decide how email verification will be established before provisioning confirmed accounts.
5. Import applications after jobs and profiles. Preserve `applicant_id` and `role_applied`, scores and personality data; remove any legacy email uniqueness constraint from the export process. The new uniqueness rule is `(user_id, role_applied)`.
6. Upload each resume to the private `resumes` bucket as `<user_id>/<applicant_id>.<extension>`, then update that application's `resume` to the exact storage object path. Do not import local filesystem paths as resume URLs.
7. Check record counts, job creators, application ownership, scores and downloads using both roles before switching users to the new deployment.

No records are migrated or deleted by the application or provisioning script. Do not grant applicants permission to modify profiles, application ownership or compatibility scores. If accounts already existed before the auth trigger was installed, create missing profile rows administratively with the correct account UUID and role before allowing login.
