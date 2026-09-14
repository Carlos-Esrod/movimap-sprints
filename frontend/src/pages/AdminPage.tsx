import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { getAdminIncidents, signOut, getProfile, updateIncidentStatus, getReportedIncidents, updateReportStatus } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_LABELS, STATUS_COLORS, CATEGORY_COLORS } from '@/lib/constants';
import type { Incident, Profile, IncidentReport } from '@/types';

function AdminPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'reports'>('incidents');
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loadReportsError, setLoadReportsError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
    } else {
      loadIncidents();
    }
  }, [profile]);

  async function loadProfile() {
    const p = await getProfile();
    setProfile(p);
  }

  async function loadIncidents() {
    const { data } = await getAdminIncidents({ limit: 100 });
    if (data) setIncidents(data);
  }

  async function loadReports() {
    const { data, error } = await getReportedIncidents();
    if (data) setReports(data);
    if (error) setLoadReportsError(error.message);
  }

  async function handleReportStatus(reportId: string, status: 'resuelto' | 'rechazado') {
    const { error } = await updateReportStatus(reportId, status);
    if (!error) loadReports();
  }

  async function updateStatus(incidentId: string, newStatus: string) {
    const { error } = await updateIncidentStatus(incidentId, newStatus, profile?.id);
    if (!error) {
      loadIncidents();
      if (selectedIncident?.id === incidentId) {
        const updated = { ...selectedIncident, status: newStatus as typeof selectedIncident.status };
        setSelectedIncident(updated);
      }
    }
  }

  function handleLogout() {
    signOut();
    navigate('/');
  }

  if (!profile) return null;

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="h-screen flex flex-col">
      <NavBar profile={profile} onLogout={handleLogout} />

      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'incidents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Incidencias
        </button>
        <button
          onClick={() => { setActiveTab('reports'); loadReports(); }}
          className={`relative px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Reportes
          {reports.filter(r => r.status === 'pendiente').length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs">
              {reports.filter(r => r.status === 'pendiente').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Denuncias de incidencias</h2>
            {loadReportsError && (
              <p className="text-sm text-red-600 mb-4">Error al cargar: {loadReportsError}</p>
            )}
            {reports.length === 0 && !loadReportsError ? (
              <div className="text-gray-400 text-sm py-10 text-center">No hay denuncias registradas</div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => {
                  const incident = report.incidents;
                  const statusColor = report.status === 'pendiente' ? '#f59e0b' : report.status === 'resuelto' ? '#10b981' : '#ef4444';
                  return (
                    <div key={report.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {incident ? (INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label || incident.category) : 'Incidente eliminado'}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded uppercase" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                          {report.status}
                        </span>
                      </div>
                      {incident && (
                        <p className="text-xs text-gray-500 mt-1">{incident.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                        <span>Denunciante: {report.reporter?.display_name || report.reported_by}</span>
                        <span>Fecha: {new Date(report.created_at).toLocaleDateString('es-CL')}</span>
                        {report.reason && <span>Motivo: {report.reason}</span>}
                      </div>
                      {report.status === 'pendiente' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleReportStatus(report.id, 'resuelto')}
                            className="px-3 py-1 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            Marcar resuelta
                          </button>
                          <button
                            onClick={() => handleReportStatus(report.id, 'rechazado')}
                            className="px-3 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="flex-1 flex">
        {/* Left sidebar */}
        <div className="w-96 bg-white border-r overflow-y-auto">
          <div className="p-3 border-b space-y-2">
            <div>
              <label className="text-xs text-gray-500">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full mt-1 px-2 py-1 border text-sm rounded"
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Categoría</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full mt-1 px-2 py-1 border text-sm rounded"
              >
                <option value="">Todas</option>
                {INCIDENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                  className={`p-3 border rounded cursor-pointer ${selectedIncident?.id === incident.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: STATUS_COLORS[incident.status] + '20', color: STATUS_COLORS[incident.status] }}
                    >
                      {STATUS_LABELS[incident.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{incident.description.substring(0, 80)}...</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>⚡ {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                    <span>·</span>
                    <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                    <span>·</span>
                    <span>Score: {incident.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Incident detail */}
        <div className="flex-1 bg-gray-50">
          {selectedIncident ? (
            <div className="p-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold">{INCIDENT_CATEGORIES.find(c => c.value === selectedIncident.category)?.label}</h2>
                <p className="text-sm text-gray-600 mt-2">{selectedIncident.description}</p>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="text-xs text-gray-500">Severidad</span>
                    <p className="text-sm">{SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.label}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Duración</span>
                    <p className="text-sm">{selectedIncident.estimated_duration}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Fecha observación</span>
                    <p className="text-sm">{new Date(selectedIncident.observed_at).toLocaleDateString('es-CL')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Estado</span>
                    <p className="text-sm">{STATUS_LABELS[selectedIncident.status]}</p>
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
                  <div className="mt-4">
                    <span className="text-xs text-gray-500">Evidencia fotográfica</span>
                    <img src={selectedIncident.image_url} alt="Evidencia" className="mt-2 w-full h-48 object-cover rounded" />
                  </div>
                )}

                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 mr-2">Cambiar estado:</span>
                  {['nuevo', 'confirmado', 'en_revision', 'resuelto', 'rechazado', 'expirado'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedIncident.id, status)}
                      className={`px-3 py-1 rounded text-xs ${
                        selectedIncident.status === status
                          ? STATUS_COLORS[status]
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } text-white`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Selecciona una incidencia para ver los detalles
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export default AdminPage;
