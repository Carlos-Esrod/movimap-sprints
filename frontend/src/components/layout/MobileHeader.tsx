import { Link } from 'react-router-dom';
import Icon from '@/components/ui/Icon';

interface MobileHeaderProps {
  profile?: { role: string; display_name: string } | null;
}

function MobileHeader({ profile }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-[700] bg-surface-container-lowest border-b border-outline-variant px-margin-mobile h-14 flex items-center justify-between">
      <button aria-label="Menú" className="p-2 rounded-full hover:bg-surface-container">
        <Icon name="map" />
      </button>
      <Link to="/" className="flex items-center gap-2">
        <img src="/icon-192.png" alt="Movimap" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-on-surface text-body-lg">Movimap</span>
      </Link>
      <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold">
        {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    </header>
  );
}

export default MobileHeader;
