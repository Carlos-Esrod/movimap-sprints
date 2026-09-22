import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import Icon, { type IconName } from '@/components/ui/Icon';

const items: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Explorar', icon: 'map' },
  { path: '/report', label: 'Reportar', icon: 'report' },
  { path: '/activity', label: 'Actividad', icon: 'activity' },
];

function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[600] bg-surface-container-lowest border-t border-outline-variant">
      <div className="flex items-center justify-around py-2">
        {items.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-colors min-w-[72px]',
                active ? 'bg-secondary-container text-secondary' : 'text-on-surface-variant'
              )}
            >
              <Icon name={item.icon} />
              <span className="text-label-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
