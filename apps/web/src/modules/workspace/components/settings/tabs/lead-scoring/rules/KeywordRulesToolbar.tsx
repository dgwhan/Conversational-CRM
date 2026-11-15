import React, { useMemo } from 'react';
import {
  Search,
  X,
  Upload,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import type { StatusFilter } from './types.js';
import { STATUS_FILTER_OPTIONS } from './constants.js';
import { SearchableSelect } from '../../../../../../../components/ui/SearchableSelect.js';

export interface KeywordRulesToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroupFilter: string;
  onGroupFilterChange: (grp: string) => void;
  selectedStatusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  availableGroups: string[];
  rulesCount: number;
  totalActive: number;
  totalInactive: number;
  filteredCount: number;
  isFiltering: boolean;
  onResetFilters: () => void;
  isAllFilteredSelected: boolean;
  isSomeFilteredSelected: boolean;
  onToggleSelectAllFiltered: () => void;
  isOwner: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenBulkImport: () => void;
}

export const KeywordRulesToolbar: React.FC<KeywordRulesToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedGroupFilter,
  onGroupFilterChange,
  selectedStatusFilter,
  onStatusFilterChange,
  availableGroups,
  rulesCount: _rulesCount,
  totalActive: _totalActive,
  totalInactive: _totalInactive,
  filteredCount,
  isFiltering,
  onResetFilters,
  isAllFilteredSelected,
  isSomeFilteredSelected,
  onToggleSelectAllFiltered,
  isOwner,
  onExpandAll,
  onCollapseAll,
  onOpenBulkImport,
}) => {
  const groupOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả nhóm' },
      ...availableGroups.map((grp) => ({ value: grp, label: grp })),
    ],
    [availableGroups]
  );

  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
      })),
    []
  );

  return (
    <div className="flex items-center justify-between gap-2.5 py-2.5 border-b border-slate-200 w-full flex-nowrap overflow-x-auto">
      {/* Left: Search & Filter Controls in a Single Row */}
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-nowrap">
        {/* Soft-filled Search Input */}
        <div className="relative w-44 sm:w-52 md:w-60 shrink-0">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm từ khóa..."
            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-md h-9 pl-8 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400 border border-slate-200/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all box-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer border-none bg-transparent"
              title="Xóa tìm kiếm"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Group Filter Dropdown */}
        <SearchableSelect
          value={selectedGroupFilter}
          onChange={onGroupFilterChange}
          options={groupOptions}
          size="md"
          className="w-36 shrink-0"
          searchPlaceholder="Tìm nhóm..."
        />

        {/* Status Filter Dropdown */}
        <SearchableSelect
          value={selectedStatusFilter}
          onChange={(val) => onStatusFilterChange(val as StatusFilter)}
          options={statusOptions}
          size="md"
          className="w-32 shrink-0"
          searchable={false}
        />

        {/* Select All Filtered Checkbox Shortcut */}
        {isOwner && filteredCount > 0 && (
          <div
            onClick={onToggleSelectAllFiltered}
            className="h-9 px-2.5 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none rounded-md bg-slate-100/80 hover:bg-slate-200/60 transition-colors shrink-0"
            title={
              isAllFilteredSelected
                ? 'Bỏ chọn tất cả kết quả'
                : 'Chọn tất cả kết quả'
            }
          >
            {isAllFilteredSelected ? (
              <CheckSquare size={14} className="text-blue-600 shrink-0" />
            ) : isSomeFilteredSelected ? (
              <MinusSquare size={14} className="text-blue-600 shrink-0" />
            ) : (
              <Square size={14} className="text-slate-400 shrink-0" />
            )}
            <span className="font-medium text-[11px] whitespace-nowrap">
              Chọn tất cả ({filteredCount})
            </span>
          </div>
        )}

        {/* Reset Filter Button */}
        {isFiltering && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent shrink-0 whitespace-nowrap"
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* Right: Expand/Collapse & Bulk Import Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Expand / Collapse All */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 border-r border-slate-200 pr-2 mr-1 shrink-0">
          <button
            type="button"
            onClick={onExpandAll}
            className="hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer border-none bg-transparent transition-colors whitespace-nowrap"
          >
            Mở tất cả
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={onCollapseAll}
            className="hover:text-slate-800 px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer border-none bg-transparent transition-colors whitespace-nowrap"
          >
            Thu tất cả
          </button>
        </div>

        {/* Bulk Import Button */}
        {isOwner && (
          <button
            type="button"
            onClick={onOpenBulkImport}
            className="inline-flex flex-row items-center justify-center gap-1.5 h-9 rounded-md bg-slate-100 hover:bg-slate-200/90 text-slate-700 px-3 text-xs font-semibold transition-colors border border-slate-200/80 cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
          >
            <Upload size={13} className="shrink-0 text-slate-500" />
            <span>Nhập hàng loạt</span>
          </button>
        )}
      </div>
    </div>
  );
};

