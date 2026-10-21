import { getPasswordIssues, isValidPassword, PASSWORD_MAX_LENGTH } from './passwordPolicy';
import { isValidEmail } from './emailPolicy';
import INPUT_LIMITS from './inputLimits';
import { readJson } from './api';
import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { dashboardFor, useAuth } from './AuthContext';
import { termsVersion, privacyVersion } from '../legal/policyVersions';
import './auth.css';
export default function Login() {
 const { user, loading, refresh } = useAuth();
 const location = useLocation(), navigate = useNavigate();
 const [register, setRegister] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
 const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 const [passwordError, setPasswordError] = useState(false), [messageType, setMessageType] = useState('error');
 const [termsAccepted, setTermsAccepted] = useState(false), [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
 const passwordIssues = register && passwordError ? getPasswordIssues(password) : [];
 const emailInvalid = register && email.length > 0 && !isValidEmail(email);
 const emailLimit = register ? INPUT_LIMITS.email : 254;
 if (loading) return <p>Loading...</p>;
 if (user) return <Navigate to={dashboardFor(user)} replace />;
 async function submit(event) {
  event.preventDefault(); setBusy(true); setMessage(''); setMessageType('error');
  try {
   if (register && !isValidEmail(email)) { setMessage('Enter a valid email address.'); return; }
   if (register && !isValidPassword(password)) { setPasswordError(true); return; }
   setPasswordError(false);
   if (register && (!termsAccepted || !privacyAcknowledged)) { setMessage('Please agree to the Terms & Conditions and acknowledge the Privacy Notice.'); return; }
   const response = await fetch(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, ...(register ? { termsAccepted, privacyAcknowledged, termsVersion, privacyVersion } : {}) }) });
   const data = await readJson(response);
   if (!response.ok) throw new Error(data.message || 'Unable to sign in');
   if (data.needsConfirmation) { setMessageType('info'); setMessage(data.message); setRegister(false); setPassword(''); return; }
   const current = await refresh();
   if (!current) throw new Error('Please log in to continue');
   // Only resume an application flow for an applicant; role decides dashboard access.
   const from = location.state?.from;
   navigate(!current.mfa?.required && current.role === 'applicant' && from?.pathname === '/apply' ? from.pathname : dashboardFor(current), { replace: true, state: from?.state });
  } catch (err) { setMessage(err.message); }
  finally { setBusy(false); }
 }
 return <main className="auth-page"><Link className="auth-brand" to="/">High5</Link><form className="auth-card" onSubmit={submit}>
  <h1>{register ? 'Create applicant account' : 'Welcome back'}</h1><p>{register ? 'Verify your email after signing up, then log in to apply for jobs.' : 'Applicants and hiring managers sign in here.'}</p>
  {register && <label>Full name<input value={name} onChange={e => setName(e.target.value)} required maxLength={INPUT_LIMITS.name} autoComplete="name" /><small className="character-count">{name.length}/{INPUT_LIMITS.name} characters</small></label>}
  <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={emailLimit} autoComplete="email" aria-invalid={emailInvalid || undefined} aria-describedby={[emailInvalid && 'email-error', 'email-count'].filter(Boolean).join(' ')} /><small id="email-count" className="character-count">{email.length}/{emailLimit} characters</small></label>
  {emailInvalid && <p id="email-error" role="alert" className="auth-message auth-message-error">Enter a valid email address, for example name@example.com.</p>}
  <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 12 : undefined} maxLength={register ? PASSWORD_MAX_LENGTH : undefined} onInvalid={() => { if (register) setPasswordError(true); }} aria-invalid={passwordIssues.length > 0 || undefined} aria-describedby={register ? (passwordIssues.length ? 'password-error' : 'password-requirements') : undefined} autoComplete={register ? 'new-password' : 'current-password'} />{register && <small className="character-count">{password.length}/{PASSWORD_MAX_LENGTH} characters</small>}</label>
  {register && passwordIssues.length === 0 && <section id="password-requirements" className="password-guidance" aria-labelledby="password-guidance-title">
   <h2 id="password-guidance-title">Password requirements</h2>
   <ul>
    <li>At least <strong>12 characters</strong></li>
    <li>At least one uppercase letter <span>(A-Z)</span></li>
    <li>At least one lowercase letter <span>(a-z)</span></li>
    <li>At least one digit <span>(0-9)</span></li>
    <li>At least one special character <span>(e.g. !, @, #)</span></li>
   </ul>
  </section>}
  {passwordIssues.length > 0 && <div id="password-error" role="alert" className="auth-message auth-message-error">
   <strong>Your password is missing:</strong>
   <ul>{passwordIssues.map(issue => <li key={issue}>{issue}</li>)}</ul>
  </div>}
  {register && <div className="policy-consent">
   <label><input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} required /><span>I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link>.</span></label>
   <label><input type="checkbox" checked={privacyAcknowledged} onChange={e => setPrivacyAcknowledged(e.target.checked)} required /><span>I have read the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link>, including resume processing and data sharing.</span></label>
  </div>}
  {message && <div role={messageType === 'error' ? 'alert' : 'status'} className={`auth-message auth-message-${messageType}`}>{message}</div>}
  <button disabled={busy} type="submit">{busy ? 'Please wait...' : register ? 'Create account' : 'Log in'}</button>
  <button disabled={busy} type="button" className="auth-secondary" onClick={() => { setRegister(!register); setMessage(''); setPasswordError(false); }}>{register ? 'Already have an account? Log in' : 'New applicant? Create an account'}</button>
  <Link to="/">Browse jobs</Link>
 </form></main>;
}
