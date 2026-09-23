import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicIncidentById, voteOnIncident, reportIncident, getMyVote } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_LABELS } from '@/lib/constants';
import { computeScore } from '@/lib/utils';
import MapView from '@/components/map/MapView';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import IconButton from '@/components/ui/IconButton';
import Icon from '@/components/ui/Icon';
import ReportStatus from '@/components/reports/ReportStatus';
import type { Incident, Profile } from '@/types';

interface IncidentDetailPageProps {
  profile?: Profile | null;
}

function IncidentDetailPage({ profile }: IncidentDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<{ message: string; tone: 'teal' | 'success' | 'error' } | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadIncident(id);
  }, [id]);

  async function loadIncident(id: string) {
    setLoading(true);
    const { data } = await getPublicIncidentById(id);
    if (data) {
      setIncident(data);
      const vote = await getMyVote(id);
      if (vote.data) setMyVote(vote.data.vote_type);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  const handleVote = async (action: 'up' | 'down' | 'resuelta') => {
    if (!incident) return;
    setVoting(action);
    setVoteResult(null);
    setVoteError(null);
    const result = await voteOnIncident(incident.id, action);
    if (result.error) {
      setVoteError(`Error: ${result.error.message}`);
    } else {
      setMyVote(action);
      if (result.data) setIncident(result.data);
      const feedback = action === 'up'
        ? { message: 'Confirmado', tone: 'teal' as const }
        : action === 'down'
          ? { message: 'Rechazado', tone: 'error' as const }
          : { message: 'Marcada como resuelta', tone: 'success' as const };
      setVoteResult(feedback);
    }
    setVoting(null);
    setTimeout(() => setVoteResult(null), 3000);
  };

  const handleReport = async () => {
    if (!incident) return;
    setReporting(true);
    setReportError(null);
    setReportSent(false);
    const result = await reportIncident(incident.id);
    if (result.error) {
      setReportError(`No se pudo enviar la denuncia: ${result.error.message}`);
    } else {
      setReportSent(true);
      setTimeout(() => setReportSent(false), 3000);
    }
    setReporting(false);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (notFound || !incident) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-body-md text-on-surface-variant">Esta incidencia no está disponible.</p>
          <Button onClick={() => navigate('/')} className="mt-4">Volver al mapa</Button>
        </Card>
      </div>
    );
  }

  const category = INCIDENT_CATEGORIES.find(c => c.value === incident.category);
  const severity = SEVERITY_LEVELS.find(s => s.value === incident.severity);
  const googleMapsUrl = `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <IconButton label="Volver" onClick={() => navigate(-1)}>
            <Icon name="close" />
          </IconButton>
          <div className="flex-1">
            <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">{category?.label || incident.category}</h1>
            <ReportStatus status={incident.status} className="mt-1" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <IconButton label="Compartir"><Icon name="share" /></IconButton>
          </div>
        </div>

        {incident.image_url && (
          <img src={incident.image_url} alt="Evidencia" className="w-full h-72 md:h-96 object-cover rounded-xl" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <p className="text-body-md text-on-surface-variant leading-relaxed">{incident.description}</p>
              <div className="flex items-center gap-2 mt-4 text-label-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1"><Icon name="thumbs-up" size={14} /> {incident.votes_up} confirmaciones</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Icon name="thumbs-down" size={14} /> {incident.votes_down} rechazos</span>
                <span>·</span>
                <span>Score: {computeScore(incident.votes_up, incident.votes_down)}</span>
              </div>
            </Card>

            {voteResult && <Alert tone={voteResult.tone}>{voteResult.message}</Alert>}
            {voteError && <Alert tone="error">{voteError}</Alert>}

            <Card>
              <h3 className="text-label-md font-semibold text-on-surface mb-3">Apoyar esta incidencia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleVote('up')}
                  disabled={voting !== null || reporting}
                  fullWidth
                  className={myVote === 'up' ? 'bg-secondary-fixed-dim/40 border-secondary-container' : ''}
                >
                  <Icon name="thumbs-up" size={18} /> Confirmar ({incident.votes_up})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleVote('down')}
                  disabled={voting !== null || reporting}
                  fullWidth
                  className={myVote === 'down' ? 'bg-secondary-fixed-dim/40 border-secondary-container' : ''}
                >
                  <Icon name="thumbs-down" size={18} /> Rechazar ({incident.votes_down})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleVote('resuelta')}
                  disabled={voting !== null || reporting}
                  fullWidth
                  className={myVote === 'resuelta' ? 'bg-secondary-fixed-dim/40 border-secondary-container' : ''}
                >
                  <Icon name="check" size={18} /> Resuelta ({incident.votes_resuelta})
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {incident.status === 'resuelto' && (
                  <Alert tone="success">Esta incidencia ya fue marcada como resuelta.</Alert>
                )}
                {incident.votes_down >= incident.downvote_threshold - 1 && incident.votes_resuelta < incident.resuelto_threshold && (
                  <Alert tone="warning">
                    Se ocultará automáticamente al llegar a {incident.downvote_threshold} rechazos (lleva {incident.votes_down}).
                  </Alert>
                )}
                {incident.votes_resuelta >= incident.resuelto_threshold - 1 && (
                  <Alert tone="warning">
                    Se ocultará automáticamente al llegar a {incident.resuelto_threshold} votos de "resuelta" (lleva {incident.votes_resuelta}).
                  </Alert>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-outline-variant">
                <Button variant="destructive" onClick={handleReport} disabled={reporting || voting !== null} fullWidth className="bg-error-container text-on-error-container hover:opacity-90 border border-error/30">
                  <Icon name="alert" size={18} /> {reportSent ? 'Denuncia enviada' : 'Denunciar incidencia'}
                </Button>
                {reportError && <p className="text-label-sm text-error mt-2">{reportError}</p>}
                {reportSent && <Alert tone="warning" className="mt-2">Gracias, tu denuncia será revisada por el administrador.</Alert>}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <h3 className="text-label-md font-semibold text-on-surface">Información</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-label-sm text-on-surface-variant">Categoría</span>
                  <p className="text-label-md font-semibold text-on-surface">{category?.label || incident.category}</p>
                </div>
                <div>
                  <span className="text-label-sm text-on-surface-variant">Severidad</span>
                  <p className="text-label-md font-semibold text-on-surface">{severity?.label || incident.severity}</p>
                </div>
                <div>
                  <span className="text-label-sm text-on-surface-variant">Estado</span>
                  <p className="text-label-md font-semibold text-on-surface">{STATUS_LABELS[incident.status]}</p>
                </div>
                <div>
                  <span className="text-label-sm text-on-surface-variant">Fecha</span>
                  <p className="text-label-md font-semibold text-on-surface">{new Date(incident.created_at).toLocaleDateString('es-CL')}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-label-md font-semibold text-on-surface">Ubicación</h3>
                <a target="_blank" rel="noreferrer" href={googleMapsUrl} className="text-label-sm font-semibold text-primary hover:underline">
                  Abrir en Google Maps
                </a>
              </div>
              <div className="mt-3 h-56 rounded-lg overflow-hidden border border-outline-variant">
                <MapView
                  center={[incident.latitude, incident.longitude]}
                  zoom={16}
                  selectedLocation={[incident.latitude, incident.longitude]}
                  interactive={false}
                  showLocationControls={false}
                />
              </div>
              <p className="text-label-sm text-on-surface-variant mt-3">{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</p>
            </Card>

            <Card>
              <h3 className="text-label-md font-semibold text-on-surface">Autor</h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">C</div>
                <div>
                  <p className="text-label-md font-semibold text-on-surface">Comunidad</p>
                  <p className="text-label-sm text-on-surface-variant">Reportado por un vecino</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentDetailPage;
