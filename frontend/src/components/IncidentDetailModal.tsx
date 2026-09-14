import { useEffect, useState } from 'react';
import { voteOnIncident, reportIncident, getMyVote } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_COLORS, STATUS_LABELS, CATEGORY_COLORS } from '@/lib/constants';
import type { Incident } from '@/types';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onVoteSuccess?: (updated: Incident) => void;
}

function IncidentDetailModal({ incident, onClose, onVoteSuccess }: IncidentDetailModalProps) {
  const [current, setCurrent] = useState<Incident>(incident);
  const [voting, setVoting] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(incident);
    getMyVote(incident.id).then(({ data }) => {
      if (data) setMyVote(data.vote_type);
    });
  }, [incident.id]);

  const handleVote = async (action: 'up' | 'down' | 'resuelta') => {
    setVoting(action);
    setVoteResult(null);
    setVoteError(null);

    const result = await voteOnIncident(current.id, action);

    if (result.error) {
      setVoteError(`Error: ${result.error.message}`);
    } else {
      setMyVote(action);
      if (result.data) setCurrent(result.data);
      setVoteResult(action === 'up' ? '✅ Confirmado' : action === 'down' ? '❌ Rechazado' : '✅ Marcada como resuelta');
      onVoteSuccess?.(result.data || current);
    }

    setVoting(null);
    setTimeout(() => setVoteResult(null), 3000);
  };

  const handleReport = async () => {
    setReporting(true);
    setReportError(null);
    setReportSent(false);

    const result = await reportIncident(current.id);

    if (result.error) {
      setReportError(`No se pudo enviar la denuncia: ${result.error.message}`);
      setReportSent(false);
    } else {
      setReportSent(true);
      setTimeout(() => setReportSent(false), 3000);
    }

    setReporting(false);
  };

  const userActions = [];

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div className="relative bg-white w-full md:rounded-xl rounded-t-2xl flex flex-col max-h-[90vh]">
        <div className="shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">
            {INCIDENT_CATEGORIES.find(c => c.value === current.category)?.label}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-700">{current.description}</p>

          {current.image_url && (
            <img src={current.image_url} alt="Evidencia" className="mt-4 w-full h-64 object-cover rounded-lg" />
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <span className="text-xs text-gray-500">Estado</span>
              <p className="text-sm font-medium" style={{ color: STATUS_COLORS[current.status] }}>
                {STATUS_LABELS[current.status]}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Severidad</span>
              <p className="text-sm font-medium">
                {SEVERITY_LEVELS.find(s => s.value === current.severity)?.label}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Score</span>
              <p className="text-sm font-medium">{current.score}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Confirmaciones</span>
              <p className="text-sm font-medium">{current.confirmation_count}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Fecha</span>
              <p className="text-sm font-medium">
                {new Date(current.created_at).toLocaleDateString('es-CL')}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Categoría</span>
              <p className="text-sm font-medium">
                {INCIDENT_CATEGORIES.find(c => c.value === current.category)?.label}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white border-t px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleVote('up')}
              disabled={voting !== null || reporting}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 ${myVote === 'up' ? 'bg-green-200 border-green-400' : 'bg-green-50 border-green-200'} border text-green-700 text-sm rounded-lg hover:bg-green-100 transition disabled:opacity-50`}
            >
              {voting === 'up' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              )}
              Confirmar
            </button>
            <button
              onClick={() => handleVote('down')}
              disabled={voting !== null || reporting}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 ${myVote === 'down' ? 'bg-red-200 border-red-400' : 'bg-red-50 border-red-200'} border text-red-700 text-sm rounded-lg hover:bg-red-100 transition disabled:opacity-50`}
            >
              {voting === 'down' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905.00-.714.211-1.412.608-2.006L17 13V4a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
              Rechazar
            </button>
            <button
              onClick={() => handleVote('resuelta')}
              disabled={voting !== null || reporting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
            >
              {voting === 'resuelta' ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Marcar resuelta
            </button>
          </div>
          {voteResult && (
            <p className="text-xs text-center mt-2 text-green-600">{voteResult}</p>
          )}
          {voteError && (
            <p className="text-xs text-center mt-2 text-red-600">{voteError}</p>
          )}

          <button
            onClick={handleReport}
            disabled={reporting || voting !== null}
            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
          >
            {reporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {reportSent ? '✅ Denuncia enviada' : '⚠️ Denunciar incidencia'}
          </button>
          {reportError && (
            <p className="text-xs text-center mt-2 text-red-600">{reportError}</p>
          )}
          {reportSent && (
            <p className="text-xs text-center mt-2 text-orange-600">Gracias, tu denuncia será revisada por el administrador.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentDetailModal;
