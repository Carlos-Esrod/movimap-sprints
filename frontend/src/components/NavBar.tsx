import { Link, useLocation } from 'react-router-dom';

interface NavBarProps {
  profile?: { role: string; display_name: string } | null;
  onLogout: () => void;
}

function NavBar({ profile, onLogout }: NavBarProps) {
  const location = useLocation();

  const mainNavItems = [
    { path: '/', label: 'Explorar', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )},
    { path: '/report', label: 'Reportar', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    )},
    { path: '/activity', label: 'Actividad', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  const isAdmin = profile?.role === 'admin';

  return (
    <>
      {/* Desktop top navbar */}
      <header className="hidden md:block bg-white border-b px-4 py-2.5 flex items-center justify-between z-50">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-800">Movimap</h1>
          <nav className="flex items-center gap-1">
            {mainNavItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  location.pathname === item.path
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <span className="text-sm text-gray-600">{profile.display_name}</span>
              {isAdmin && (
                <Link to="/admin" className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition">
                  Admin
                </Link>
              )}
              <button onClick={onLogout} className="text-sm text-gray-600 hover:text-gray-800 px-2">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2">
                Iniciar sesión
              </Link>
              <Link to="/register" className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Mobile bottom navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-[600]">
        <div className="flex items-center justify-around py-1">
          {mainNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition min-w-[64px] ${
                location.pathname === item.path
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

export default NavBar;