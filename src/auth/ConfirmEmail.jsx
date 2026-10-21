import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { readJson } from './api';
import './auth.css';
export default function ConfirmEmail() {
 const location = useLocation(), navigate = useNavigate();
 const [tokenHash, setTokenHash] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token_hash') || '');
 const [busy, setBusy] = useState(false), [success, setSuccess] = useState(false), [error, setError] = useState('');
 useEffect(() => {
  // Keep the one-time credential out of the address bar and subsequent history entries.
  if (location.hash) navigate('/verify-email', { replace: true });
 }, [location.hash, navigate]);
 async function confirm() {
  setBusy(true); setError('');
  try {
   const response = await fetch('/api/auth/confirm-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenHash }) });
   const data = await readJson(response);
   if (!response.ok) throw new Error(data.message || 'Unable to confirm your email.');
   setTokenHash(''); setSuccess(true);
  } catch (err) { setError(err.message); }
  finally { setBusy(false); }
 }
 return <main className="auth-page"><Link className="auth-brand" to="/">High5</Link><section className="auth-card">
  <h1>{success ? 'Email verified' : 'Confirm your email'}</h1>
  {success ? <div role="status" className="auth-message">Your email has been verified. Log in with your password to continue.</div> : <>
   <p>Confirm this email address to finish registering your High5 account.</p>
   {!tokenHash && <div className="auth-message auth-message-error" role="alert">Open the link in your confirmation email. If it has expired or you refreshed this page, contact the administrator for help.</div>}
   {error && <div className="auth-message auth-message-error" role="alert">{error}</div>}
   {tokenHash && <button onClick={confirm} disabled={busy}>{busy ? 'Verifying...' : 'Confirm email address'}</button>}
  </>}
  <p className="confirmation-action"><Link className={success ? 'auth-primary-link' : 'auth-back-link'} to="/login">{success ? 'Log in' : 'Back to login'}</Link></p>
 </section></main>;
}
