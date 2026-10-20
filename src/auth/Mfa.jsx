import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { dashboardFor, useAuth } from './AuthContext';
import { readJson } from './api';
import './auth.css';
 async function request(action, body) {
  const response = await fetch('/api/auth/mfa/' + action, body ? {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : {});
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.message || 'Unable to check your authenticator.');
  return data;
 }

export default function Mfa({ settings = false }) {
 const { user, loading, error: sessionError, refresh, logout } = useAuth();
 const navigate = useNavigate();
 const [status, setStatus] = useState(null), [setup, setSetup] = useState(null);
 const [code, setCode] = useState(''), [factorId, setFactorId] = useState('');
 const [error, setError] = useState(''), [busy, setBusy] = useState(false);
 useEffect(() => {
  let active = true;
  if (user) request('status').then(data => {
   if (active) { setStatus(data); setFactorId(data.factors[0]?.id || ''); }
  }).catch(err => { if (active) setError(err.message); });
  return () => { active = false; };
 }, [user]);
 if (loading) return <p>Loading...</p>;
 if (sessionError) return <p role="alert">{sessionError} <button onClick={() => refresh().catch(() => {})}>Retry</button></p>;
 if (!user) return <Navigate to="/login" replace />;
 if (!settings && (!user.mfa?.required || user.mfa.verified)) return <Navigate to={dashboardFor(user)} replace />;
 const enabled = status?.enrolled && status?.verified;
 async function enroll() {
  setBusy(true); setError('');
  try { const data = await request('enroll', {}); setSetup(data); setFactorId(data.factorId); }
  catch (err) { setError(err.message); }
  finally { setBusy(false); }
 }
 async function verify(event) {
  event.preventDefault(); setBusy(true); setError('');
  try {
   await request('verify', { factorId, code });
   setSetup(null); setCode('');
   const current = await refresh();
   if (!current?.mfa?.verified) throw new Error('Unable to confirm your session. Please log in again.');
   navigate(dashboardFor(current), { replace: true });
  } catch (err) { setError(err.message); setCode(''); }
  finally { setBusy(false); }
 }
 async function signOut() {
  setBusy(true); setSetup(null); setError('');
  try { await logout(); navigate('/login', { replace: true }); }
  catch (err) { setError(err.message); }
  finally { setBusy(false); }
 }
 return <main className="auth-page"><Link className="auth-brand" to="/">High5</Link><section className="auth-card">
  <h1>{enabled ? 'Account security' : status?.enrolled ? 'Verify your login' : 'Set up an authenticator'}</h1>
  <p>{user.role === 'hiring_manager' ? 'Hiring managers must use an authenticator app to access recruitment information.' : 'Add an extra layer of protection. Once enabled, an authenticator code is required when you log in.'}</p>
  {error && <div className="auth-message auth-message-error" role="alert">{error}</div>}
  {!status && !error && <p>Checking your authenticator...</p>}
  {!status && error && <button onClick={() => window.location.reload()}>Reload</button>}
  {enabled && <p className="mfa-success" role="status">Authenticator enabled. This session is verified.</p>}
  {status && !status.enrolled && !setup && <button disabled={busy} onClick={enroll}>{busy ? 'Preparing...' : 'Set up authenticator app'}</button>}
  {setup && <div className="mfa-setup">
   <ol><li>Open Google Authenticator, Microsoft Authenticator, or another TOTP app.</li><li>Add an account and scan this QR code.</li><li>Enter the six-digit code below to finish setup.</li></ol>
   <img className="mfa-qr" src={setup.qrCode} alt="Scan this QR code with your authenticator app" />
   <details><summary>Cannot scan the code?</summary><p>Enter this setup key in your app. Keep it private.</p><code className="mfa-secret">{setup.secret}</code></details>
  </div>}
  {status && !enabled && (status.enrolled || setup) && <form onSubmit={verify}>
   {status.factors.length > 1 && <label>Authenticator<select value={factorId} onChange={e => setFactorId(e.target.value)}>{status.factors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
   <label>Authenticator code<input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" /></label>
   <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying...' : setup ? 'Enable authenticator' : 'Verify and continue'}</button>
  </form>}
  <p className="mfa-help">Lost access to your authenticator? Contact the administrator to verify your identity and reset it.</p>
  {(!user.mfa?.required || user.mfa.verified) && <Link to={dashboardFor(user)}>Back to dashboard</Link>}
  <button className="auth-secondary" disabled={busy} onClick={signOut}>Log out</button>
 </section></main>;
}
