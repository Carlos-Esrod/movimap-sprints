import { useState, useEffect } from 'react';
import { getUserIncidents, getUserActions, getIncidents, signOut } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import type { Incident } from '@/types';

type ActivityTab = 'my-incidents' | 'my-actions' | 'general';

function ActivityPage() {
  const [activeTab, setActiveTab] = useState<ActivityTab>('my-incidents');
  const [userId, setUserId] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [myActions, setMyActions] = useState<any[]>([]);
  const [generalIncidents, setGeneralIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, activeTab]);

  async function loadUserId() {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
    setLoading(false);
  }

  async function loadData() {
    if (!userId) return;
    setLoading(true);

    if (activeTab === 'my-incidents') {
      const { data } = await getUserIncidents(userId);
      if (data) setMyIncidents(data);
    }

    if (activeTab === 'my-actions') {
      const { data } = await getUserActions(userId);
      if (data) setMyActions(data);
    }

    if (activeTab === 'general') {
      const { data } = await getIncidents({ limit: 50 });
      if (data) {
        const sorted = [...data].sort((a, b) => b.score - a.score);
        setGeneralIncidents(sorted);
      }
    }

    setLoading(false);
  }

  function handleLogout() {
    signOut();
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-16 md:pb-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pb-16 md:pb-0">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Inicia sesión para ver tu actividad</p>
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800">Actividad</h1>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700">
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <div className="flex max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTab('my-incidents')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'my-incidents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mis reportes
          </button>
          <button
            onClick={() => setActiveTab('my-actions')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'my-actions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mis acciones
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            General
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* My Incidents Tab */}
        {activeTab === 'my-incidents' && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Tus reportes ({myIncidents.length})
            </h2>
            {myIncidents.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No has reportado incidencias aún</p>
                <a href="/report" className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  Crear primer reporte
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {myIncidents.map(incident => (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition ${
                      selectedIncident?.id === incident.id ? 'border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">
                          {INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.description}</p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded whitespace-nowrap ml-2"
                        style={{
                          backgroundColor: STATUS_COLORS[incident.status] + '20',
                          color: STATUS_COLORS[incident.status]
                        }}
                      >
                        {STATUS_LABELS[incident.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>⚡ {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                      <span>Score: {incident.score}</span>
                      <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                    {incident.image_url && (
                      <img src={incident.image_url} alt="Evidencia" className="mt-2 w-full h-40 object-cover rounded" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Actions Tab */}
        {activeTab === 'my-actions' && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Tus acciones ({myActions.length})
            </h2>
            {myActions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <p className="text-gray-500">No has confirmado ni rechazado incidencias aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myActions.map((action: any) => {
                  const incident = action.incidents;
                  if (!incident) return null;
                  return (
                    <div
                      key={action.id}
                      onClick={() => setSelectedIncident(incident)}
                      className="bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">
                            {INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ml-2 ${
                          action.vote_type === 'up' ? 'bg-green-100 text-green-700' :
                          action.vote_type === 'down' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {action.vote_type === 'up' ? 'Confirmado' :
                           action.vote_type === 'down' ? 'Rechazado' :
                           'Marcada resuelta'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(action.created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* General Activity Tab */}
        {activeTab === 'general' && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Incidencias populares ({generalIncidents.length})
            </h2>
            {generalIncidents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay incidencias aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {generalIncidents.map(incident => (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition ${
                      selectedIncident?.id === incident.id ? 'border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">
                          {INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.description}</p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded whitespace-nowrap ml-2"
                        style={{
                          backgroundColor: STATUS_COLORS[incident.status] + '20',
                          color: STATUS_COLORS[incident.status]
                        }}
                      >
                        {STATUS_LABELS[incident.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>⚡ {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                      <span>👍 {incident.confirmation_count}</span>
                      <span>Score: {incident.score}</span>
                      <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                    </div>
                    {incident.image_url && (
                      <img src={incident.image_url} alt="Evidencia" className="mt-2 w-full h-40 object-cover rounded" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Incident detail modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-[1100] flex items-end md:items-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSelectedIncident(null)}
          />
          <div className="relative bg-white w-full md:rounded-xl rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">
                {INCIDENT_CATEGORIES.find(c => c.value === selectedIncident.category)?.label}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700">{selectedIncident.description}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <span className="text-xs text-gray-500">Estado</span>
                  <p className="text-sm">{STATUS_LABELS[selectedIncident.status]}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Severidad</span>
                  <p className="text-sm">{SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.label}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Score</span>
                  <p className="text-sm">{selectedIncident.score}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Confirmaciones</span>
                  <p className="text-sm">{selectedIncident.confirmation_count}</p>
                </div>
              </div>
              {selectedIncident.image_url && (
                <img src={selectedIncident.image_url} alt="Evidencia" className="mt-4 w-full h-48 object-cover rounded" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityPage;
