import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ReportPage from '@/pages/ReportPage';
import ActivityPage from '@/pages/ActivityPage';
import AdminPage from '@/pages/AdminPage';
import IncidentDetailPage from '@/pages/IncidentDetailPage';
import AppLayout from '@/components/layout/AppLayout';
import { supabase, getProfile, signOut } from '@/lib/supabase';

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getProfile().then(p => setProfile(p));
      } else {
        setProfile(null);
      }
    });
  }, []);

  async function loadProfile() {
    const p = await getProfile();
    setProfile(p);
    setLoading(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Cargando...</p>
        </div>
      </div>
    );
  }

  const authed = profile !== null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={authed ? <Navigate to="/" /> : <RegisterPage />} />

        <Route element={<AppLayout profile={profile} onLogout={handleLogout} />}>
          <Route path="/" element={<HomePage profile={profile} />} />
          <Route path="/report" element={authed ? <ReportPage profile={profile!} /> : <Navigate to="/login" />} />
          <Route path="/activity" element={authed ? <ActivityPage /> : <Navigate to="/login" />} />
          <Route path="/incident/:id" element={<IncidentDetailPage profile={profile} />} />
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
