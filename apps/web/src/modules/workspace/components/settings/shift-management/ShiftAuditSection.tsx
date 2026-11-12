import React from "react";
import { Button } from "../../../../../components/ui/index.js";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import type { AuditEntry } from "./types.js";
import type { AuditDateRange } from "./utils.js";
import { ShiftSection } from "./ShiftSection.js";

interface ShiftAuditSectionProps {
  entries: AuditEntry[];
  staff: ManagedStaffItem[];
  cursor: string | null;
  isLoading: boolean;
  loadError?: string;
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getText = (value: unknown) => (typeof value === "string" ? value : "");

function getAuditMessage(entry: AuditEntry, staff: ManagedStaffItem[]) {
  const metadata = asRecord(entry.metadata);
  const after = asRecord(metadata?.after);
  const before = asRecord(metadata?.before);
  const actor = staff.find((member) => member.id === entry.actorId);
  const actorName =
    actor?.fullName?.trim() ||
    actor?.email ||
    entry.user?.fullName?.trim() ||
    "Thành viên";
  const shiftName =
    getText(metadata?.shiftName) ||
    getText(after?.name) ||
    getText(before?.name);
  const shiftLabel = shiftName ? `ca "${shiftName}"` : "ca trực";
  const targetUserId = getText(metadata?.targetUserId);
  const targetMemberId = getText(metadata?.targetMemberId);
  const target = staff.find(
    (member) =>
      (targetUserId && member.id === targetUserId) ||
      (targetMemberId && member.memberId === targetMemberId),
  );
  const targetName =
    getText(metadata?.staffFullName) ||
    target?.fullName?.trim() ||
    target?.email ||
    "thành viên";

  const messages: Record<string, string> = {
    SHIFT_CREATED: `${actorName} đã tạo ${shiftLabel}`,
    SHIFT_UPDATED: `${actorName} đã cập nhật cấu hình ${shiftLabel}`,
    SHIFT_DEACTIVATED: `${actorName} đã tắt ${shiftLabel}`,
    SHIFT_DELETED: `${actorName} đã xóa ${shiftLabel}`,
    SHIFT_MEMBER_UPDATED: `${actorName} đã cập nhật nhân sự và hạn mức của ${shiftLabel}`,
    SHIFT_CAPACITY_CHANGED: `${actorName} đã thay đổi hạn mức nhận lead`,
    STAFF_ABSENCE_RECORDED: `${actorName} đã ghi nhận nghỉ đột xuất`,
    STAFF_ABSENCE_ENDED: `${actorName} đã kết thúc trạng thái nghỉ`,
    OVERTIME_CONSENT_RECORDED: `${actorName} đã ghi nhận đồng ý trực ngoài ca`,
    STAFF_ASSIGNMENT_LOCKED: `${actorName} đã khóa nhận lead`,
    STAFF_ASSIGNMENT_UNLOCKED: `${actorName} đã mở nhận lead`,
    LEAD_AUTO_ASSIGNED: "Hệ thống đã tự động phân công một lead",
    LEAD_MANUALLY_ASSIGNED: `${actorName} đã phân công lead`,
    LEAD_CLAIMED: `${actorName} đã nhận một lead từ hàng chờ`,
    LEAD_HANDED_OVER: `${actorName} đã bàn giao lead`,
    LEAD_QUEUED: "Một lead đã được đưa vào hàng chờ",
    LEAD_ESCALATED: "Hệ thống đã nâng mức nhắc của một lead",
    ROLE_CHANGED: `${actorName} đã đổi vai trò của ${targetName}`,
    WORKSPACE_PERMISSION_CHANGED: `${actorName} đã cập nhật quyền quản lý không gian làm việc cho ${targetName}`,
    CONTACT_MERGED: `${actorName} đã gộp liên hệ`,
    CONTACT_UNMERGED: `${actorName} đã tách liên hệ đã gộp`,
    CUSTOMER_MERGED: `${actorName} đã gộp hồ sơ khách hàng`,
    CUSTOMER_UNMERGED: `${actorName} đã tách hồ sơ khách hàng đã gộp`,
    MESSAGE_STORAGE_PURGED: `${actorName} đã xóa dữ liệu tin nhắn theo chính sách lưu trữ`,
    OFFBOARDING_STARTED: `${actorName} đã bắt đầu quy trình rời workspace của một thành viên`,
    OFFBOARDING_COMPLETED: `${actorName} đã hoàn tất quy trình rời workspace của một thành viên`,
  };

  return (
    messages[entry.action] ??
    `${actorName} đã ghi nhận một hoạt động trong workspace`
  );
}

function getRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value;

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const intervals: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const interval = intervals.find(([, size]) => Math.abs(seconds) >= size);
  if (!interval) return formatter.format(seconds, "second");
  return formatter.format(Math.round(seconds / interval[1]), interval[0]);
}

export const ShiftAuditSection: React.FC<ShiftAuditSectionProps> = ({
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
}) => (
  <ShiftSection
    title="Nhật ký hoạt động"
    description="Chỉ hiển thị thao tác liên quan đến ca đang chọn."
    actions={
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor="shift-audit-date-range">
          Khoảng thời gian nhật ký
        </label>
        <select
          id="shift-audit-date-range"
          value={range}
          onChange={(event) =>
            onRangeChange(event.target.value as AuditDateRange)
          }
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
        >
          <option value="TODAY">Hôm nay</option>
          <option value="YESTERDAY">Hôm qua</option>
          <option value="THIS_WEEK">Tuần này</option>
          <option value="CUSTOM">Tùy chỉnh</option>
        </select>
        {range === "CUSTOM" && (
          <>
            <label className="sr-only" htmlFor="shift-audit-start-date">
              Từ ngày
            </label>
            <input
              id="shift-audit-start-date"
              type="date"
              value={customStartDate}
              onChange={(event) =>
                onCustomDatesChange(event.target.value, customEndDate)
              }
              className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
            />
            <span className="text-xs text-slate-400">đến</span>
            <label className="sr-only" htmlFor="shift-audit-end-date">
              Đến ngày
            </label>
            <input
              id="shift-audit-end-date"
              type="date"
              value={customEndDate}
              min={customStartDate || undefined}
              onChange={(event) =>
                onCustomDatesChange(customStartDate, event.target.value)
              }
              className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={onApplyCustomRange}
              disabled={!isCustomRangeValid || isLoading}
            >
              Áp dụng
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onLoad()}
          disabled={isLoading || (range === "CUSTOM" && !isCustomApplied)}
        >
          Làm mới
        </Button>
      </div>
    }
  >
    {loadError && (
      <p
        role="alert"
        className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {loadError}
      </p>
    )}
    {range === "CUSTOM" && !isCustomApplied ? (
      <p className="mb-0 py-5 text-center text-sm text-slate-500">
        Chọn ngày bắt đầu và kết thúc, sau đó áp dụng bộ lọc.
      </p>
    ) : entries.length ? (
      <ol className="ml-2 border-l border-slate-200 pl-5">
        {entries.map((entry) => (
          <li key={entry.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-blue-500 bg-white" />
            <p className="mb-1 text-sm font-medium text-slate-800">
              {getAuditMessage(entry, staff)}
            </p>
            <time
              dateTime={entry.createdAt}
              title={new Date(entry.createdAt).toLocaleString("vi-VN")}
              className="text-xs text-slate-500"
            >
              {getRelativeTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    ) : isLoading ? (
      <p className="mb-0 py-5 text-center text-sm text-slate-500">
        Đang tải nhật ký...
      </p>
    ) : !loadError ? (
      <p className="mb-0 py-5 text-center text-sm text-slate-500">
        Không có hoạt động nào trong khoảng thời gian này.
      </p>
    ) : null}
    {cursor && (
      <div className="mt-4 text-center">
        <Button
          size="sm"
          variant="secondary"
          disabled={isLoading}
          onClick={() => onLoad(cursor)}
        >
          {isLoading ? "Đang tải..." : "Xem thêm lịch sử"}
        </Button>
      </div>
    )}
  </ShiftSection>
);
