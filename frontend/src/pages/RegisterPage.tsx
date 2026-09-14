import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '@/lib/supabase';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmMessage, setShowConfirmMessage] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await signUp(email, password, displayName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data) {
      setShowConfirmMessage(true);
      setLoading(false);
    }
  };

  if (showConfirmMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-center text-gray-800">Verifica tu email</h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Hemos enviado un email de confirmación a
          </p>
          <p className="mt-1 text-sm text-center font-medium text-gray-800">{email}</p>
          <p className="mt-3 text-sm text-center text-gray-600">
            Por favor revisa tu bandeja de entrada y haz clic en el link de confirmación para activar tu cuenta.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Ir al login
            </button>
            <button
              onClick={() => setShowConfirmMessage(false)}
              className="w-full text-blue-600 py-2 rounded hover:bg-blue-50 transition text-sm"
            >
              Volver al registro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-2">Movimap</h1>
        <p className="text-center text-gray-600 mb-6">Crea tu cuenta para participar</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
