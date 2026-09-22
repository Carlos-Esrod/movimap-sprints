import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-margin-mobile md:px-margin-desktop py-6">
      <div className="flex items-center gap-4">
        {icon && <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary">{icon}</div>}
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">{title}</h1>
          {subtitle && <p className="text-body-md text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export default PageHeader;
