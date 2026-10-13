import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
const AuthContext = createContext(null);
export const dashboardFor = user => user?.role === 'hiring_manager' ? '/recruiter/dashboard' : '/applicant/dashboard';
export function AuthProvider({ children }) {
 const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
 const refresh = useCallback(async () => {
  try {
   const response = await fetch('/api/auth/session');
   if (response.status === 401) { setUser(null); setError(''); return null; }
   const data = await response.json();
   if (!response.ok) throw new Error(data.message || 'Unable to check your account');
   setUser(data.user); setError(''); return data.user;
  } catch (err) { setUser(null); setError(err.message); throw err; }
  finally { setLoading(false); }
 }, []);
 useEffect(() => { refresh().catch(() => {}); }, [refresh]);
 const logout = async () => {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Unable to log out. Please try again.');
  setUser(null); localStorage.removeItem('adminData');
 };
 return <AuthContext.Provider value={{ user, loading, error, refresh, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
