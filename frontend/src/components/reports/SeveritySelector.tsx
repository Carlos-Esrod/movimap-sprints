import { SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { IncidentSeverity } from '@/types';

interface SeveritySelectorProps {
  value: number | null;
  onChange: (level: number) => void;
}

const toneClasses = (level: number, selected: boolean) => {
  if (selected) {
    return 'border-primary bg-surface-container ring-1 ring-primary';
  }
  return 'border-outline-variant hover:bg-surface-container-low';
};

const iconColor = (level: number) =>
  level === 3 ? 'text-secondary-container' : level === 2 ? 'text-tertiary-fixed-dim' : 'text-surface-tint';

function SeveritySelector({ value, onChange }: SeveritySelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {SEVERITY_LEVELS.map(level => {
        const selected = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            aria-pressed={selected}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors text-center',
              toneClasses(level.value, selected)
            )}
          >
            <span className={cn('flex items-center justify-center w-10 h-10 rounded-full', selected ? 'bg-primary text-on-primary' : 'bg-surface-container' )}>
              <svg className={cn('w-5 h-5', !selected && iconColor(level.value))} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <span className="text-label-md font-semibold text-on-surface">{level.label}</span>
            <span className="text-label-sm text-on-surface-variant">{level.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SeveritySelector;
