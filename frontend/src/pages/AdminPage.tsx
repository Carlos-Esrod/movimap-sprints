import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIncidents, getProfile, updateIncidentStatus, getReportedIncidents, updateReportStatus } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Icon from '@/components/ui/Icon';
import ReportStatus from '@/components/reports/ReportStatus';
import { cn } from '@/lib/cn';
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

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/');
    } else if (profile?.role === 'admin') {
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
        setSelectedIncident({ ...selectedIncident, status: newStatus as typeof selectedIncident.status });
      }
    }
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    return true;
  });

  const pendingReports = reports.filter(r => r.status === 'pendiente').length;

  if (activeTab === 'reports') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Administración" subtitle="Gestión de incidencias y denuncias" icon={<Icon name="settings" className="text-primary" />} />
        <div className="px-margin-mobile md:px-margin-desktop border-b border-outline-variant">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('incidents')} className="px-4 py-3 text-label-md font-semibold border-b-2 border-transparent text-on-surface-variant hover:text-on-surface">Incidencias</button>
            <button onClick={() => setActiveTab('reports')} className="px-4 py-3 text-label-md font-semibold border-b-2 border-secondary-container text-secondary">Reportes</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-6">
          <h2 className="text-label-md font-semibold text-on-surface mb-4">Denuncias de incidencias</h2>
          {loadReportsError && <Alert tone="error" className="mb-4">Error al cargar: {loadReportsError}</Alert>}
          {reports.length === 0 && !loadReportsError ? (
            <p className="text-body-md text-on-surface-variant text-center py-10">No hay denuncias registradas</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => {
                const incident = report.incidents;
                return (
                  <Card key={report.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-label-md font-semibold text-on-surface">
                        {incident ? (INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label || incident.category) : 'Incidente eliminado'}
                      </h4>
                      <Badge tone="warning">{report.status}</Badge>
                    </div>
                    {incident && <p className="text-label-sm text-on-surface-variant mt-1">{incident.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-sm text-on-surface-variant">
                      <span>Denunciante: {report.reporter?.display_name || report.reported_by}</span>
                      <span>Fecha: {new Date(report.created_at).toLocaleDateString('es-CL')}</span>
                      {report.reason && <span>Motivo: {report.reason}</span>}
                    </div>
                    {report.status === 'pendiente' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => handleReportStatus(report.id, 'resuelto')} className="text-on-surface">Marcar resuelta</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReportStatus(report.id, 'rechazado')}>Rechazar</Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Administración" subtitle="Gestión de incidencias y denuncias" icon={<Icon name="settings" className="text-primary" />} />
      <div className="px-margin-mobile md:px-margin-desktop border-b border-outline-variant">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('incidents')} className="px-4 py-3 text-label-md font-semibold border-b-2 border-secondary-container text-secondary">Incidencias</button>
          <button onClick={() => { setActiveTab('reports'); loadReports(); }} className="relative px-4 py-3 text-label-md font-semibold border-b-2 border-transparent text-on-surface-variant hover:text-on-surface">
            Reportes
            {pendingReports > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-secondary-container text-secondary text-label-sm font-semibold">{pendingReports}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 shrink-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col overflow-hidden">
          <div className="p-3 border-b border-outline-variant space-y-2">
            <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
            <Select label="Categoría" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas</option>
              {INCIDENT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-label-md font-semibold text-on-surface mb-3">Incidencias ({filteredIncidents.length})</h3>
            <div className="space-y-2">
              {filteredIncidents.map(incident => (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    'bg-surface-container-lowest border rounded-lg p-3 cursor-pointer transition-colors',
                    selectedIncident?.id === incident.id ? 'border-primary ring-1 ring-primary' : 'border-outline-variant hover:bg-surface-container-low'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-label-md font-semibold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                    <ReportStatus status={incident.status} />
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">{incident.description.substring(0, 80)}...</p>
                  <div className="flex items-center gap-2 mt-2 text-label-sm text-on-surface-variant">
                    <span>{SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
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

        <div className="flex-1 bg-background overflow-y-auto p-4 md:p-6">
          {selectedIncident ? (
            <Card>
              <h2 className="text-headline-md font-bold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === selectedIncident.category)?.label}</h2>
              <p className="text-body-md text-on-surface-variant mt-2">{selectedIncident.description}</p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <DetailField label="Severidad" value={SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.label} />
                <DetailField label="Duración" value={selectedIncident.estimated_duration} />
                <DetailField label="Fecha observación" value={new Date(selectedIncident.observed_at).toLocaleDateString('es-CL')} />
                <DetailField label="Estado" value={STATUS_LABELS[selectedIncident.status]} />
                <DetailField label="Score" value={String(selectedIncident.score)} />
                <DetailField label="Confirmaciones" value={String(selectedIncident.confirmation_count)} />
              </div>

              {selectedIncident.image_url && (
                <div className="mt-4">
                  <span className="text-label-sm text-on-surface-variant">Evidencia fotográfica</span>
                  <img src={selectedIncident.image_url} alt="Evidencia" className="mt-2 w-full h-48 object-cover rounded" />
                </div>
              )}

              <div className="mt-4 flex gap-2 flex-wrap items-center">
                <span className="text-label-md text-on-surface-variant mr-2">Cambiar estado:</span>
                {['nuevo', 'confirmado', 'en_revision', 'resuelto', 'rechazado', 'expirado'].map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(selectedIncident.id, status)}
                    className={selectedIncident.status === status ? 'bg-primary text-on-primary border-primary' : ''}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              Selecciona una incidencia para ver los detalles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <p className="text-label-md text-on-surface">{value}</p>
    </div>
  );
}

export default AdminPage;
