import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface-container-lowest w-full md:max-w-lg rounded-t-2xl md:rounded-lg max-h-[90vh] flex flex-col animate-[pageIn_.28s_ease]">
        {title && (
          <div className="shrink-0 border-b border-outline-variant px-5 py-4 flex items-center justify-between">
            <h3 className="text-headline-md font-semibold">{title}</h3>
            <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto p-5', !title && (footer ? 'pb-0' : ''))}>{children}</div>
        {footer && <div className="shrink-0 border-t border-outline-variant px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
