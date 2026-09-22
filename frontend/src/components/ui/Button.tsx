import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary hover:opacity-90',
  secondary: 'bg-secondary-container text-secondary hover:opacity-90',
  destructive: 'bg-error text-on-error hover:opacity-90',
  ghost: 'bg-transparent hover:bg-surface-container text-on-surface',
  outline: 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-label-md',
  md: 'h-12 px-5 text-label-md',
  lg: 'h-12 px-6 text-label-md',
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function Button({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export default Button;
