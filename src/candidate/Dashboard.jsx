import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import { useAuth } from '../auth/AuthContext';
export default function ApplicantDashboard() {
 const { user } = useAuth();
 const [applications, setApplications] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
 useEffect(() => {
  let active = true;
  fetch('/api/careers/applications').then(async response => {
   const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to load applications');
   if (active) setApplications(data.applications);
  }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, []);
 return <><Navbar /><main className="application-list"><h1>Hello, {user.name}</h1><p>Track your applications and find your next opportunity.</p><Link to="/">Browse open jobs</Link>
  <h2>My applications</h2>{loading ? <p>Loading applications...</p> : error ? <p role="alert">{error}</p> : applications.length === 0 ? <p>You have not applied for any jobs yet.</p> : applications.map(application => <article key={application.applicant_id}>
   <h3>{application.job?.job || 'Job no longer available'}</h3><p>{application.job?.job_type}</p><p>Status: <strong>{application.status}</strong></p><p>Applied {new Date(application.created_at).toLocaleDateString()}</p>
  </article>)}
 </main></>;
}
