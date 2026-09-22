import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const inputBase = 'w-full h-12 px-4 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none transition-colors';

export function Input({ label, hint, error, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-label-md font-semibold text-on-surface mb-1">{label}</span>}
      <input className={cn(inputBase, error && 'border-error', className)} {...props} />
      {error && <span className="block text-label-sm text-error mt-1">{error}</span>}
      {!error && hint && <span className="block text-label-sm text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, className, ...props }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="block text-label-md font-semibold text-on-surface mb-1">{label}</span>}
      <textarea className={cn('w-full px-4 py-3 rounded bg-surface-container-lowest border border-outline-variant text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none transition-colors', error && 'border-error', className)} {...props} />
      {error && <span className="block text-label-sm text-error mt-1">{error}</span>}
      {!error && hint && <span className="block text-label-sm text-on-surface-variant mt-1">{hint}</span>}
    </label>
  );
}
