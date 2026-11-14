import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Plus, Users } from "lucide-react";
import { buildRoute } from "../../../../../../../config/routes.js";
import {
  WORKSPACE_MEMBER_STATUS,
  type ManagedStaffItem,
} from "../../../../../WorkspaceConfigContext.js";
import { StaffRole } from "../../../../../../../features/auth/constants/auth.constants.js";
import {
  Button,
  PageToolbar,
  SearchInput,
  Select,
  Tabs,
} from "../../../../../../../components/ui/index.js";
import { notify } from "../../../../../../../components/feedback/toastEmitter.js";
import { matchesUnaccent } from "../../../../../../../lib/unaccent.js";
import { useWorkspaceLeadRouting } from "../../../../../hooks/useWorkspaceLeadRouting.js";
import { InviteMemberModal } from "../modals/index.js";
import { MemberLeadLockDialog } from "./MemberLeadLockDialog.js";
import { MemberOffboardingDialog } from "./MemberOffboardingDialog.js";
import { WorkspaceMembersTable } from "./WorkspaceMembersTable.js";
import type {
  MemberHandoverMode,
  WorkspaceMembersTabProps,
} from "./types.js";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const WorkspaceMembersTab: React.FC<WorkspaceMembersTabProps> = ({
  workspaceId,
  isOwner,
  canManageMembers: canManageMembersProp,
  currentStaffId,
  currentStaffEmail,
  staffMembers,
  onRemoveMember,
  onLeaveWorkspace,
  onInviteMember,
  onCancelInvitation,
  onSetWorkspaceManagerPermission,
  onTransferOwnership,
  onToggleStaffLock,
}) => {
  const canManageMembers = canManageMembersProp ?? isOwner;
  const navigate = useNavigate();
  const routing = useWorkspaceLeadRouting(workspaceId);
  const routingByMemberId = useMemo(
    () => new Map(routing.roster.map((item) => [item.workspaceMemberId, item])),
    [routing.roster],
  );
  const [offboardingMember, setOffboardingMember] =
    useState<ManagedStaffItem | null>(null);
  const [isOffboarding, setIsOffboarding] = useState(false);
  const [lockingMember, setLockingMember] = useState<ManagedStaffItem | null>(
    null,
  );
  const [isLocking, setIsLocking] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"members" | "invitations">(
    "members",
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [memberPage, setMemberPage] = useState(1);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    setOffboardingMember(null);
    setLockingMember(null);
  }, [workspaceId]);

  const activeMembers = staffMembers.filter(
    (member) =>
      !member.memberStatus ||
      member.memberStatus === WORKSPACE_MEMBER_STATUS.ACTIVE,
  );
  const pendingInvitations = staffMembers.filter(
    (member) => member.memberStatus === WORKSPACE_MEMBER_STATUS.PENDING,
  );
  const effectiveSubTab = canManageMembers ? activeSubTab : "members";
  const currentTabMembers =
    effectiveSubTab === "members" ? activeMembers : pendingInvitations;

  // Thành viên đang hoạt động khác ngoài tài khoản hiện tại
  const otherActiveMembers = useMemo(
    () =>
      activeMembers.filter(
        (member) =>
          member.id !== currentStaffId &&
          (!member.email ||
            !currentStaffEmail ||
            member.email.toLowerCase() !== currentStaffEmail.toLowerCase()),
      ),
    [activeMembers, currentStaffId, currentStaffEmail],
  );

  // Chủ sở hữu có thể rời nếu có ít nhất 1 thành viên đang hoạt động khác để nhận chuyển giao quyền
  const canOwnerLeave = otherActiveMembers.length > 0;
  const normalizedSearch = memberSearch.trim();
  const lowerSearch = normalizedSearch.toLowerCase();
  const digitsSearch = normalizedSearch.replace(/\D/g, "");

  const filteredStaff = currentTabMembers.filter((member) => {
    const rawPhone = member.phoneNumber ? String(member.phoneNumber).replace(/\D/g, "") : "";
    const matchesSearch =
      !normalizedSearch ||
      matchesUnaccent(member.fullName, normalizedSearch) ||
      member.fullName.toLowerCase().includes(lowerSearch) ||
      member.email.toLowerCase().includes(lowerSearch) ||
      matchesUnaccent(member.email, normalizedSearch) ||
      (member.phoneNumber && member.phoneNumber.toLowerCase().includes(lowerSearch)) ||
      (digitsSearch.length >= 3 && rawPhone.includes(digitsSearch));
    const matchesRole = roleFilter === "ALL" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  const totalPages = Math.ceil(filteredStaff.length / pageSize) || 1;
  const paginatedStaff = filteredStaff.slice(
    (memberPage - 1) * pageSize,
    memberPage * pageSize,
  );
  const roleFilterOptions = [
    { value: "ALL", label: "Tất cả vai trò" },
    { value: StaffRole.OWNER, label: "Chủ sở hữu" },
    { value: StaffRole.STAFF, label: "Nhân viên tư vấn" },
  ];

  const handleOffboarding = async (
    mode: MemberHandoverMode,
    targetId?: string,
  ) => {
    if (!offboardingMember?.memberId) return;
    setIsOffboarding(true);
    try {
      const result = await routing.offboardMember(
        offboardingMember.memberId,
        mode,
        targetId,
      );
      await onRemoveMember(
        offboardingMember.id,
        offboardingMember.fullName || offboardingMember.email,
        offboardingMember.role,
      );
      notify.success(
        "Đã bàn giao hội thoại và gỡ nhân viên khỏi workspace.",
      );
      if (result.overCapacity) {
        notify.info(
          "Người nhận hiện vượt hạn mức hội thoại mở. Đây là cảnh báo thông tin.",
        );
      }
      setOffboardingMember(null);
    } catch (error) {
      notify.error(
        getErrorMessage(
          error,
          "Không thể hoàn tất bàn giao nhân viên.",
        ),
      );
    } finally {
      setIsOffboarding(false);
    }
  };

  const handleLocking = async (
    mode: MemberHandoverMode,
    targetId?: string,
  ) => {
    if (!lockingMember?.memberId) return;
    setIsLocking(true);
    try {
      const result = await routing.setAssignmentLock(
        lockingMember.memberId,
        true,
        mode,
        targetId,
      );
      notify.success(
        `Đã khóa nhận lead và bàn giao ${result.handedOverCount ?? 0} hội thoại.`,
      );
      if (result.overCapacity) {
        notify.info(
          "Người nhận hiện vượt hạn mức hội thoại mở. Đây là cảnh báo thông tin.",
        );
      }
      setLockingMember(null);
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể khóa nhận lead."));
    } finally {
      setIsLocking(false);
    }
  };

  const handleToggleLeadLock = (
    member: ManagedStaffItem,
    isLocked: boolean,
  ) => {
    if (!member.memberId) return;
    if (isLocked) {
      void routing
        .setAssignmentLock(member.memberId, false)
        .then(() => notify.success("Đã mở nhận lead."))
        .catch((error: unknown) =>
          notify.error(getErrorMessage(error, "Không thể mở nhận lead.")),
        );
    } else {
      setLockingMember(member);
    }
  };

  const handleCancelInvitation = (
    memberId: string,
    displayName: string,
    role: string,
  ) => {
    if (onCancelInvitation) {
      void onCancelInvitation(memberId, displayName);
    } else {
      void onRemoveMember(memberId, displayName, role);
    }
  };

  return (
    <div className="space-y-3.5 pt-1">
      {canManageMembers && (
        <Tabs
          aria-label="Danh sách thành viên và lời mời"
          activeTab={effectiveSubTab}
          onChange={(tab) => {
            setActiveSubTab(tab);
            setMemberPage(1);
          }}
          variant="segmented"
          borderBottom={false}
          items={[
            {
              id: "members" as const,
              label: "Thành viên",
              count: activeMembers.length,
              icon: <Users size={14} />,
            },
            {
              id: "invitations" as const,
              label: "Lời mời đã gửi",
              count: pendingInvitations.length || undefined,
              icon: <Mail size={14} />,
            },
          ]}
        />
      )}

      <PageToolbar
        search={
          <SearchInput
            value={memberSearch}
            onChange={(value) => {
              setMemberSearch(value);
              setMemberPage(1);
            }}
            placeholder={
              effectiveSubTab === "members"
                ? "Tìm kiếm thành viên theo tên, email hoặc số điện thoại... (Nhấn /)"
                : "Tìm kiếm lời mời theo tên, email hoặc số điện thoại..."
            }
            shortcutHint="/"
            size="sm"
            iconClassName="text-[#9CA3AF]"
          />
        }
        filters={
          <Select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setMemberPage(1);
            }}
            options={roleFilterOptions}
            size="sm"
          />
        }
        actions={
          canManageMembers && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Mời thành viên
            </Button>
          )
        }
      />

      <WorkspaceMembersTable
        key={workspaceId}
        members={paginatedStaff}
        effectiveSubTab={effectiveSubTab}
        memberSearch={memberSearch}
        isOwner={isOwner}
        canManageMembers={canManageMembers}
        currentStaffId={currentStaffId}
        currentStaffEmail={currentStaffEmail}
        canOwnerLeave={canOwnerLeave}
        routingByMemberId={routingByMemberId}
        onConfigureShift={(memberId) => {
          const query = new URLSearchParams({
            tab: "shifts",
            memberId,
          });
          navigate(
            `${buildRoute.workspaceSettings(workspaceId)}?${query.toString()}`,
          );
        }}
        onToggleLeadLock={handleToggleLeadLock}
        onCancelInvitation={handleCancelInvitation}
        onLeaveWorkspace={() => void onLeaveWorkspace()}
        onRemoveMember={setOffboardingMember}
        onSetWorkspaceManagerPermission={onSetWorkspaceManagerPermission}
        onTransferOwnership={onTransferOwnership}
        onToggleStaffLock={onToggleStaffLock}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Hiển thị{" "}
          {paginatedStaff.length > 0 ? (memberPage - 1) * pageSize + 1 : 0}–
          {Math.min(memberPage * pageSize, filteredStaff.length)} trên tổng số{" "}
          {filteredStaff.length}{" "}
          {effectiveSubTab === "members" ? "thành viên" : "lời mời"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={memberPage === 1}
              onClick={() => setMemberPage((page) => Math.max(page - 1, 1))}
            >
              Trước
            </Button>
            <span className="px-2 font-medium text-slate-700">
              {memberPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={memberPage === totalPages}
              onClick={() =>
                setMemberPage((page) => Math.min(page + 1, totalPages))
              }
            >
              Sau
            </Button>
          </div>
        )}
      </div>

      {offboardingMember && canManageMembers && (
        <MemberOffboardingDialog
          member={offboardingMember}
          roster={routing.roster}
          isSubmitting={isOffboarding}
          onCancel={() => setOffboardingMember(null)}
          onSubmit={(mode, targetId) =>
            void handleOffboarding(mode, targetId)
          }
        />
      )}
      {lockingMember && canManageMembers && (
        <MemberLeadLockDialog
          member={lockingMember}
          roster={routing.roster}
          isSubmitting={isLocking}
          onCancel={() => setLockingMember(null)}
          onSubmit={(mode, targetId) => void handleLocking(mode, targetId)}
        />
      )}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteMember={onInviteMember}
        allowOwnerRole={isOwner}
      />
    </div>
  );
};
