import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

function Card({ interactive, selected, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest border rounded-lg p-4',
        interactive && 'cursor-pointer transition-colors hover:bg-surface-container-low',
        selected && 'border-primary ring-1 ring-primary bg-surface-container-low',
        !interactive && !selected && 'border-outline-variant',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
