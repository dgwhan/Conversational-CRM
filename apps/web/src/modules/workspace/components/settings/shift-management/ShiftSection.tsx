import React from "react";
import { ConfigSubSectionHeader, type ContextualHelpContent } from "../../../../../components/ui/index.js";

interface ShiftSectionProps {
  id?: string;
  title: string;
  description?: string;
  help?: ContextualHelpContent;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ShiftSection: React.FC<ShiftSectionProps> = ({
  id,
  title,
  description,
  help,
  actions,
  children,
  className = "",
}) => {
  const helpContent = help || (description ? { title, description } : undefined);

  return (
    <section
      id={id}
      className={`pt-2 pb-8 border-b border-slate-200 last:border-b-0 space-y-4 ${className}`}
    >
      <ConfigSubSectionHeader
        title={title}
        help={helpContent}
        actions={actions}
      />
      {children}
    </section>
  );
};
