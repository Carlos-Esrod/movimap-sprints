import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ReportPage from '@/pages/ReportPage';
import ActivityPage from '@/pages/ActivityPage';
import AdminPage from '@/pages/AdminPage';
import { supabase, getProfile } from '@/lib/supabase';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage profile={profile} />} />
        <Route path="/login" element={profile ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={profile ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/report" element={profile ? <ReportPage profile={profile} /> : <Navigate to="/login" />} />
        <Route path="/activity" element={profile ? <ActivityPage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={profile?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
