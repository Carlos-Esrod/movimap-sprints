import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn('inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface transition-colors hover:bg-surface-container', className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
