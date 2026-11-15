import React, { type ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  onBack?: () => void;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
  hasDivider?: boolean;
}

/**
 * Standard Global Page Header for Enterprise SaaS Layout
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badges,
  actions,
  className = '',
  hasDivider = true,
}) => {
  return (
    <div className={`page-header w-full ${hasDivider ? 'pb-5 border-b border-slate-200' : ''} ${className}`}>
      <div className="flex items-start justify-between flex-wrap gap-4">
        {/* Left: Title, Description & Badges */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-950 tracking-tight m-0">
              {title}
            </h1>
            {badges && <div className="flex items-center gap-1.5 flex-wrap">{badges}</div>}
          </div>
          {description && (
            <p className="text-xs text-slate-600 m-0 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
