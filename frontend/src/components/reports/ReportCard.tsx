import { useNavigate } from 'react-router-dom';
import type { Incident } from '@/types';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';
import ReportStatus from './ReportStatus';

interface ReportCardProps {
  incident: Incident;
  selected?: boolean;
  onSelect?: (incident: Incident) => void;
}

function ReportCard({ incident, selected, onSelect }: ReportCardProps) {
  const navigate = useNavigate();
  const category = INCIDENT_CATEGORIES.find(c => c.value === incident.category);
  const severity = SEVERITY_LEVELS.find(s => s.value === incident.severity);

  return (
    <div
      onClick={() => (onSelect ? onSelect(incident) : navigate(`/incident/${incident.id}`))}
      className={cn(
        'bg-surface-container-lowest border rounded-lg overflow-hidden cursor-pointer transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'border-outline-variant hover:bg-surface-container-low'
      )}
    >
      {incident.image_url && (
        <img src={incident.image_url} alt="Evidencia" className="w-full h-32 object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-label-md font-semibold text-on-surface">{category?.label || incident.category}</h4>
          <ReportStatus status={incident.status} />
        </div>
        <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{incident.description}</p>
        <div className="flex items-center gap-2 mt-2 text-label-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1"><Icon name="locate" size={13} /> {severity?.label || incident.severity}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Icon name="calendar" size={13} /> {new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
        </div>
      </div>
    </div>
  );
}

export default ReportCard;
