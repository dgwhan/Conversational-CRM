import React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  /** Số lượng đếm của tab (chỉ hiển thị khi showCount hoặc countTotal = true) */
  count?: number | null;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  ariaLabel?: string;
  className?: string;
  tabClassName?: string;
  /** Cho phép hiển thị số đếm (count) bên cạnh tab (boolean: true / false) */
  showCount?: boolean;
  /** Tên biến thay thế cho showCount để bật hiển thị số đếm */
  countTotal?: boolean;
}

/**
 * Tabs - Minimalist bottom-bordered tab bar.
 * Thiết kế tối giản: background trong suốt, thanh phân cách 1px mỏng toàn chiều ngang,
 * active indicator 2px màu xanh primary hệ thống (blue-600) đè lên viền dưới, cùng màu chữ xanh đồng bộ.
 * Hỗ trợ hiển thị số lượng badge tinh tế khi bật countTotal / showCount={true}.
 */
export const Tabs = <T extends string = string>({
  items,
  activeTab,
  onChange,
  ariaLabel,
  className = "",
  tabClassName = "",
  showCount = false,
  countTotal = false,
}: TabsProps<T>): React.ReactElement => {
  const shouldDisplayCount = showCount || countTotal;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full max-w-full items-center gap-8 overflow-x-auto overflow-y-hidden border-b border-slate-200 bg-transparent text-sm scrollbar-none sm:gap-10 md:gap-12 ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = Boolean(tab.disabled);
        const hasCount =
          shouldDisplayCount &&
          tab.count !== undefined &&
          tab.count !== null;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            className={`group relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap bg-transparent pb-3 pt-2 text-sm font-medium outline-none transition-colors duration-150 ${
              isActive
                ? "border-b-2 border-blue-600 font-semibold text-blue-700 -mb-px"
                : isDisabled
                  ? "cursor-not-allowed border-b-2 border-transparent text-slate-300"
                  : "border-b-2 border-transparent text-slate-700 hover:text-blue-700"
            } ${tabClassName}`}
          >
            <span>{tab.label}</span>
            {hasCount && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 group-hover:text-slate-800"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
