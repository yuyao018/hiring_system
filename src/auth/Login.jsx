import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { dashboardFor, useAuth } from './AuthContext';
import './auth.css';
export default function Login() {
 const { user, loading, refresh } = useAuth();
 const location = useLocation(), navigate = useNavigate();
 const [register, setRegister] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
 const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
 if (loading) return <p>Loading...</p>;
 if (user) return <Navigate to={dashboardFor(user)} replace />;
 async function submit(event) {
  event.preventDefault(); setBusy(true); setMessage('');
  try {
   const response = await fetch(`/api/auth/${register ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
   const data = await response.json();
   if (!response.ok) throw new Error(data.message || 'Unable to sign in');
   if (data.needsConfirmation) { setMessage(data.message); setRegister(false); setPassword(''); return; }
   const current = await refresh();
   if (!current) throw new Error('Please log in to continue');
   // Only resume an application flow for an applicant; role decides dashboard access.
   const from = location.state?.from;
   navigate(current.role === 'applicant' && from?.pathname === '/apply' ? from.pathname : dashboardFor(current), { replace: true, state: from?.state });
  } catch (err) { setMessage(err.message); }
  finally { setBusy(false); }
 }
 return <main className="auth-page"><Link className="auth-brand" to="/">High5</Link><form className="auth-card" onSubmit={submit}>
  <h1>{register ? 'Create applicant account' : 'Welcome back'}</h1><p>{register ? 'Apply for jobs and track your applications.' : 'Applicants and hiring managers sign in here.'}</p>
  {register && <label>Full name<input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" /></label>}
  <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
  <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} /></label>
  {message && <p role="status" className="auth-message">{message}</p>}
  <button disabled={busy} type="submit">{busy ? 'Please wait...' : register ? 'Create account' : 'Log in'}</button>
  <button disabled={busy} type="button" className="auth-secondary" onClick={() => { setRegister(!register); setMessage(''); }}>{register ? 'Already have an account? Log in' : 'New applicant? Create an account'}</button>
  <Link to="/">Browse jobs</Link>
 </form></main>;
}
