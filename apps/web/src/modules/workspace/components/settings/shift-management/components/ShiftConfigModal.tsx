import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button, Modal } from '../../../../../../components/ui/index.js';
import type { ManagedStaffItem } from '../../../../types/staff.types.js';
import { ShiftScheduleSection } from '../ShiftScheduleSection.js';
import { ShiftMembersSection } from '../ShiftMembersSection.js';
import type { MemberDraft } from '../types.js';

type ActiveStaffMember = ManagedStaffItem & { memberId: string };

export interface ShiftConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
  shiftTitle: string;
  name: string;
  startTime: string;
  endTime: string;
  timezone: string;
  weekdays: number[];
  isOwner: boolean;
  isSaving: boolean;
  onNameChange: (name: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onTimezoneChange: (tz: string) => void;
  onWeekdaysChange: (days: number[]) => void;
  activeStaff: ActiveStaffMember[];
  members: MemberDraft[];
  staffLoadError: string;
  focusMemberId?: string;
  onToggleStaff: (workspaceMemberId: string, checked: boolean) => void;
  onPatchMember: (
    workspaceMemberId: string,
    patch: Partial<MemberDraft>,
  ) => void;
  onBulkAddStaff: (workspaceMemberIds: string[], defaultCapacity?: number) => void;
  onBulkSetQuota: (capacity: number) => void;
  onSave: (event: React.FormEvent) => void;
}

export const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  isCreating,
  shiftTitle,
  name,
  startTime,
  endTime,
  timezone,
  weekdays,
  isOwner,
  isSaving,
  onNameChange,
  onStartTimeChange,
  onEndTimeChange,
  onTimezoneChange,
  onWeekdaysChange,
  activeStaff,
  members,
  staffLoadError,
  focusMemberId,
  onToggleStaff,
  onPatchMember,
  onBulkAddStaff,
  onBulkSetQuota,
  onSave,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      variant="flat"
      title={
        isCreating
          ? 'Tạo ca làm việc mới'
          : `Cấu hình & Nhân sự · ${shiftTitle}`
      }
      description="Thiết lập khung giờ hoạt động, ngày trong tuần và phân bổ hạn mức nhận lead cho nhân sự."
    >
      <form
        id="shift-modal-configuration-form"
        onSubmit={onSave}
        className="space-y-6"
      >
        <ShiftScheduleSection
          name={name}
          startTime={startTime}
          endTime={endTime}
          timezone={timezone}
          weekdays={weekdays}
          disabled={!isOwner}
          onNameChange={onNameChange}
          onStartTimeChange={onStartTimeChange}
          onEndTimeChange={onEndTimeChange}
          onTimezoneChange={onTimezoneChange}
          onWeekdaysChange={onWeekdaysChange}
        />

        {isOwner && (
          <div className="pt-6 border-t border-slate-200">
            <ShiftMembersSection
              staff={activeStaff}
              members={members}
              loadError={staffLoadError}
              focusMemberId={focusMemberId}
              onToggleStaff={onToggleStaff}
              onPatchMember={onPatchMember}
              onBulkAddStaff={onBulkAddStaff}
              onBulkSetQuota={onBulkSetQuota}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer border-none shadow-2xs inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Save size={14} className="shrink-0" />
            )}
            <span>
              {isSaving
                ? 'Đang lưu...'
                : isCreating
                ? 'Tạo ca làm việc'
                : 'Lưu cài đặt'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

