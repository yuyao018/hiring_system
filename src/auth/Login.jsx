import { getPasswordIssues, isValidPassword } from './passwordPolicy';
import { readJson } from './api';
import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { dashboardFor, useAuth } from './AuthContext';
import './auth.css';
export default function Login() {
 const { user, loading, refresh } = useAuth();
 const location = useLocation(), navigate = useNavigate();
 const [register, setRegister] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
 const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 const [passwordError, setPasswordError] = useState(false), [messageType, setMessageType] = useState('error');
 const passwordIssues = register && passwordError ? getPasswordIssues(password) : [];
 if (loading) return <p>Loading...</p>;
 if (user) return <Navigate to={dashboardFor(user)} replace />;
 async function submit(event) {
  event.preventDefault(); setBusy(true); setMessage(''); setMessageType('error');
  try {
   if (register && !isValidPassword(password)) { setPasswordError(true); return; }
   setPasswordError(false);
   const response = await fetch(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
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
  <h1>{register ? 'Create applicant account' : 'Welcome back'}</h1><p>{register ? 'Apply for jobs and track your applications.' : 'Applicants and hiring managers sign in here.'}</p>
  {register && <label>Full name<input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" /></label>}
  <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
  <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 12 : undefined} onInvalid={() => { if (register) setPasswordError(true); }} aria-invalid={passwordIssues.length > 0 || undefined} aria-describedby={register ? (passwordIssues.length ? 'password-error' : 'password-requirements') : undefined} autoComplete={register ? 'new-password' : 'current-password'} /></label>
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
  {message && <div role={messageType === 'error' ? 'alert' : 'status'} className={`auth-message auth-message-${messageType}`}>{message}</div>}
  <button disabled={busy} type="submit">{busy ? 'Please wait...' : register ? 'Create account' : 'Log in'}</button>
  <button disabled={busy} type="button" className="auth-secondary" onClick={() => { setRegister(!register); setMessage(''); setPasswordError(false); }}>{register ? 'Already have an account? Log in' : 'New applicant? Create an account'}</button>
  <Link to="/">Browse jobs</Link>
 </form></main>;
}
