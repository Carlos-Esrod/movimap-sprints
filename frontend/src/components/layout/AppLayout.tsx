import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNavigation from './BottomNavigation';
import type { Profile } from '@/types';

interface AppLayoutProps {
  profile?: Profile | null;
  onLogout: () => void;
}

function AppLayout({ profile, onLogout }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-background">
      <MobileHeader profile={profile} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar profile={profile} onLogout={onLogout} />
        <main key={location.pathname} className="flex-1 flex flex-col overflow-hidden page-enter">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}

export default AppLayout;
