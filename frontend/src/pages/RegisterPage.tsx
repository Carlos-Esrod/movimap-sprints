import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Icon from '@/components/ui/Icon';

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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm p-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-secondary-fixed-dim/40 flex items-center justify-center">
            <Icon name="check-circle" className="text-on-surface" size={24} />
          </div>
          <h2 className="mt-4 text-headline-md font-bold text-center text-on-surface">Verifica tu email</h2>
          <p className="mt-2 text-body-md text-center text-on-surface-variant">Hemos enviado un email de confirmación a</p>
          <p className="mt-1 text-body-md text-center font-semibold text-on-surface">{email}</p>
          <p className="mt-3 text-body-md text-center text-on-surface-variant">Por favor revisa tu bandeja de entrada y haz clic en el link de confirmación para activar tu cuenta.</p>
          <div className="mt-6 space-y-3">
            <Button onClick={() => navigate('/login')} fullWidth>Ir al login</Button>
            <Button variant="ghost" fullWidth onClick={() => setShowConfirmMessage(false)}>Volver al registro</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/icon-192.png" alt="Movimap" className="w-14 h-14 rounded-xl object-cover" />
          <h1 className="mt-3 text-headline-md font-bold text-on-surface">Movimap</h1>
          <p className="text-body-md text-on-surface-variant">Crea tu cuenta para participar</p>
        </div>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" size="lg" fullWidth loading={loading}>Crear cuenta</Button>
        </form>

        <p className="text-center text-body-md text-on-surface-variant mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
}

export default RegisterPage;
