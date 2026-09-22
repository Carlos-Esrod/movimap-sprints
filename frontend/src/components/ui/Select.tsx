import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Select({ label, hint, error, className, children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-label-md font-semibold text-on-surface mb-1">{label}</span>}
      <div className="relative">
        <select className={cn('w-full h-12 px-4 pr-10 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface focus:border-primary focus:outline-none transition-colors appearance-none', error && 'border-error', className)} {...props}>
          {children}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {error && <span className="block text-label-sm text-error mt-1">{error}</span>}
      {!error && hint && <span className="block text-label-sm text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}

export default Select;
