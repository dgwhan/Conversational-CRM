import React from "react";

interface ShiftSectionProps {
  id?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const ShiftSection: React.FC<ShiftSectionProps> = ({
  id,
  title,
  description,
  actions,
  children,
}) => (
  <section
    id={id}
    className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
  >
    <header className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mb-0 mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="ml-auto w-full sm:w-auto">{actions}</div>}
    </header>
    {children}
  </section>
);
