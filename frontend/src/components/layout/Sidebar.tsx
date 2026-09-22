import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import Icon, { type IconName } from '@/components/ui/Icon';

interface SidebarProps {
  profile?: { role: string; display_name: string } | null;
  onLogout: () => void;
}

const navItems: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Explorar', icon: 'map' },
  { path: '/report', label: 'Reportar', icon: 'report' },
  { path: '/activity', label: 'Actividad', icon: 'activity' },
];

function Sidebar({ profile, onLogout }: SidebarProps) {
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-surface-container border-r border-outline-variant">
      <div className="flex flex-col items-center py-8">
        <img src="/icon-192.png" alt="Movimap" className="w-16 h-16 rounded-xl object-cover" />
        <h1 className="mt-3 text-headline-md font-bold text-on-surface">Movimap</h1>
        <p className="text-label-sm text-on-surface-variant mt-1">Accesibilidad urbana</p>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-label-md font-semibold transition-colors',
                active ? 'bg-secondary-container text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low'
              )}
            >
              <Icon name={item.icon} className="flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-label-md font-semibold transition-colors',
              location.pathname === '/admin' ? 'bg-secondary-container text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low'
            )}
          >
            <Icon name="settings" className="flex-shrink-0" />
            <span>Administración</span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-outline-variant">
        {profile ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
              {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-semibold text-on-surface truncate">{profile.display_name}</p>
              <button onClick={onLogout} className="text-label-sm text-on-surface-variant hover:text-secondary flex items-center gap-1">
                <Icon name="logout" size={14} /> Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Link to="/login" className="block w-full text-center px-4 py-2.5 rounded bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-colors">
              Iniciar sesión
            </Link>
            <Link to="/register" className="block w-full text-center px-4 py-2.5 rounded border border-outline-variant text-on-surface text-label-md font-semibold hover:bg-surface-container-low transition-colors">
              Registrarse
            </Link>
          </div>
        )}
        <div className="mt-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-label-sm text-on-surface-variant hover:text-on-surface">
            <Icon name="help" size={16} /> Ayuda
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-label-sm text-on-surface-variant hover:text-on-surface">
            <Icon name="settings" size={16} /> Ajustes
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
