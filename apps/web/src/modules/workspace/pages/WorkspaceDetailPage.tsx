import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs } from '../../../components/ui/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import type { WorkspaceItem } from '../WorkspaceConfigContext.js';
import { getDomainLabel } from '../types/domain.types.js';
import type { ChannelKey, DiscoveredPageDto } from '../onboarding/types.js';
import { OAuthSimulationModal } from '../onboarding/components/OAuthSimulationModal.js';
import {
  WorkspaceOverviewTab,
  WorkspaceChannelsTab,
  type ConnectRenewTarget,
  WorkspaceMembersTab,
} from '../onboarding/components/workspace/tabs/index.js';
import { WorkspaceSettingsTab } from '../components/settings/WorkspaceSettingsTab.js';
import { ShiftManagementTab } from '../components/settings/shift-management/ShiftManagementTab.js';
import {
  EditWorkspaceModal,
  DeleteWorkspaceModal,
  TransferOwnershipModal,
} from '../onboarding/components/workspace/tabs/modals/index.js';
import { WorkspaceDetailHeader } from '../onboarding/components/workspace/WorkspaceDetailHeader.js';
import { useWorkspaceDetail } from '../hooks/useWorkspaceDetail.js';

export interface WorkspaceDetailPageProps {
  workspace: WorkspaceItem;
  isActive: boolean;
  onBack: () => void;
  onSelectWorkspace: (workspaceId: string) => Promise<void> | void;
  onGoToInbox: (workspaceId: string) => void;
}

/**
 * Trang chi tiết Không gian làm việc (Workspace Detail Page)
 * Bao gồm Header điều hướng và 3 Tab: Tổng quan, Kênh kết nối, Thành viên
 */
export const WorkspaceDetailPage: React.FC<WorkspaceDetailPageProps> = ({
  workspace,
  isActive,
  onBack,
  onSelectWorkspace,
  onGoToInbox,
}) => {
  const detail = useWorkspaceDetail(workspace, onBack);
  const {
    staffId, staffEmail, myWorkspaces, channels, isLoadingChannels, syncingChannelId,
    togglingChannelId, contactsCount, isLoadingContacts, isLoadingStaff, effectiveStaffList, activeStaffList,
    resolvedAdminName, canOwnerLeave, handleSyncChannel, handleToggleChannel,
    canManageWorkspace,
    handleDisconnectChannel, handleConnectSuccess, handleRemoveMember, handleLeaveWorkspace,
    handleInviteMember, handleCancelInvitation, handleSaveWorkspaceInfo, handleDeleteWorkspace,
    handleSetWorkspaceManagerPermission, handleTransferOwnership, handleToggleStaffLock,
  } = detail;

  // Tab điều hướng dùng component Tabs hệ thống
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'members' | 'shifts' | 'settings'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'shifts') return 'shifts';
    if (tab === 'settings') return 'settings';
    if (tab === 'channels') return 'channels';
    if (tab === 'members') return 'members';
    return 'overview';
  });

  const handleTabChange = (tab: 'overview' | 'channels' | 'members' | 'shifts' | 'settings') => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'overview') {
          next.delete('tab');
          next.delete('subtab');
        } else {
          next.set('tab', tab);
          if (tab !== 'settings') {
            next.delete('subtab');
          }
        }
        return next;
      },
      { replace: true }
    );
  };

  // Modal Sửa & Xóa Workspace
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal kết nối kênh mới
  const [modalChannel, setModalChannel] = useState<ChannelKey | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<ConnectRenewTarget | null>(null);

  // Modal chuyển quyền Chủ sở hữu & Rời workspace (dùng chung cho Header và Cột thao tác)
  const [transferModalState, setTransferModalState] = useState<{
    isOpen: boolean;
    preselectedMemberId?: string;
    isLeaving: boolean;
  }>({
    isOpen: false,
    preselectedMemberId: undefined,
    isLeaving: false,
  });

  // Thành viên đang hoạt động khác ngoài tài khoản hiện tại
  const otherActiveMembers = useMemo(
    () =>
      activeStaffList.filter(
        (member) =>
          member.id !== staffId &&
          (!member.email ||
            !staffEmail ||
            member.email.toLowerCase() !== staffEmail.toLowerCase()),
      ),
    [activeStaffList, staffId, staffEmail],
  );

  // Mở modal Rời Workspace (Chủ sở hữu bắt buộc chuyển quyền; Staff/Manager xác nhận rời)
  const handleOpenLeaveWorkspace = async () => {
    if (workspace.isOwner) {
      if (otherActiveMembers.length === 0) {
        notify.warning(
          'Bạn là thành viên duy nhất trong Không gian làm việc. Nếu không còn nhu cầu sử dụng, bạn có thể chọn "Xóa Workspace" trong Cài đặt.',
          'Không Thể Rời Workspace',
        );
        return;
      }
      setTransferModalState({
        isOpen: true,
        preselectedMemberId: otherActiveMembers[0]?.id,
        isLeaving: true,
      });
      return;
    }
    await handleLeaveWorkspace();
  };

  // Mở modal Chuyển quyền Chủ sở hữu từ Cột thao tác
  const handleOpenTransferModal = (targetMemberId: string) => {
    setTransferModalState({
      isOpen: true,
      preselectedMemberId: targetMemberId,
      isLeaving: false,
    });
  };

  // Xác nhận chuyển quyền trong Modal
  const handleConfirmTransfer = async (
    targetMemberId: string,
    leaveWorkspace: boolean,
  ) => {
    await handleTransferOwnership(targetMemberId, leaveWorkspace);
  };

  // Xử lý khi kết nối kênh thành công từ modal OAuth
  const onConnectSuccess = async (channelKey: ChannelKey, pages?: DiscoveredPageDto[]) => {
    await handleConnectSuccess(channelKey, pages);
    setIsConnectModalOpen(false);
    setModalChannel(null);
  };

  const domainLabel = getDomainLabel(workspace.domain);

  return (
    <div className="workspace-flat-detail w-full min-h-full bg-white flex flex-col rounded-none border-none shadow-none">
      {/* 1. Header chi tiết Workspace & Dãy nút thao tác (Soft neutral tint bg-slate-50/90) */}
      <div className="w-full bg-slate-50/90 px-3.5 sm:px-6 md:px-10 pt-3.5 sm:pt-5 pb-3">
        <WorkspaceDetailHeader
          workspace={workspace}
          isActive={isActive}
          domainLabel={domainLabel}
          canOwnerLeave={canOwnerLeave}
          canManageWorkspace={Boolean(workspace.isOwner)}
          onBack={onBack}
          onSelectWorkspace={onSelectWorkspace}
          onGoToInbox={onGoToInbox}
          onLeaveWorkspace={handleOpenLeaveWorkspace}
          onEditWorkspace={() => setIsEditModalOpen(true)}
          onSaveWorkspaceName={async (newName) => {
            await handleSaveWorkspaceInfo(workspace.id, {
              name: newName,
              domain: workspace.domain,
            });
          }}
          onDeleteWorkspace={myWorkspaces.length > 1 ? () => setIsDeleteModalOpen(true) : undefined}
        />
      </div>

      {/* 2. Thanh Tabs trượt gạch dưới hệ thống chuẩn - Full-width với crisp 1px hairline border & bg-slate-50/90 */}
      <div className="w-full border-b border-slate-200 bg-slate-50/90 px-3.5 sm:px-6 md:px-10">
        <Tabs<'overview' | 'channels' | 'members' | 'shifts' | 'settings'>
          className="gap-4 sm:gap-8 md:gap-10"
          items={[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'channels', label: 'Kênh kết nối' },
            { id: 'members', label: 'Thành viên' },
            { id: 'shifts', label: 'Nhân viên trực ca' },
            { id: 'settings', label: 'Cấu hình' },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* 3. Nội dung Tab: Split-pane liền mạch (Flush) cho Cấu hình, và Container có padding cho các Tab khác */}
      {activeTab === 'settings' ? (
        <div className="w-full flex-1 bg-white flex min-h-0 items-stretch">
          <WorkspaceSettingsTab
            workspaceId={workspace.id}
            isOwner={Boolean(workspace.isOwner)}
            canManageWorkspace={canManageWorkspace}
          />
        </div>
      ) : (
        <div className="w-full max-w-[1600px] mx-auto p-6 sm:p-10 space-y-6">
          {/* Tab 1: Tổng quan */}
          {activeTab === 'overview' && (
            <WorkspaceOverviewTab
              workspace={workspace}
              domainLabel={domainLabel}
              membersCount={activeStaffList.length}
              channelsCount={channels.length}
              contactsCount={contactsCount}
              isLoadingContacts={isLoadingContacts}
              adminName={resolvedAdminName}
              canManageWorkspace={Boolean(workspace.isOwner)}
              onEditWorkspace={() => setIsEditModalOpen(true)}
              onSaveWorkspaceName={async (newName) => {
                await handleSaveWorkspaceInfo(workspace.id, {
                  name: newName,
                  domain: workspace.domain,
                });
              }}
              onDeleteWorkspace={myWorkspaces.length > 1 ? () => setIsDeleteModalOpen(true) : undefined}
            />
          )}

          {/* Tab 2: Kênh kết nối */}
          {activeTab === 'channels' && (
            <WorkspaceChannelsTab
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              isOwner={Boolean(workspace.isOwner)}
              canManageChannels={Boolean(workspace.isOwner)}
              canConnectChannels={canManageWorkspace}
              channels={channels}
              isLoading={isLoadingChannels}
              syncingChannelId={syncingChannelId}
              togglingChannelId={togglingChannelId}
              onSyncChannel={handleSyncChannel}
              onToggleChannel={handleToggleChannel}
              onDisconnectChannel={handleDisconnectChannel}
              onOpenConnectModal={(chKey, target) => {
                setModalChannel(chKey);
                setRenewTarget(target ?? null);
                setIsConnectModalOpen(true);
              }}
            />
          )}

          {/* Tab 3: Thành viên */}
          {activeTab === 'members' && (
            <WorkspaceMembersTab
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              isOwner={Boolean(workspace.isOwner)}
              canManageMembers={canManageWorkspace}
              currentStaffId={staffId}
              currentStaffEmail={staffEmail}
              staffMembers={effectiveStaffList}
              isLoadingStaff={isLoadingStaff}
              onRemoveMember={handleRemoveMember}
              onLeaveWorkspace={handleOpenLeaveWorkspace}
              onInviteMember={handleInviteMember}
              onCancelInvitation={handleCancelInvitation}
              onSetWorkspaceManagerPermission={handleSetWorkspaceManagerPermission}
              onTransferOwnership={handleOpenTransferModal}
              onToggleStaffLock={handleToggleStaffLock}
            />
          )}

          {/* Tab 4: Danh sách nhân viên trực ca */}
          {activeTab === 'shifts' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
              <div className="pb-5 mb-6 border-b border-slate-200">
                <h1 className="text-lg font-semibold text-slate-950 m-0">
                  Danh sách nhân viên trực ca
                </h1>
                <p className="text-[13px] text-slate-600 mt-1 mb-0 max-w-xl">
                  Theo dõi trạng thái trực, phân bổ hạn mức lead và điều phối nhân sự theo ca làm việc.
                </p>
              </div>
              <ShiftManagementTab
                workspaceId={workspace.id}
                canManageShifts={canManageWorkspace}
                focusMemberId={searchParams.get('memberId') || undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal kết nối kênh OAuth */}
      {modalChannel && (
        <OAuthSimulationModal
          channel={modalChannel}
          workspaceId={workspace.id}
          isOpen={isConnectModalOpen}
          onClose={() => {
            setIsConnectModalOpen(false);
            setModalChannel(null);
            setRenewTarget(null);
          }}
          onSuccess={onConnectSuccess}
          renewTarget={renewTarget}
        />
      )}

      {/* Modal chỉnh sửa thông tin Không gian làm việc */}
      <EditWorkspaceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        workspace={workspace}
        onSave={async (workspaceId, data) => {
          await handleSaveWorkspaceInfo(workspaceId, data);
        }}
      />

      {/* Modal xóa Không gian làm việc */}
      <DeleteWorkspaceModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        workspace={workspace}
        onConfirm={handleDeleteWorkspace}
      />

      {/* Modal chuyển quyền Chủ sở hữu & Rời workspace (Dùng chung cho nút Header và Cột thao tác) */}
      <TransferOwnershipModal
        isOpen={transferModalState.isOpen}
        onClose={() =>
          setTransferModalState((prev) => ({ ...prev, isOpen: false }))
        }
        workspaceName={workspace.name}
        activeCandidates={otherActiveMembers}
        preselectedMemberId={transferModalState.preselectedMemberId}
        isLeaving={transferModalState.isLeaving}
        onConfirm={handleConfirmTransfer}
      />
    </div>
  );
};

// Alias for backwards compatibility
export const WorkspaceDetailView = WorkspaceDetailPage;
export type { WorkspaceDetailPageProps as WorkspaceDetailViewProps };
