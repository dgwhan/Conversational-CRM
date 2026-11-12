import React from "react";
import { Lock, Mail, Users } from "lucide-react";
import {
  WORKSPACE_MEMBER_STATUS,
} from "../../../../../WorkspaceConfigContext.js";
import { StaffRole } from "../../../../../../../features/auth/constants/auth.constants.js";
import {
  ActionOverflowMenu,
  EmptyState,
  type ActionOverflowMenuItem,
} from "../../../../../../../components/ui/index.js";
import { CopyValueButton } from "./CopyValueButton.js";
import type { WorkspaceMembersTableProps } from "./types.js";

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("vi");

export const WorkspaceMembersTable: React.FC<WorkspaceMembersTableProps> = ({
  members,
  effectiveSubTab,
  memberSearch,
  isOwner,
  canManageMembers,
  currentStaffId,
  currentStaffEmail,
  canOwnerLeave,
  routingByMemberId,
  onConfigureShift,
  onToggleLeadLock,
  onCancelInvitation,
  onLeaveWorkspace,
  onRemoveMember,
  onSetWorkspaceManagerPermission,
}) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:overflow-visible">
    <table className="w-full table-fixed border-collapse text-left text-xs">
      <colgroup>
        <col className="w-[30%]" />
        <col className="w-[15%]" />
        <col className="w-[22%]" />
        <col className="w-[23%]" />
        <col className="w-[10%] min-w-[96px]" />
      </colgroup>
      <thead className="border-b border-slate-200/80 bg-slate-50/80">
        <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <th className="rounded-tl-2xl px-4 py-3.5 sm:px-6">
            {effectiveSubTab === "members" ? "Thành viên" : "Người được mời"}
          </th>
          <th className="px-4 py-3.5 sm:px-6">
            {effectiveSubTab === "members" ? "Số điện thoại" : "Thời gian mời"}
          </th>
          <th className="px-4 py-3.5 sm:px-6">Vai trò</th>
          <th className="px-4 py-3.5 sm:px-6">Trạng thái / Ca trực</th>
          <th className="rounded-tr-2xl whitespace-nowrap py-3.5 pl-3 pr-6 text-right">
            Thao tác
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {members.length === 0 ? (
          <tr>
            <td colSpan={5} className="p-0">
              <EmptyState
                icon={
                  effectiveSubTab === "members" ? (
                    <Users size={28} className="mx-auto text-slate-400" />
                  ) : (
                    <Mail size={28} className="mx-auto text-amber-400" />
                  )
                }
                title={
                  memberSearch
                    ? effectiveSubTab === "members"
                      ? "Không tìm thấy thành viên nào"
                      : "Không tìm thấy lời mời nào"
                    : effectiveSubTab === "members"
                      ? "Chưa có thành viên nào"
                      : "Chưa có lời mời nào đang chờ"
                }
                description={
                  memberSearch
                    ? `Không có kết quả nào khớp với "${memberSearch}". Thử kiểm tra lại từ khóa.`
                    : effectiveSubTab === "members"
                      ? "Mời thành viên mới tham gia không gian làm việc để cùng cộng tác."
                      : 'Hiện không có lời mời nào đang chờ phản hồi. Bạn có thể nhấn nút "Mời thành viên" để gửi lời mời mới.'
                }
                isDashed={false}
                className="border-none py-8 bg-white"
              />
            </td>
          </tr>
        ) : (
          members.map((member) => {
            const isOwnerMember = member.role === StaffRole.OWNER;
            const isPending =
              member.memberStatus === WORKSPACE_MEMBER_STATUS.PENDING;
            const routingStatus = member.memberId
              ? routingByMemberId.get(member.memberId)
              : undefined;
            const assignmentLocked =
              routingStatus?.assignmentLocked ??
              member.assignmentLocked ??
              false;
            const displayName =
              member.fullName?.trim() || member.email.split("@")[0];
            const isCurrentUser =
              (member.id && member.id === currentStaffId) ||
              (member.email &&
                currentStaffEmail &&
                member.email.toLowerCase() === currentStaffEmail.toLowerCase());
            const canConfigureShift =
              canManageMembers && !isPending && Boolean(member.memberId);
            const canLockLead =
              canManageMembers &&
              !isOwnerMember &&
              !isPending &&
              Boolean(member.memberId);
            const canCancelInvitation =
              isPending &&
              canManageMembers &&
              (isOwner || member.role !== StaffRole.OWNER);
            const canRemoveMember =
              !isPending &&
              !isCurrentUser &&
              (isOwner ||
                (canManageMembers &&
                  !isOwnerMember &&
                  !member.isWorkspaceManager)) &&
              (!isOwnerMember || canOwnerLeave);
            const canLeaveWorkspace = !isPending && isCurrentUser;
            const hasActions =
              canConfigureShift ||
              canLockLead ||
              canCancelInvitation ||
              canRemoveMember ||
              canLeaveWorkspace;
            const hasAssignedShifts = Boolean(routingStatus?.shifts?.length);
            const routingLabel = routingStatus?.activeLeaveExceptionId
              ? "Nghỉ đột xuất"
              : routingStatus?.isOnShift
                ? "Online"
                : "Ngoài ca";
            const routingDotClass = routingStatus?.activeLeaveExceptionId
              ? "bg-amber-500"
              : routingStatus?.isOnShift
                ? "bg-emerald-500"
                : "bg-slate-400";
            const memberMenuItems: ActionOverflowMenuItem[] = [];

            if (canConfigureShift && member.memberId) {
              const workspaceMemberId = member.memberId;
              memberMenuItems.push({
                id: "configure-shift",
                label: "Phân ca & Hạn mức",
                onSelect: () => onConfigureShift(workspaceMemberId),
              });
            }
            if (canLockLead && member.memberId) {
              memberMenuItems.push({
                id: "lock-leads",
                label: assignmentLocked
                  ? "Mở khóa nhận lead"
                  : "Khóa nhận lead",
                tone: assignmentLocked ? "success" : "warning",
                onSelect: () => onToggleLeadLock(member, assignmentLocked),
              });
            }
            const hasDivider =
              canCancelInvitation || canLeaveWorkspace || canRemoveMember;
            if (canCancelInvitation) {
              memberMenuItems.push({
                id: "cancel-invitation",
                label: "Hủy lời mời",
                tone: "warning",
                dividerBefore: hasDivider,
                onSelect: () =>
                  onCancelInvitation(
                    member.memberId || member.id,
                    displayName,
                    member.role,
                  ),
              });
            }
            if (canLeaveWorkspace) {
              memberMenuItems.push({
                id: "leave-workspace",
                label:
                  isOwnerMember && !canOwnerLeave
                    ? "Không thể rời workspace"
                    : "Rời workspace",
                tone: "danger",
                disabled: isOwnerMember && !canOwnerLeave,
                dividerBefore: !canCancelInvitation && hasDivider,
                onSelect: () => {
                  if (!isOwnerMember || canOwnerLeave) onLeaveWorkspace();
                },
              });
            }
            if (canRemoveMember) {
              memberMenuItems.push({
                id: "remove-member",
                label: "Xóa khỏi workspace",
                tone: "danger",
                dividerBefore:
                  !canCancelInvitation && !canLeaveWorkspace && hasDivider,
                onSelect: () => onRemoveMember(member),
              });
            }

            return (
              <tr
                key={member.id}
              >
                <td className="px-4 py-3.5 sm:px-6">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {getInitials(member.fullName?.trim() || member.email) ||
                        "?"}
                      {assignmentLocked && (
                        <Lock
                          size={13}
                          aria-label="Đang khóa nhận lead"
                          className="absolute -left-2 top-1/2 -translate-y-1/2 rounded-sm bg-white text-amber-600"
                        />
                      )}
                    </span>
                    <div className="group flex min-w-0 flex-col">
                      <span
                        className="truncate font-semibold text-slate-900"
                        title={displayName}
                      >
                        {displayName}
                      </span>
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className="truncate text-[11px] text-slate-500"
                          title={member.email}
                        >
                          {member.email}
                        </span>
                        <CopyValueButton value={member.email} label="email" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-slate-600 sm:px-6">
                  {effectiveSubTab === "members" ? (
                    member.phoneNumber ? (
                      <div className="group flex min-w-0 items-center justify-between gap-1">
                        <span className="truncate whitespace-nowrap">
                          {member.phoneNumber}
                        </span>
                        <CopyValueButton
                          value={member.phoneNumber}
                          label="số điện thoại"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )
                  ) : member.invitedAt ? (
                    new Date(member.invitedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 sm:px-6">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`inline-block whitespace-nowrap rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
                        isOwnerMember
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isOwnerMember
                        ? "Chủ sở hữu"
                        : member.isWorkspaceManager
                          ? "Quản lý workspace"
                          : "Nhân viên tư vấn"}
                    </span>
                    {member.isWorkspaceManager && !isOwnerMember && (
                      <span className="text-[10px] text-slate-500">
                        Kiêm Nhân viên tư vấn
                      </span>
                    )}
                    {isOwner &&
                      !isOwnerMember &&
                      !isPending &&
                      member.memberId &&
                      onSetWorkspaceManagerPermission && (
                        <button
                          type="button"
                          className="whitespace-nowrap text-[10px] font-semibold text-blue-700 hover:underline"
                          onClick={async () => {
                            const enabled = !member.isWorkspaceManager;
                            const action = enabled ? "cấp" : "thu hồi";
                            if (
                              !window.confirm(
                                `Bạn muốn ${action} quyền Quản lý workspace cho ${member.fullName || member.email}?`,
                              )
                            )
                              return;
                            try {
                              await onSetWorkspaceManagerPermission(
                                member.id,
                                enabled,
                              );
                            } catch {
                              // The hook already reports the API error.
                            }
                          }}
                        >
                          {member.isWorkspaceManager
                            ? "Thu hồi quyền"
                            : "Cấp quyền quản lý"}
                        </button>
                      )}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-600 sm:px-6">
                  <div className="flex min-h-9 min-w-0 flex-col items-start gap-1">
                    {isPending ? (
                      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        Đang chờ
                      </span>
                    ) : hasAssignedShifts && routingStatus ? (
                      <>
                        <span
                          className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            routingStatus.activeLeaveExceptionId
                              ? "bg-amber-50 text-amber-700"
                              : routingStatus.isOnShift
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-1.5 shrink-0 rounded-full ${routingDotClass}`}
                          />
                          <span className="shrink-0">{routingLabel}</span>
                          <span className="truncate font-medium">
                            · {routingStatus.shifts?.join(", ")}
                          </span>
                        </span>
                        <span className="pl-2 text-[11px] text-slate-500">
                          {routingStatus.openConversations ?? 0}/
                          {routingStatus.effectiveCapacity ?? 0} lead
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Chưa phân ca</span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 pl-3 pr-6 text-right align-middle">
                  {hasActions ? (
                    <div className="flex w-full items-center justify-end">
                      <ActionOverflowMenu
                        ariaLabel={`Thao tác với ${displayName}`}
                        items={memberMenuItems}
                        className="w-10"
                      />
                    </div>
                  ) : (
                    <span className="inline-block pr-2 text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);
