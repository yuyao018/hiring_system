import { Link, useNavigate } from 'react-router-dom';
import { dashboardFor, useAuth } from '../../../auth/AuthContext';
import './Navbar.css';
export default function Navbar() {
 const { user, logout } = useAuth(), navigate = useNavigate();
 async function signOut() {
  try { await logout(); navigate('/login', { replace: true }); }
  catch (err) { window.alert(err.message); }
 }
 async function deleteProfile() {
  if (!window.confirm('Delete your account profile? Your account will be deactivated and you will be signed out.')) return;
  try {
   const response = await fetch('/api/profile', { method: 'DELETE' });
   const data = await response.json();
   if (!response.ok) throw new Error(data.message || 'Unable to delete your profile');
   await logout().catch(() => {});
   navigate('/login', { replace: true });
  } catch (err) { window.alert(err.message); }
 }
 return <header className="header"><Link to="/" className="logo">High5</Link><nav className="navbar">
  <Link to="/">Careers</Link>{user ? <><Link to={dashboardFor(user)}>My dashboard</Link><button onClick={deleteProfile} className="deleteProfileBtn">Delete account</button><button onClick={signOut}>Log out</button></> : <Link to="/login">Log in</Link>}
 </nav></header>;
}
