import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'primary' | 'coral' | 'success' | 'warning' | 'neutral' | 'info';

interface ChipProps {
  tone?: Tone;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  primary: 'bg-primary-container/15 text-primary-container',
  coral: 'bg-secondary-container/15 text-on-secondary-container',
  success: 'bg-secondary-fixed-dim/40 text-on-surface',
  warning: 'bg-tertiary-fixed-dim/40 text-on-surface',
  neutral: 'bg-surface-container text-on-surface-variant',
  info: 'bg-primary-fixed/40 text-on-primary-fixed',
};

function Chip({ tone = 'neutral', icon, active, onClick, children, className }: ChipProps) {
  const base = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md font-semibold transition-colors';
  const activeCls = active ? 'bg-secondary-container text-secondary' : tones[tone];

  const content = (
    <>
      {icon}
      <span>{children}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, activeCls, className)}>
        {content}
      </button>
    );
  }

  return (
    <span className={cn(base, tones[tone], className)}>{content}</span>
  );
}

export default Chip;
