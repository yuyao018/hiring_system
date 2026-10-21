# High5 policy pages

- Public routes: `/terms` and `/privacy`, linked in the site footer.
- Registration requires separate Terms acceptance and Privacy Notice acknowledgement, in both the form and the API.
- Current versions are in `src/legal/policyVersions.js`. Bump the relevant version when changing the text; stale signup forms must reload before submitting.
- Supabase signup metadata records server-selected `terms_version`, `privacy_notice_version` and `policies_acknowledged_at`. No schema migration is required. User metadata is not an immutable acceptance audit trail and must not be used to grant roles or permissions.
- Existing accounts are not forced to re-accept by this change.
- Resume upload links to the Privacy Notice before submission.

The text in `src/legal/LegalPage.jsx` reflects current processing: Supabase storage, configured Gmail SMTP, external Hugging Face scoring, and soft deletion without a configured permanent-deletion schedule. An administrator contact email and a specific retention schedule were not supplied. Add a real monitored contact channel when available; update the notice if processing, providers or retention change. Do not promise permanent erasure through the current Delete account button.

Restart the API and refresh the frontend after deployment. For the Caddy production setup, rebuild with `npm run build`.

Privacy-notice drafting reference: https://www.pdp.gov.my/ppdpv1/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/
