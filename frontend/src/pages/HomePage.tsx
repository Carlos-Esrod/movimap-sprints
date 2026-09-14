import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '@/components/map/MapView';
import NavBar from '@/components/NavBar';
import IncidentDetailModal from '@/components/IncidentDetailModal';
import { supabase, getIncidents, getPublicIncidentById, signIn, signOut } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_COLORS, STATUS_LABELS, NOMINATIM_URL, NOMINATIM_LIMIT } from '@/lib/constants';
import type { Incident, Profile, SearchResult } from '@/types';

interface HomePageProps {
  profile: Profile | null;
}

function HomePage({ profile }: HomePageProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showIncidentList, setShowIncidentList] = useState(false);
  const [reportOrigin, setReportOrigin] = useState<'gps' | 'map' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => searchAddress(searchQuery), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const channel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const id = (payload.new as Incident).id;
        if (id) handleRealtimeIncident(id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
        const id = (payload.new as Incident).id;
        if (id) handleRealtimeIncident(id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'incidents' }, (payload) => {
        const old = payload.old as Incident;
        if (old?.id) setIncidents(prev => prev.filter(i => i.id !== old.id));
      })
      .on('system', { event: 'error' }, (event) => {
        console.error('Realtime channel error:', event);
      })
      .on('system', { event: 'disconnect' }, () => {
        console.warn('Realtime channel disconnected');
      })
      .on('system', { event: 'connected' }, () => {
        console.log('Realtime channel connected');
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to realtime updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadIncidents() {
    const { data } = await getIncidents({ limit: 100 });
    if (data) setIncidents(data);
  }

  async function handleRealtimeIncident(id: string) {
    const { data } = await getPublicIncidentById(id);
    if (data) {
      setIncidents(prev => {
        const exists = prev.some(i => i.id === id);
        return exists ? prev.map(i => (i.id === id ? data : i)) : [data, ...prev];
      });
    } else {
      setIncidents(prev => prev.filter(i => i.id !== id));
    }
  }

  async function searchAddress(query: string) {
    try {
      const response = await fetch(`${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=${NOMINATIM_LIMIT}&countrycodes=cl`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching address:', error);
    }
  }

  function handleSelectResult(result: SearchResult) {
    setSearchQuery(result.display_name);
    setSearchResults([]);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const { error } = await signIn(email, password);
    if (error) {
      setLoginError(error.message);
    } else {
      setShowLoginForm(false);
      setEmail('');
      setPassword('');
      window.location.reload();
    }
  }

  function handleLogout() {
    signOut();
    window.location.reload();
  }

  function handleNavigateToReport(origin: 'gps' | 'map') {
    setReportOrigin(origin);
    navigate('/report');
  }

  function handleVoteSuccess(updated: Incident) {
    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedIncident(updated);
  }

  const filteredIncidents = incidents.filter(i => {
    if (selectedCategory && i.category !== selectedCategory) return false;
    if (selectedStatus && i.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="h-screen flex flex-col">
      <NavBar profile={profile} onLogout={handleLogout} />

      {/* Login form overlay for desktop */}
      {showLoginForm && (
        <div className="md:block hidden bg-white border-b shadow-sm p-4 z-[550]">
          <form onSubmit={handleLogin} className="max-w-md mx-auto flex gap-2 flex-col sm:flex-row">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Entrar
            </button>
            <a href="/register" className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 text-center">
              Registrarse
            </a>
          </form>
          {loginError && <p className="text-red-500 text-xs mt-2 max-w-md mx-auto">{loginError}</p>}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-0 lg:w-80 bg-white border-r overflow-y-auto z-10 shadow-lg transition-all duration-300">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Buscar dirección..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg overflow-hidden">
                {searchResults.map((result, idx) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition ${
                      idx !== searchResults.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-b space-y-2">
            <div>
              <label className="text-xs text-gray-500">Categoría</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full mt-1 px-2 py-1 border text-sm rounded"
              >
                <option value="">Todas</option>
                {INCIDENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Estado</label>
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className="w-full mt-1 px-2 py-1 border text-sm rounded"
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3">
            <h3 className="text-sm font-medium mb-2">
              Incidencias ({filteredIncidents.length})
            </h3>
            <div className="space-y-2">
              {filteredIncidents.map(incident => (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition ${
                    selectedIncident?.id === incident.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: STATUS_COLORS[incident.status] + '20',
                        color: STATUS_COLORS[incident.status]
                      }}
                    >
                      {STATUS_LABELS[incident.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{incident.description.substring(0, 80)}...</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>⚡ {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                    <span>·</span>
                    <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <MapView
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            showLocationControls
            onIncidentClick={setSelectedIncident}
          />

          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 md:hidden">
            <button
              onClick={() => setShowIncidentList(true)}
              className="bg-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm">{filteredIncidents.length}</span>
            </button>

            {profile && (
              <button
                onClick={() => handleNavigateToReport('gps')}
                className="bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center w-14 h-14 hover:bg-blue-700 mx-auto"
                title="Reportar incidencia"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-t px-4 py-2 flex items-center justify-center gap-6 text-xs text-gray-600 z-10 hidden md:flex">
        <span><strong>{filteredIncidents.length}</strong> activas</span>
        <span>·</span>
        <span>{incidents.filter(i => i.status === 'resuelto').length} resueltas</span>
        <span>·</span>
        <span>{new Set(incidents.map(i => i.category)).size} categorías</span>
      </div>

      {showIncidentList && (
        <div className="fixed inset-0 z-[2000] md:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowIncidentList(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Incidencias ({filteredIncidents.length})</h3>
              <button
                onClick={() => setShowIncidentList(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 border-b">
              <input
                type="text"
                placeholder="Buscar dirección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-b space-y-2">
              <div>
                <label className="text-xs text-gray-500">Categoría</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full mt-1 px-2 py-1 border text-sm rounded"
                >
                  <option value="">Todas</option>
                  {INCIDENT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <select
                  value={selectedStatus || ''}
                  onChange={(e) => setSelectedStatus(e.target.value || null)}
                  className="w-full mt-1 px-2 py-1 border text-sm rounded"
                >
                  <option value="">Todos</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {filteredIncidents.map(incident => (
                  <div
                    key={incident.id}
                    onClick={() => {
                      setSelectedIncident(incident);
                      setShowIncidentList(false);
                    }}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition ${
                      selectedIncident?.id === incident.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: STATUS_COLORS[incident.status] + '20',
                          color: STATUS_COLORS[incident.status]
                        }}
                      >
                        {STATUS_LABELS[incident.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{incident.description.substring(0, 80)}...</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>⚡ {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                      <span>·</span>
                      <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onVoteSuccess={handleVoteSuccess}
        />
      )}
    </div>
  );
}

export default HomePage;
