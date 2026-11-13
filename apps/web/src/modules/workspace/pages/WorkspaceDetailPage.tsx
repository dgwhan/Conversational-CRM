import React, { useState } from 'react';
import { Tabs } from '../../../components/ui/index.js';
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
import { EditWorkspaceModal, DeleteWorkspaceModal } from '../onboarding/components/workspace/tabs/modals/index.js';
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
    togglingChannelId, contactsCount, isLoadingContacts, effectiveStaffList, activeStaffList,
    resolvedAdminName, canOwnerLeave, handleSyncChannel, handleToggleChannel,
    handleDisconnectChannel, handleConnectSuccess, handleRemoveMember, handleLeaveWorkspace,
    handleInviteMember, handleCancelInvitation, handleSaveWorkspaceInfo, handleDeleteWorkspace,
  } = detail;

  // Tab điều hướng dùng component Tabs hệ thống
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'members'>('overview');

  // Modal Sửa & Xóa Workspace
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Modal kết nối kênh mới
  const [modalChannel, setModalChannel] = useState<ChannelKey | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<ConnectRenewTarget | null>(null);

  // Xử lý khi kết nối kênh thành công từ modal OAuth
  const onConnectSuccess = async (channelKey: ChannelKey, pages?: DiscoveredPageDto[]) => {
    await handleConnectSuccess(channelKey, pages);
    setIsConnectModalOpen(false);
    setModalChannel(null);
  };

  const domainLabel = getDomainLabel(workspace.domain);

  return (
    <div className="workspace-flat-detail w-full max-w-[1600px] mx-auto p-3 sm:p-4 min-h-full space-y-3.5 sm:space-y-4">
      {/* 1. Header chi tiết Workspace & Dãy nút thao tác */}
      <WorkspaceDetailHeader
        workspace={workspace}
        isActive={isActive}
        domainLabel={domainLabel}
        canOwnerLeave={canOwnerLeave}
        onBack={onBack}
        onSelectWorkspace={onSelectWorkspace}
        onGoToInbox={onGoToInbox}
        onLeaveWorkspace={handleLeaveWorkspace}
        onEditWorkspace={() => setIsEditModalOpen(true)}
        onSaveWorkspaceName={async (newName) => {
          await handleSaveWorkspaceInfo(workspace.id, {
            name: newName,
            domain: workspace.domain,
          });
        }}
        onDeleteWorkspace={myWorkspaces.length > 1 ? () => setIsDeleteModalOpen(true) : undefined}
      />

      {/* 2. Thanh Tabs trượt gạch dưới hệ thống chuẩn */}
      <Tabs<'overview' | 'channels' | 'members'>
        items={[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'channels', label: 'Kênh kết nối', count: channels.length },
          { id: 'members', label: 'Thành viên', count: activeStaffList.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Tab 1: Tổng quan */}
      {activeTab === 'overview' && (
        <WorkspaceOverviewTab
          workspace={workspace}
          domainLabel={domainLabel}
          membersCount={activeStaffList.length}
          channelsCount={channels.length}
          contactsCount={contactsCount}
          isLoadingContacts={isLoadingContacts}
          adminName={resolvedAdminName}
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

      {/* 4. Tab 2: Kênh kết nối */}
      {activeTab === 'channels' && (
        <WorkspaceChannelsTab
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          isOwner={Boolean(workspace.isOwner)}
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

      {/* 5. Tab 3: Thành viên */}
      {activeTab === 'members' && (
        <WorkspaceMembersTab
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          isOwner={Boolean(workspace.isOwner)}
          currentStaffId={staffId}
          currentStaffEmail={staffEmail}
          staffMembers={effectiveStaffList}
          onRemoveMember={handleRemoveMember}
          onLeaveWorkspace={handleLeaveWorkspace}
          onInviteMember={handleInviteMember}
          onCancelInvitation={handleCancelInvitation}
        />
      )}

      {/* Modal kết nối kênh OAuth */}
      {modalChannel && (
        <OAuthSimulationModal
          channel={modalChannel}
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
    </div>
  );
};

// Alias for backwards compatibility
export const WorkspaceDetailView = WorkspaceDetailPage;
export type { WorkspaceDetailPageProps as WorkspaceDetailViewProps };
