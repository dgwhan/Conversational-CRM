import React from "react";
import { AlertTriangle, Plus, UsersRound } from "lucide-react";
import { Button, LoadingState, SearchableSelect } from "../../../../../components/ui/index.js";
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
  isLoading: boolean;
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
  isLoading,
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
}) => {
    const selectedAbsenceMember = staff.find(
      (person) => person.memberId === absenceMemberId,
    );
    const selectedAbsenceMemberName =
      selectedAbsenceMember?.fullName?.trim() ||
      selectedAbsenceMember?.email?.trim() ||
      shift.members.find((m) => m.workspaceMemberId === absenceMemberId)?.workspaceMember?.user?.fullName?.trim() ||
      "nhân viên";

    const recipient = roster.find(
      (row) => row.workspaceMemberId === absenceTargetId,
    );
    const wouldExceed = Boolean(
      recipient &&
      recipient.openConversations >= recipient.effectiveCapacity,
    );

    return (
      <ShiftSection
        title="Danh sách nhân viên trực ca"
        actions={
          canConfigureMembers ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus size={13} />}
              onClick={onAssignMembers}
            >
              Thêm nhanh
            </Button>
          ) : undefined
        }
        help={{
          title: "Trạng thái sẵn sàng của nhân viên trực ca",
          description:
            "Theo dõi thời gian thực trạng thái sẵn sàng tiếp nhận, số lượng hội thoại đang phụ trách và ngoại lệ vắng mặt của từng nhân sự trong ca.",
          example:
            'Nhân sự kích hoạt trạng thái "Rời bàn tạm thời. Hệ thống tạm ngừng chia sẻ khách hàng mới cho nhân sự này và tự động điều phối cho các thành viên khác đang trong trạng thái sẵn sàng.',
          rules: [
            "Chỉ nhân sự đang ở trạng thái Sẵn sàng và chưa vượt quá hạn mức mới được tiếp nhận hội thoại mới.",
            "Khi báo vắng mặt, có thể chọn giữ khách hàng trong hàng chờ chung hoặc tự động bàn giao cho đồng nghiệp chỉ định.",
            "Thời gian làm thêm giờ (Overtime) cần được ghi nhận đồng thuận từ nhân sự trước khi kích hoạt phân bổ.",
          ],
        }}
      >
        {isLoading ? (
          <LoadingState
            size="sm"
            className="py-6"
            message="Đang tải nhân viên và trạng thái ca trực..."
          />
        ) : shift.members.length ? (
          <div className="space-y-4">
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

                return (
                  <div key={assignment.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="m-0 text-sm font-medium text-slate-800 flex items-center gap-2">
                          <span>{memberName || "Chưa có thông tin tên"}</span>
                          {assignment.isShiftManager && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                              Ca trưởng
                            </span>
                          )}
                          {memberLeaveId && (
                            <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                              Nghỉ đột xuất
                            </span>
                          )}
                        </p>
                        <p className="mb-0 mt-1 text-xs text-slate-500">
                          {memberLeaveId
                            ? "Đang tạm dừng nhận lead mới"
                            : status?.assignmentLocked
                              ? "Đang khóa nhận lead"
                              : status?.isOnShift
                                ? status.hasOvertimeConsent
                                  ? "Đang trực theo ca ngoài đã đồng ý"
                                  : "Đang trực"
                                : "Ngoài ca"}
                          {" · "}
                          <span className="font-semibold text-slate-700">
                            {status?.openConversations ?? 0}
                          </span>
                          /{status?.effectiveCapacity ?? assignment.leadCapacity} hội thoại mở
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && memberLeaveId && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onEndLeave(memberLeaveId)}
                          >
                            Kết thúc nghỉ
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
                              Bàn giao ngoài ca
                            </Button>
                          )}
                      </div>
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
                  </div>
                );
              })}
            </div>

            {/* Vùng ghi nhận nghỉ đột xuất (Đem xuống cuối) */}
            {canManage && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                {absenceMemberId ? (
                  <div className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700 font-medium text-xs">
                        <AlertTriangle size={14} />
                        <span>
                          Ghi nhận nghỉ đột xuất: <strong>{selectedAbsenceMemberName}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onCancelLeave}
                        className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
                      >
                        Hủy
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <SearchableSelect
                          label="Nhân viên nghỉ"
                          value={absenceMemberId}
                          onChange={(val) => onStartLeave(val)}
                          options={shift.members.map((m) => {
                            const s = staff.find(
                              (person) => person.memberId === m.workspaceMemberId,
                            );
                            const name =
                              s?.fullName?.trim() ||
                              m.workspaceMember?.user?.fullName?.trim() ||
                              s?.email?.trim() ||
                              m.workspaceMemberId;
                            return {
                              value: m.workspaceMemberId,
                              label: name,
                            };
                          })}
                          size="sm"
                          fullWidth
                          searchPlaceholder="Tìm nhân viên..."
                        />
                      </div>

                      <div>
                        <SearchableSelect
                          label="Xử lý các hội thoại đang mở"
                          value={absenceMode}
                          onChange={(val) =>
                            onAbsenceModeChange(val as "QUEUE" | "TRANSFER")
                          }
                          options={[
                            { value: "QUEUE", label: "Đưa vào hàng chờ đội" },
                            { value: "TRANSFER", label: "Chuyển cho nhân viên đang trực" },
                          ]}
                          size="sm"
                          fullWidth
                          searchable={false}
                        />
                      </div>
                    </div>

                    {absenceMode === "TRANSFER" && (
                      <div>
                        <SearchableSelect
                          label="Người nhận"
                          value={absenceTargetId}
                          onChange={(val) => onAbsenceTargetChange(val)}
                          placeholder="Chọn người nhận"
                          options={roster
                            .filter(
                              (row) =>
                                row.isEligible &&
                                row.workspaceMemberId !== absenceMemberId,
                            )
                            .map((row) => ({
                              value: row.workspaceMemberId,
                              label: `${row.fullName} · ${row.openConversations}/${row.effectiveCapacity}`,
                            }))}
                          size="sm"
                          fullWidth
                          searchPlaceholder="Tìm người nhận..."
                        />
                        {wouldExceed && (
                          <span className="mt-1 block text-amber-800 text-[11px]">
                            Người nhận sẽ vượt hạn mức hiện tại. Bàn giao vẫn được
                            phép và hệ thống sẽ ghi nhận cảnh báo thông tin.
                          </span>
                        )}
                      </div>
                    )}

                    <label className="block text-[11px] font-medium text-slate-700">
                      Ghi chú (không bắt buộc)
                      <input
                        value={absenceNote}
                        onChange={(event) =>
                          onAbsenceNoteChange(event.target.value)
                        }
                        placeholder="Nhập lý do nghỉ đột xuất..."
                        maxLength={500}
                        className="mt-1 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
                      />
                    </label>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={onCancelLeave}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={absenceMode === "TRANSFER" && !absenceTargetId}
                        onClick={onSubmitLeave}
                      >
                        Xác nhận nghỉ và bàn giao
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-medium text-slate-800">
                        Ghi nhận nghỉ đột xuất
                      </p>
                      <p className="m-0 text-[11px] text-slate-500">
                        Tạm dừng nhận lead và bàn giao hội thoại đang mở vào hàng chờ hoặc cho nhân sự khác.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const firstAvailable = shift.members.find(
                          (m) =>
                            !roster.find(
                              (r) =>
                                r.workspaceMemberId === m.workspaceMemberId,
                            )?.activeLeaveExceptionId,
                        );
                        if (firstAvailable)
                          onStartLeave(firstAvailable.workspaceMemberId);
                      }}
                    >
                      Đánh dấu nghỉ đột xuất
                    </Button>
                  </div>
                )}
              </div>
            )}
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
                Liên hệ Owner hoặc Quản lý workspace để phân công nhân viên.
              </p>
            )}
          </div>
        )}
      </ShiftSection>
    );
  };
