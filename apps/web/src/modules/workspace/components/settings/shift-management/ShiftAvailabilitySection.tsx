import React from "react";
import { UsersRound } from "lucide-react";
import { Button } from "../../../../../components/ui/index.js";
import type {
  WorkShift,
  StaffRoutingStatus,
} from "../../../hooks/useWorkspaceLeadRouting.js";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import { ShiftSection } from "./ShiftSection.js";

interface ShiftAvailabilitySectionProps {
  shift: WorkShift;
  staff: ManagedStaffItem[];
  roster: StaffRoutingStatus[];
  userId?: string;
  canManage: boolean;
  canConfigureMembers: boolean;
  absenceMemberId: string;
  absenceMode: "QUEUE" | "TRANSFER";
  absenceTargetId: string;
  absenceNote: string;
  overtimeStart: string;
  overtimeEnd: string;
  onEndLeave: (exceptionId: string) => void;
  onStartLeave: (memberId: string) => void;
  onHandoverOutsideShift: (memberId: string) => void;
  onAbsenceModeChange: (mode: "QUEUE" | "TRANSFER") => void;
  onAbsenceTargetChange: (memberId: string) => void;
  onAbsenceNoteChange: (note: string) => void;
  onCancelLeave: () => void;
  onSubmitLeave: () => void;
  onOvertimeStartChange: (value: string) => void;
  onOvertimeEndChange: (value: string) => void;
  onRecordOvertimeConsent: () => void;
  onAssignMembers: () => void;
}

export const ShiftAvailabilitySection: React.FC<
  ShiftAvailabilitySectionProps
> = ({
  shift,
  staff,
  roster,
  userId,
  canManage,
  canConfigureMembers,
  absenceMemberId,
  absenceMode,
  absenceTargetId,
  absenceNote,
  overtimeStart,
  overtimeEnd,
  onEndLeave,
  onStartLeave,
  onHandoverOutsideShift,
  onAbsenceModeChange,
  onAbsenceTargetChange,
  onAbsenceNoteChange,
  onCancelLeave,
  onSubmitLeave,
  onOvertimeStartChange,
  onOvertimeEndChange,
  onRecordOvertimeConsent,
  onAssignMembers,
}) => (
  <ShiftSection
    title="Trạng thái trực và bàn giao"
    description="Nghỉ đột xuất dừng nhận lead mới; Owner/ca trưởng chọn hàng chờ đội hoặc người nhận. Nhân viên có thể đồng ý rõ ràng để tư vấn ngoài ca."
  >
    {shift.members.length ? (
      <div className="divide-y divide-slate-100">
        {shift.members.map((assignment) => {
          const memberId = assignment.workspaceMemberId;
          const staffMember = staff.find(
            (person) => person.memberId === memberId,
          );
          const status = roster.find(
            (row) => row.workspaceMemberId === memberId,
          );
          const memberLeaveId = status?.activeLeaveExceptionId;
          const ownShift = assignment.workspaceMember?.userId === userId;
          const memberName =
            staffMember?.fullName?.trim() ||
            assignment.workspaceMember?.user?.fullName?.trim() ||
            staffMember?.email?.trim() ||
            assignment.workspaceMember?.user?.email?.trim();
          const recipient = roster.find(
            (row) => row.workspaceMemberId === absenceTargetId,
          );
          const wouldExceed = Boolean(
            recipient &&
            recipient.openConversations >= recipient.effectiveCapacity,
          );

          return (
            <div key={assignment.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-medium text-slate-800">
                    {memberName || "Chưa có thông tin tên"}
                    {assignment.isShiftManager && (
                      <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                        Ca trưởng
                      </span>
                    )}
                  </p>
                  <p className="mb-0 mt-1 text-xs text-slate-500">
                    {memberLeaveId
                      ? "Nghỉ đột xuất"
                      : status?.assignmentLocked
                        ? "Đang khóa nhận lead"
                        : status?.isOnShift
                          ? status.hasOvertimeConsent
                            ? "Đang trực theo ca ngoài đã đồng ý"
                            : "Đang trực"
                          : "Ngoài ca"}
                    {" · "}
                    {status?.openConversations ?? 0}/
                    {status?.effectiveCapacity ?? assignment.leadCapacity} hội
                    thoại mở
                  </p>
                </div>
                {canManage && memberLeaveId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEndLeave(memberLeaveId)}
                  >
                    Kết thúc nghỉ
                  </Button>
                )}
                {canManage && !memberLeaveId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStartLeave(memberId)}
                  >
                    Đánh dấu nghỉ đột xuất
                  </Button>
                )}
                {canManage &&
                  !memberLeaveId &&
                  status &&
                  !status.isOnShift &&
                  !status.hasOvertimeConsent &&
                  status.openConversations > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onHandoverOutsideShift(memberId)}
                    >
                      Bàn giao hội thoại ngoài ca
                    </Button>
                  )}
              </div>

              {ownShift && !status?.isOnShift && !memberLeaveId && (
                <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <label className="text-[11px] font-medium text-slate-600">
                    Từ
                    <input
                      type="datetime-local"
                      value={overtimeStart}
                      onChange={(event) =>
                        onOvertimeStartChange(event.target.value)
                      }
                      className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-slate-600">
                    Đến
                    <input
                      type="datetime-local"
                      value={overtimeEnd}
                      onChange={(event) =>
                        onOvertimeEndChange(event.target.value)
                      }
                      className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="primary"
                    className="self-end"
                    onClick={onRecordOvertimeConsent}
                  >
                    Tôi đồng ý tư vấn ngoài ca
                  </Button>
                </div>
              )}

              {absenceMemberId === memberId && canManage && (
                <div className="mt-3 grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className="text-[11px] font-medium text-slate-700">
                    Xử lý các hội thoại đang mở
                    <select
                      value={absenceMode}
                      onChange={(event) =>
                        onAbsenceModeChange(
                          event.target.value as "QUEUE" | "TRANSFER",
                        )
                      }
                      className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    >
                      <option value="QUEUE">Đưa vào hàng chờ đội</option>
                      <option value="TRANSFER">
                        Chuyển cho nhân viên đang trực
                      </option>
                    </select>
                  </label>
                  {absenceMode === "TRANSFER" && (
                    <label className="text-[11px] font-medium text-slate-700">
                      Người nhận
                      <select
                        value={absenceTargetId}
                        onChange={(event) =>
                          onAbsenceTargetChange(event.target.value)
                        }
                        className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                      >
                        <option value="">Chọn người nhận</option>
                        {roster
                          .filter(
                            (row) =>
                              row.isEligible &&
                              row.workspaceMemberId !== memberId,
                          )
                          .map((row) => (
                            <option
                              key={row.workspaceMemberId}
                              value={row.workspaceMemberId}
                            >
                              {row.fullName} · {row.openConversations}/
                              {row.effectiveCapacity}
                            </option>
                          ))}
                      </select>
                      {wouldExceed && (
                        <span className="mt-1 block text-amber-800">
                          Người nhận sẽ vượt hạn mức hiện tại. Bàn giao vẫn được
                          phép và hệ thống sẽ ghi nhận cảnh báo thông tin.
                        </span>
                      )}
                    </label>
                  )}
                  <label className="text-[11px] font-medium text-slate-700">
                    Ghi chú (không bắt buộc)
                    <input
                      value={absenceNote}
                      onChange={(event) =>
                        onAbsenceNoteChange(event.target.value)
                      }
                      maxLength={500}
                      className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={onCancelLeave}
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={absenceMode === "TRANSFER" && !absenceTargetId}
                      onClick={onSubmitLeave}
                    >
                      Xác nhận nghỉ và bàn giao
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-5 py-9 text-center">
        <span
          aria-hidden="true"
          className="mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"
        >
          <UsersRound size={22} strokeWidth={1.75} />
        </span>
        <p className="mb-1 text-sm font-semibold text-slate-800">
          Chưa có nhân viên nào trong ca này
        </p>
        <p className="mb-3 max-w-sm text-xs text-slate-500">
          Phân công nhân viên để theo dõi trạng thái trực và nhận lead theo
          lịch.
        </p>
        {canConfigureMembers ? (
          <Button size="sm" variant="secondary" onClick={onAssignMembers}>
            + Phân công nhân viên
          </Button>
        ) : (
          <p className="mb-0 text-xs text-slate-500">
            Liên hệ Owner để phân công nhân viên.
          </p>
        )}
      </div>
    )}
  </ShiftSection>
);
