import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Careers from './candidate/App';
import Apply from './candidate/Apply';
import Success from './candidate/SuccessPage';
import Login from './auth/Login';
import Mfa from './auth/Mfa';
import ApplicantDashboard from './candidate/Dashboard';
import Dashboard from './recruiter/Dashboard';
import Form from './recruiter/Form';
import Managejob from './recruiter/Managejob';
import { Edit } from './recruiter/Edit';
import { AuthProvider, dashboardFor, useAuth } from './auth/AuthContext';
import './candidate/index.css';
import './recruiter/index.css';
function Protected({ role, children }) {
 const { user, loading, error, refresh } = useAuth(), location = useLocation();
 if (loading) return <p>Loading...</p>;
 if (error) return <p role="alert">{error} <button onClick={() => refresh().catch(() => {})}>Retry</button></p>;
 if (!user) return <Navigate to="/login" state={{ from: { pathname: location.pathname, state: location.state } }} replace />;
 if (user.mfa?.required && !user.mfa.verified) return <Navigate to="/mfa" replace />;
 return user.role === role ? children : <Navigate to={dashboardFor(user)} replace />;
}
function App() {
 const { pathname } = useLocation();
 const manager = children => <Protected role="hiring_manager">{children}</Protected>;
 const applicant = children => <Protected role="applicant">{children}</Protected>;
 return <div className={['/login', '/mfa', '/security'].includes(pathname) ? 'auth' : pathname.startsWith('/recruiter') ? 'recruiter' : 'candidate'}><Routes>
  <Route path="/" element={<Careers />} />
  <Route path="/login" element={<Login />} />
  <Route path="/mfa" element={<Mfa />} />
  <Route path="/security" element={<Mfa settings />} />
  <Route path="/apply" element={applicant(<Apply />)} />
  <Route path="/application-success" element={applicant(<Success />)} />
  <Route path="/applicant/dashboard" element={applicant(<ApplicantDashboard />)} />
  <Route path="/recruiter" element={<Navigate to="/login" replace />} />
  <Route path="/recruiter/dashboard" element={manager(<Dashboard />)} />
  <Route path="/recruiter/form" element={manager(<Form />)} />
  <Route path="/recruiter/managejob" element={manager(<Managejob />)} />
  <Route path="/recruiter/edit/:jobId" element={manager(<Edit />)} />
  <Route path="*" element={<Navigate to="/" replace />} />
 </Routes></div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>);
