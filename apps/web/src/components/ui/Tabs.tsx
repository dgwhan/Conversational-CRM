import React from "react";

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
  ariaLabel?: string;
  variant?: "underline" | "segmented";
  className?: string;
  tabClassName?: string;
  borderBottom?: boolean;
}

/**
 * Tabs - Component tab dùng chung toàn hệ thống, hỗ trợ underline và segmented.
 * Tối ưu responsive: Hỗ trợ cuộn ngang mượt mà trên mobile (360px - 768px), không vỡ dòng.
 */
export const Tabs = <T extends string = string>({
  items,
  activeTab,
  onChange,
  ariaLabel,
  variant = "underline",
  className = "",
  tabClassName = "",
  borderBottom = true,
}: TabsProps<T>): React.ReactElement => {
  const isSegmented = variant === "segmented";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={
        isSegmented
          ? `inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden rounded-xl bg-gray-100 p-1 text-xs scrollbar-none ${className}`
          : `flex max-w-full items-center gap-4 overflow-x-auto overflow-y-hidden py-0.5 text-xs scrollbar-none sm:gap-6 sm:text-[13px] md:gap-7 ${
              borderBottom
                ? "border-b border-slate-200 dark:border-slate-800"
                : ""
            } ${className}`
      }
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
            className={
              isSegmented
                ? `flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs outline-none transition-colors sm:text-[13px] ${
                    isActive
                      ? "border-white bg-white font-semibold text-slate-900 shadow-sm"
                      : isDisabled
                        ? "border-transparent text-slate-300"
                        : "border-transparent font-medium text-slate-600 hover:text-slate-900"
                  } ${isDisabled ? "cursor-not-allowed" : ""} ${tabClassName}`
                : `flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-none bg-transparent text-xs font-semibold outline-none transition-colors sm:text-[13px] ${
                    isActive
                      ? "pb-2.5 text-blue-600"
                      : isDisabled
                        ? "pb-2.5 text-slate-300"
                        : "pb-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  } ${
                    isActive ? "border-b-2 border-blue-600 -mb-[1px]" : ""
                  } ${isDisabled ? "cursor-not-allowed" : ""} ${tabClassName}`
            }
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
