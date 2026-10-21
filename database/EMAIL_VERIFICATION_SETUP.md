# Email verification setup

## Supabase configuration (required)

1. In Authentication > Sign In / Providers, enable **Confirm email** for email/password registration (the setting may appear under the Email provider or user signup settings). Save the change. Supabase must enforce this so unconfirmed users cannot obtain sessions through its Auth API.
2. In Authentication > URL Configuration, set **Site URL** to the frontend origin you actually use, without a trailing slash. For the Caddy HTTPS site use `https://localhost`. If using the React development site instead, use `http://localhost:3000`. Do not use port 5000 unless that is the site users open.
3. In Authentication > Emails > Templates > Confirm sign up, use subject **Confirm your High5 email address** and paste `database/email-confirmation.html` as the body. The link must use `{{ .SiteURL }}/verify-email#token_hash={{ .TokenHash }}`. This custom template is required for the new confirmation page. It sends no access or refresh token to the browser.
4. Configure custom SMTP in Supabase's email settings to send to real applicant addresses. The default sender is restricted to permitted project-team recipients and has low sending limits. The API cannot remove these restrictions. Do not put SMTP passwords in frontend code or Git.
5. Restart the API. If using the built site through Caddy, rebuild the frontend (`npm run build`). No new environment variables or database migration are needed.

The local site must be reachable on the device where the email link is opened. `localhost` on a phone refers to the phone; for this local test, open the link on the computer running High5. Change Site URL and SMTP settings appropriately before deployment.

## Behavior and evidence

- Register with a new, real email address. High5 displays an inbox/spam reminder and creates no browser login session.
- Attempt login before confirmation: expect HTTP 403 `email_not_confirmed` and no session cookies. Private APIs also reject any unconfirmed user.
- Open the email link and click **Confirm email address**. The page verifies the one-time token through Supabase, displays success, and asks the user to log in with their password. It does not skip password login or mandatory MFA.
- After verification, log in normally. Enrolled users still complete MFA.
- Invalid, expired or previously used links show an error and a link back to login.
- The token is carried in the email URL fragment, removed from the address bar on opening, and submitted only when the user clicks Confirm. Refreshing that page loses the token: reopen the original email link or contact the administrator. Tokens and passwords must be redacted from report screenshots.

Existing users previously auto-confirmed by Supabase remain confirmed. Enabling confirmation does not prove they previously verified ownership; test this change with a new account. Signup returning an immediate session indicates Confirm email is disabled: High5 reports a configuration error instead of signing the browser in, but enabling the Supabase setting is essential.

Automated tests mock Supabase. Live SMTP delivery, the template, and Supabase's project setting must be verified separately.

References:
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
