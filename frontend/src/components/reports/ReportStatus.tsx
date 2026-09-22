import type { Incident } from '@/types';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, STATUS_LABELS, STATUS_COLORS, STATUS_ICONS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface ReportStatusProps {
  status: Incident['status'];
  className?: string;
}

function ReportStatus({ status, className }: ReportStatusProps) {
  const color = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-semibold whitespace-nowrap', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      {STATUS_LABELS[status]}
    </span>
  );
}

export default ReportStatus;
