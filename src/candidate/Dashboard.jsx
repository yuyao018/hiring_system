import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import { useAuth } from '../auth/AuthContext';
export default function ApplicantDashboard() {
 const { user } = useAuth();
 const [applications, setApplications] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [actionError, setActionError] = useState('');
 async function deleteApplication(application) {
  if (!window.confirm(`Delete your application for ${application.job?.job || 'this job'}? It will be removed from your active list and retained in the audit history.`)) return;
  try {
   const response = await fetch(`/api/careers/applications/${application.applicant_id}`, { method: 'DELETE' });
   const data = await response.json();
   if (!response.ok || !data.success) throw new Error(data.message || 'Unable to delete this application');
   setApplications(current => current.filter(item => item.applicant_id !== application.applicant_id));
   setActionError('');
  } catch (err) { setActionError('Unable to delete this application. Please try again.'); }
 }
 useEffect(() => {
  let active = true;
  fetch('/api/careers/applications').then(async response => {
   const data = await response.json(); if (!response.ok) throw new Error('Unable to load applications right now. Please try again later.');
   if (active) setApplications(data.applications);
  }).catch(() => { if (active) setError('Unable to load applications right now. Please try again later.'); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, []);
 return <><Navbar /><main className="application-list"><h1>Hello, {user.name}</h1><p>Track your applications and find your next opportunity.</p><Link to="/">Browse open jobs</Link>
  <h2>My applications</h2>{actionError && <p role="alert">{actionError}</p>}{loading ? <p>Loading applications...</p> : error ? <p role="alert">{error}</p> : applications.length === 0 ? <p>You have not applied for any jobs yet.</p> : applications.map(application => <article key={application.applicant_id}>
   <h3>{application.job?.job || 'Job no longer available'}</h3><p>{application.job?.job_type}</p><p>Status: <strong>{application.status}</strong></p><p>Applied {new Date(application.created_at).toLocaleDateString()}</p><button type="button" onClick={() => deleteApplication(application)}>Delete application</button>
  </article>)}
 </main></>;
}
