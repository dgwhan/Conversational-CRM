import React from 'react';

export interface KeywordWeightBadgeProps {
  weight: number;
  className?: string;
}

export const KeywordWeightBadge: React.FC<KeywordWeightBadgeProps> = ({
  weight,
  className = '',
}) => {
  const isPositive = weight > 0;
  const isNegative = weight < 0;

  const colorClasses = isPositive
    ? 'bg-blue-50 text-blue-600'
    : isNegative
    ? 'bg-rose-50 text-rose-600'
    : 'bg-slate-100 text-slate-600';

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded shrink-0 text-center ${colorClasses} ${className}`}
    >
      {isPositive ? `+${weight}` : weight}
    </span>
  );
};
