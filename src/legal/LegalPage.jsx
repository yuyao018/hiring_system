import React from 'react';
import { Link } from 'react-router-dom';
import './legal.css';
export function LegalLinks() {
 return <footer className="legal-footer" aria-label="Legal information"><span>High5</span><Link to="/terms">Terms &amp; Conditions</Link><Link to="/privacy">Privacy Notice</Link></footer>;
}
const terms = [
 ['Using High5', 'High5 lets applicants browse jobs, submit applications and review their application status. Hiring managers use the platform to manage recruitment. Creating an account requires accepting these terms.'],
 ['Account security', 'Provide accurate account details and verify your email before signing in. Keep your password and authenticator codes private, and log out on shared devices. Hiring managers must complete authenticator verification before accessing protected recruitment features.'],
 ['Acceptable use', 'Submit truthful qualifications and only upload documents you are entitled to share. Do not upload malware, abusive content, false credentials or unnecessary sensitive information. Do not access another person’s account or records, impersonate others, send spam, or interfere with the service.'],
 ['Your applications and uploaded content', 'You retain ownership of the documents you upload. Submitting an application allows High5 to store and process it for recruitment and make it available to authorised hiring managers, as explained in the Privacy Notice. Only submit information relevant to your application.'],
 ['Compatibility scores and recruitment decisions', 'High5 generates compatibility scores and personality-assessment results to support review. Automated results may be incomplete or inaccurate and do not guarantee suitability, an interview or employment. Hiring managers should review the underlying application and use their own judgement.'],
 ['Availability and account closure', 'Features and job listings may change or become unavailable. Misuse may result in access being restricted. The Delete account control deactivates your profile; it does not immediately erase stored information. See the Privacy Notice for details.'],
 ['Questions and updates', 'Contact the High5 administrator through the contact channel supplied with this service for help, suspicious activity or questions about these terms. The version date identifies the terms displayed here.']
];
const privacy = [
 ['Information we collect', 'Registration collects your name, email address and password through Supabase Auth. Applications collect your name, contact number, address, resume, job selection and personality-assessment responses or results. High5 also stores application status, compatibility scores and relevant account and change-history records.'],
 ['Why we use it', 'We use this information to create and secure your account, verify email ownership, process applications, calculate compatibility scores, let authorised hiring managers review candidates, and track recruitment status. Required fields are marked in the forms; without them, registration or submission cannot be completed.'],
 ['Resume processing and AI', 'High5 extracts text from your resume to assess qualifications, skills and other job-related information. Its AI enhancement can send up to the first 1,000 characters of extracted resume text, together with job requirements, to Hugging Face for semantic-similarity scoring. That text may contain personal information. Automated scores can be inaccurate; they support recruitment review and are not a guarantee of a hiring outcome.'],
 ['Who receives your information', 'Authorised hiring managers can review applications and resumes. Supabase provides authentication, database and file storage. The configured email provider processes your email address and confirmation messages; the current test setup uses Gmail SMTP. Hugging Face may process the resume text described above. Service-provider processing locations and retention depend on their arrangements and may be outside your country.'],
 ['Storage, retention and deletion', 'Application records and resumes are stored in Supabase. High5 uses access controls, protected session cookies and HTTPS in its configured deployment. No automatic permanent-deletion schedule is currently configured. Deleting an account or application hides or deactivates the record; stored resumes, account records and change history may remain. Contact the administrator to request access, correction or permanent deletion and to discuss any retention limits.'],
 ['Cookies and account protection', 'High5 uses essential access and refresh cookies to maintain your login. Email confirmation checks control of your email address, and authenticator verification adds protection for hiring managers. Keep passwords, confirmation links, QR setup keys and verification codes private.'],
 ['Your choices and contact', 'Review your details before submitting them and avoid including identification documents, bank details, health information or other unnecessary sensitive content. You can stop using the service or deactivate your profile. For questions, corrections, access or deletion requests, contact the High5 administrator through the contact channel supplied with this service. Do not send passwords or verification codes with a request.']
];
export default function LegalPage({ type }) {
 const isPrivacy = type === 'privacy', title = isPrivacy ? 'Privacy Notice' : 'Terms & Conditions';
 const sections = isPrivacy ? privacy : terms;
 return <main className="legal-page"><div className="legal-top"><Link className="legal-brand" to="/">High5</Link><Link to="/login">Back to login</Link></div>
  <article className="legal-document"><header><span className="legal-eyebrow">HIGH5 · YOUR INFORMATION &amp; RESPONSIBILITIES</span><h1>{title}</h1><p>Last updated: 21 October 2026</p>
   <nav aria-label="Policy pages"><Link to="/terms" aria-current={!isPrivacy ? 'page' : undefined}>Terms &amp; Conditions</Link><Link to="/privacy" aria-current={isPrivacy ? 'page' : undefined}>Privacy Notice</Link></nav>
  </header>
  <div className="legal-summary">{isPrivacy ? 'Know what you share, how your resume is processed, and what happens to your data.' : 'Clear expectations for using High5 safely and responsibly.'}</div>
  {sections.map(([heading, text], i) => <section key={heading}><h2>{i + 1}. {heading}</h2><p>{text}</p></section>)}
  <div className="legal-related">Read our <Link to={isPrivacy ? '/terms' : '/privacy'}>{isPrivacy ? 'Terms & Conditions' : 'Privacy Notice'}</Link>.</div>
  </article>
 </main>;
}
