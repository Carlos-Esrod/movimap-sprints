import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserIncidents, getUserActions, getIncidents, signOut, supabase } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ReportStatus from '@/components/reports/ReportStatus';
import { cn } from '@/lib/cn';
import type { Incident } from '@/types';

type ActivityTab = 'my-incidents' | 'my-actions' | 'general';

function ActivityPage() {
  const [activeTab, setActiveTab] = useState<ActivityTab>('my-incidents');
  const [userId, setUserId] = useState<string | null>(null);
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [myActions, setMyActions] = useState<any[]>([]);
  const [generalIncidents, setGeneralIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadUserId(); }, []);

  useEffect(() => {
    if (userId) loadData();
  }, [userId, activeTab]);

  async function loadUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUserId(session.user.id);
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
      if (data) setGeneralIncidents([...data].sort((a, b) => b.score - a.score));
    }
    setLoading(false);
  }

  function handleLogout() {
    signOut();
    window.location.reload();
  }

  const tabs: { key: ActivityTab; label: string }[] = [
    { key: 'my-incidents', label: 'Mis reportes' },
    { key: 'my-actions', label: 'Mis acciones' },
    { key: 'general', label: 'General' },
  ];

  const incidentCard = (incident: Incident) => (
    <Card
      key={incident.id}
      interactive
      onClick={() => navigate(`/incident/${incident.id}`)}
      className="mb-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-label-md font-semibold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
          <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{incident.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-label-sm text-on-surface-variant">
            <span>{SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
            <span>·</span>
            <span>Score: {incident.score}</span>
            <span>·</span>
            <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
          </div>
        </div>
        <ReportStatus status={incident.status} />
      </div>
      {incident.image_url && (
        <img src={incident.image_url} alt="Evidencia" className="mt-3 w-full h-40 object-cover rounded" />
      )}
    </Card>
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-body-md text-on-surface-variant mb-4">Inicia sesión para ver tu actividad</p>
          <Button onClick={() => navigate('/login')}>Iniciar sesión</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Actividad"
        subtitle="Seguimiento de tu participación"
        icon={<Icon name="activity" className="text-primary" />}
      />

      <div className="px-margin-mobile md:px-margin-desktop border-b border-outline-variant">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-3 text-label-md font-semibold border-b-2 transition-colors',
                activeTab === tab.key ? 'border-secondary-container text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-6 pb-24 md:pb-6">
        {activeTab === 'my-incidents' && (
          <div>
            <h2 className="text-label-md font-semibold text-on-surface-variant mb-3">Tus reportes ({myIncidents.length})</h2>
            {myIncidents.length === 0 ? (
              <EmptyState text="No has reportado incidencias aún" actionLabel="Crear primer reporte" onAction={() => navigate('/report')} />
            ) : (
              <div>{myIncidents.map(incidentCard)}</div>
            )}
          </div>
        )}

        {activeTab === 'my-actions' && (
          <div>
            <h2 className="text-label-md font-semibold text-on-surface-variant mb-3">Tus acciones ({myActions.length})</h2>
            {myActions.length === 0 ? (
              <EmptyState text="No has confirmado ni rechazado incidencias aún" />
            ) : (
              <div className="space-y-3">
                {myActions.map((action: any) => {
                  const incident = action.incidents;
                  if (!incident) return null;
                  return (
                    <Card key={action.id} interactive onClick={() => navigate(`/incident/${incident.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-label-md font-semibold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                          <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{incident.description}</p>
                          <p className="text-label-sm text-on-surface-variant mt-2">{new Date(action.created_at).toLocaleDateString('es-CL')}</p>
                        </div>
                        <span className={cn(
                          'text-label-sm px-3 py-1 rounded-full font-semibold whitespace-nowrap',
                          action.vote_type === 'up' ? 'bg-secondary-fixed-dim/40 text-on-surface' :
                          action.vote_type === 'down' ? 'bg-error-container text-on-error-container' :
                          'bg-primary-container/12 text-on-primary-container'
                        )}>
                          {action.vote_type === 'up' ? 'Confirmado' : action.vote_type === 'down' ? 'Rechazado' : 'Marcada resuelta'}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'general' && (
          <div>
            <h2 className="text-label-md font-semibold text-on-surface-variant mb-3">Incidencias populares ({generalIncidents.length})</h2>
            {generalIncidents.length === 0 ? (
              <EmptyState text="No hay incidencias aún" />
            ) : (
              <div>{generalIncidents.map(incidentCard)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-12">
      <Icon name="info" className="mx-auto text-on-surface-variant/40 mb-4" size={48} strokeWidth={1.5} />
      <p className="text-body-md text-on-surface-variant">{text}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">{actionLabel}</Button>
      )}
    </div>
  );
}

export default ActivityPage;
