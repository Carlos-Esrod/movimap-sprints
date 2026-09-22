import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Icon from '@/components/ui/Icon';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/icon-192.png" alt="Movimap" className="w-14 h-14 rounded-xl object-cover" />
          <h1 className="mt-3 text-headline-md font-bold text-on-surface">Movimap</h1>
          <p className="text-body-md text-on-surface-variant">Inicia sesión para continuar</p>
        </div>

        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Iniciar sesión
          </Button>
        </form>

        <p className="text-center text-body-md text-on-surface-variant mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Regístrate</Link>
        </p>
      </Card>
    </div>
  );
}

export default LoginPage;
