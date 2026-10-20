# High5 authenticator MFA

Implemented behavior:
- Hiring managers must enroll and verify a TOTP authenticator before accessing private features.
- Applicants may enable MFA through **Security**. Once enabled, a code is required on subsequent password logins.
- QR enrollment and six-digit verification use Supabase Auth. Tokens stay in HttpOnly session cookies.
- Private API access requires AAL2 for managers and any account with a verified factor. MFA setup and logout remain accessible at AAL1.
- Code submissions are limited to five per account in a 15-minute window, including successful submissions. Setup is limited separately. The local limit resets when the API restarts; Supabase also applies its own limits.

## Supabase setup for the existing project

1. Open your Supabase project, then **Authentication > Multi-Factor Authentication**. Ensure **TOTP / App Authenticator** enrollment and verification are enabled. Supabase enables TOTP by default. This is application-user MFA, separate from MFA for your Supabase dashboard account.
2. Open **SQL Editor**, create a query, paste the entire contents of `database/002_totp_mfa.sql`, and run it. This adds restrictive MFA policies for jobs, applications and private resumes, preserving existing ownership rules. Do not replace existing tables. For a new project, `database/schema.sql` already includes these policies.
3. Check each manager's row in `public.profiles` has `role = 'hiring_manager'`. Applicant accounts keep `role = 'applicant'`. Public signup cannot assign manager roles.
4. Keep the existing Supabase URL and publishable/anon key in the server configuration. The existing secret/service-role key stays server-only. No additional TOTP key or new environment variable is needed.
5. Restart the Express server. If serving the production frontend through Caddy, run `npm run build` first. Open the local HTTPS site and log in again.

## Test the flow

1. Log in as a hiring manager. The authenticator setup screen should appear before the dashboard.
2. Click **Set up authenticator app**, scan the QR code using Google Authenticator or Microsoft Authenticator, and enter the current six-digit code. Setup is complete only after verification.
3. Log out and log in again. Enter an authenticator code to reach the dashboard. A wrong code must leave access blocked.
4. Before completing MFA, replay a private API request using that password-only session. Expect HTTP 403 with `code: mfa_required`. After verification, the upgraded session should allow role-authorized requests.
5. As an applicant without MFA, confirm normal access still works. Open **Security**, enable MFA, then log out and log in to confirm the code challenge appears.
6. Verify the database policies in the live project using password-only (AAL1) and verified (AAL2) user sessions with the publishable key, not the service-role key. AAL1 managers must receive no private application rows and cannot modify jobs. Existing ownership restrictions still apply after AAL2. SQL policies can hide rows rather than return HTTP 403.

Automated API tests use mocked Supabase responses. They validate application gating, setup, verification, cookies and guessing limits; they do not validate your deployed Supabase settings or SQL policies.

## Lost authenticator recovery

There is no password-only self-service MFA reset. An administrator must verify the account owner's identity through a trusted channel before removing their factor. From the server directory:

```powershell
# Read-only: list factor IDs for a user from Authentication > Users.
node scripts/reset-mfa.js USER_UUID
# Only after manual identity verification:
node scripts/reset-mfa.js USER_UUID FACTOR_UUID --identity-verified
```

The recovery script uses the existing server-only Supabase admin key. Managers must enroll again after reset. Do not remove factors directly through SQL. This operation removes a factor; it does not promise immediate invalidation of already-issued access tokens. Follow your incident-response process if the account is compromised.

For report screenshots, redact the QR code, setup secret, passwords and cookie values.

Supabase reference: https://supabase.com/docs/guides/auth/auth-mfa/totp
