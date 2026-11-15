import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ManagedStaffItem } from '../../../../types/staff.types.js';
import { ShiftAuditSection } from '../ShiftAuditSection.js';
import type { AuditEntry } from '../types.js';
import type { AuditDateRange } from '../utils.js';

export interface ShiftAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shiftName?: string;
  entries: AuditEntry[];
  staff: ManagedStaffItem[];
  cursor: string | null;
  isLoading: boolean;
  loadError: string;
  range: AuditDateRange;
  customStartDate: string;
  customEndDate: string;
  isCustomApplied: boolean;
  isCustomRangeValid: boolean;
  onRangeChange: (range: AuditDateRange) => void;
  onCustomDatesChange: (startDate: string, endDate: string) => void;
  onApplyCustomRange: () => void;
  onLoad: (cursor?: string) => void;
}

export const ShiftAuditDrawer: React.FC<ShiftAuditDrawerProps> = ({
  isOpen,
  onClose,
  shiftName,
  entries,
  staff,
  cursor,
  isLoading,
  loadError,
  range,
  customStartDate,
  customEndDate,
  isCustomApplied,
  isCustomRangeValid,
  onRangeChange,
  onCustomDatesChange,
  onApplyCustomRange,
  onLoad,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop làm mờ toàn bộ Viewport màn hình */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 ease-out"
        onClick={onClose}
      />
      {/* Drawer trượt vào từ mép phải toàn màn hình */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-10 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-950 m-0">
              Nhật ký hoạt động ca trực
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 mb-0">
              {shiftName} · Lịch sử gán lead, đổi trạng thái & trực ca
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng nhật ký hoạt động"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer transition-colors border-none bg-transparent"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <ShiftAuditSection
            entries={entries}
            staff={staff}
            cursor={cursor}
            isLoading={isLoading}
            loadError={loadError}
            range={range}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            isCustomApplied={isCustomApplied}
            isCustomRangeValid={isCustomRangeValid}
            onRangeChange={onRangeChange}
            onCustomDatesChange={onCustomDatesChange}
            onApplyCustomRange={onApplyCustomRange}
            onLoad={onLoad}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

