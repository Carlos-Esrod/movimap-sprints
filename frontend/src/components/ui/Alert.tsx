import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'error' | 'success' | 'warning' | 'info' | 'teal';

interface AlertProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  error: 'bg-error-container text-on-error-container border-error/30',
  success: 'bg-[#e7f5ee] text-[#14764a] border-[#a7d9c0]',
  warning: 'bg-tertiary-fixed-dim/40 text-on-surface border-tertiary-fixed/60',
  info: 'bg-primary-container/10 text-on-primary-container border-primary-container/20',
  teal: 'bg-[#e7f4f5] text-[#30666d] border-[#9acfd8]',
};

function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div role="alert" className={cn('flex items-start gap-2 p-3 rounded border text-sm', tones[tone], className)}>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export default Alert;
