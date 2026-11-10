import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  count?: number | null;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  tabClassName?: string;
  borderBottom?: boolean;
}

/**
 * Tabs - Component Tab phẳng dùng chung toàn hệ thống (System Root Component)
 * Tối ưu responsive: Hỗ trợ cuộn ngang mượt mà trên mobile (360px - 768px), không vỡ dòng.
 */
export const Tabs = <T extends string = string>({
  items,
  activeTab,
  onChange,
  className = '',
  tabClassName = '',
  borderBottom = true,
}: TabsProps<T>): React.ReactElement => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-4 sm:gap-6 md:gap-7 text-xs sm:text-[13px] overflow-x-auto overflow-y-hidden max-w-full scrollbar-none py-0.5 ${
        borderBottom ? 'border-b border-slate-200 dark:border-slate-800' : ''
      } ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = Boolean(tab.disabled);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            className={`pb-2.5 font-semibold transition-colors bg-transparent border-none cursor-pointer text-xs sm:text-[13px] flex items-center gap-1.5 outline-none whitespace-nowrap shrink-0 ${
              isActive
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
                : isDisabled
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            } ${tabClassName}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && <span className="ml-0.5">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
