import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'primary' | 'coral' | 'success' | 'warning' | 'neutral';

interface BadgeProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  primary: 'bg-primary-container/12 text-on-primary-container',
  coral: 'bg-secondary-container/15 text-on-secondary-container',
  success: 'bg-secondary-fixed-dim/40 text-on-surface',
  warning: 'bg-tertiary-fixed-dim/40 text-on-surface',
  neutral: 'bg-surface-container text-on-surface-variant',
};

function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-semibold whitespace-nowrap', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export default Badge;
