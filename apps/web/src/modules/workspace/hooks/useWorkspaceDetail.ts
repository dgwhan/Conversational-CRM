import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useUserRole } from '../../auth/index.js';
import { StaffRole } from '../../../features/auth/constants/auth.constants.js';
import {
  useWorkspaceConfig,
  WORKSPACE_MEMBER_STATUS,
  type WorkspaceItem,
} from '../WorkspaceConfigContext.js';
import type { ChannelKey, DiscoveredPageDto } from '../onboarding/types.js';
import type { ConnectedChannelItem } from '../onboarding/components/workspace/tabs/index.js';

export function useWorkspaceDetail(workspace: WorkspaceItem, onBack: () => void) {
  const { staffId, staffName, staffEmail, ownerId, isOwner } = useUserRole();
  const effectiveOwnerId = ownerId ?? (isOwner ? staffId : '');
  const {
    staffMembers,
    fetchStaffList,
    createStaffMember,
    deleteStaffMember,
    cancelInvitation,
    updateWorkspaceInfo,
    deleteWorkspace,
    myWorkspaces,
  } = useWorkspaceConfig();

  const [channels, setChannels] = useState<ConnectedChannelItem[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null);
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null);
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  const loadChannels = useCallback(async () => {
    setIsLoadingChannels(true);
    try {
      const response = await apiClient.getChannels(workspace.id, effectiveOwnerId);
      if (!Array.isArray(response)) throw new Error('Phản hồi danh sách kênh không đúng định dạng.');
      setChannels(response as unknown as ConnectedChannelItem[]);
    } catch (error) {
      notify.error(`Không thể tải danh sách kênh: ${(error as Error).message}`);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [workspace.id, effectiveOwnerId]);

  const loadContactsCount = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const response = await apiClient.getCustomers({ workspaceId: workspace.id });
      if (typeof response.total === 'number') setContactsCount(response.total);
      else if (Array.isArray(response.items)) setContactsCount(response.items.length);
      else setContactsCount(null);
    } catch (error) {
      setContactsCount(null);
      notify.error(`Không thể tải số lượng khách hàng: ${(error as Error).message}`);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [workspace.id]);

  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => { void loadContactsCount(); }, [loadContactsCount]);
  useEffect(() => { void fetchStaffList(workspace.id); }, [fetchStaffList, workspace.id]);

  const effectiveStaffList = staffMembers.filter(
    (member, index, members) => index === members.findIndex((candidate) => candidate.id === member.id),
  );
  const activeStaffList = effectiveStaffList.filter(
    (member) => member.memberStatus === WORKSPACE_MEMBER_STATUS.ACTIVE,
  );
  const ownerStaff = effectiveStaffList.find(
    (member) => (workspace.ownerId && member.id === workspace.ownerId) || member.role === StaffRole.OWNER,
  );
  const resolvedAdminName = ownerStaff?.fullName ?? workspace.ownerName ?? (isOwner ? staffName : '') ?? '';
  const canOwnerLeave = activeStaffList.filter((member) => member.role === StaffRole.OWNER).length >= 2;

  const handleSyncChannel = async (channelId: string) => {
    setSyncingChannelId(channelId);
    try {
      const response = await apiClient.syncChannel(channelId, workspace.id);
      notify.success(
        `Đã đồng bộ ${response.syncedCount ?? 0} tin nhắn & ${response.conversationsCount ?? 0} cuộc hội thoại cho trang ${response.pageName ?? ''}!`,
        'Đồng bộ thành công',
      );
    } catch (error) {
      notify.error(`Lỗi đồng bộ: ${(error as Error).message}`);
    } finally {
      setSyncingChannelId(null);
    }
  };

  const handleToggleChannel = async (channelId: string, currentActive: boolean) => {
    setTogglingChannelId(channelId);
    try {
      await apiClient.toggleChannel(channelId, !currentActive, workspace.id);
      setChannels((current) => current.map((channel) =>
        channel.id === channelId ? { ...channel, isActive: !currentActive } : channel,
      ));
      notify.info(`Đã ${!currentActive ? 'kích hoạt' : 'tạm dừng'} kênh kết nối.`);
    } catch (error) {
      notify.error(`Không thể thay đổi trạng thái kênh: ${(error as Error).message}`);
    } finally {
      setTogglingChannelId(null);
    }
  };

  const handleDisconnectChannel = async (channelId: string, channelName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt kết nối kênh "${channelName}" khỏi Không gian làm việc này?`)) return;
    try {
      await apiClient.disconnectChannel(channelId, workspace.id);
      setChannels((current) => current.filter((channel) => channel.id !== channelId));
      notify.success(`Đã ngắt kết nối kênh "${channelName}".`);
    } catch (error) {
      notify.error(`Không thể ngắt kết nối: ${(error as Error).message}`);
    }
  };

  const handleConnectSuccess = async (_channelKey: ChannelKey, pages?: DiscoveredPageDto[]) => {
    if (!pages?.length) return;
    const pagesToActivate = pages.map((page) => ({
      channel: page.channel,
      externalAccountId: page.externalAccountId,
      displayName: page.name,
      avatarUrl: page.avatarUrl ?? '',
      category: page.category,
      accessToken: page.accessToken,
      metadata: page.metadata ?? {},
    }));
    try {
      await apiClient.activateChannels(pagesToActivate, workspace.id, effectiveOwnerId);
      notify.success(`Đã kích hoạt thành công kênh vào Không gian làm việc "${workspace.name}"!`);
      await loadChannels();
    } catch (error) {
      notify.error(`Lỗi kích hoạt kênh: ${(error as Error).message}`);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string, memberRole?: string) => {
    const isTargetOwner = memberRole === StaffRole.OWNER;
    if (isTargetOwner && !canOwnerLeave) {
      notify.error('Không thể loại bỏ Chủ sở hữu. Không gian làm việc phải có ít nhất 1 Chủ sở hữu.');
      return;
    }
    const prompt = isTargetOwner
      ? `Bạn có chắc chắn muốn loại bỏ Chủ sở hữu "${memberName}" khỏi Không gian làm việc này?`
      : `Bạn có chắc chắn muốn xóa thành viên "${memberName}" khỏi Không gian làm việc này?`;
    if (!window.confirm(prompt)) return;
    try {
      await deleteStaffMember(memberId, workspace.id);
      notify.success(`Đã loại bỏ "${memberName}" khỏi Không gian làm việc.`);
      await fetchStaffList(workspace.id);
    } catch (error) {
      notify.error(`Lỗi thao tác: ${(error as Error).message}`);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (workspace.isOwner && !canOwnerLeave) {
      notify.error('Không gian làm việc phải có ít nhất 1 Chủ sở hữu. Không thể rời.');
      return;
    }
    const prompt = workspace.isOwner
      ? `Bạn có chắc chắn muốn rời khỏi Không gian làm việc "${workspace.name}"? Quyền quản trị chính sẽ được bàn giao cho Chủ sở hữu còn lại.`
      : `Bạn có chắc chắn muốn rời khỏi Không gian làm việc "${workspace.name}"?`;
    if (!window.confirm(prompt)) return;
    const currentMember = effectiveStaffList.find((member) =>
      member.id === staffId || Boolean(member.email && staffEmail && member.email.toLowerCase() === staffEmail.toLowerCase()),
    );
    if (!currentMember) {
      notify.error('Không tìm thấy membership của tài khoản hiện tại trong workspace.');
      return;
    }
    try {
      await deleteStaffMember(currentMember.id, workspace.id);
      notify.success(`Bạn đã rời khỏi Không gian làm việc "${workspace.name}".`);
      onBack();
    } catch (error) {
      notify.error(`Lỗi khi rời không gian làm việc: ${(error as Error).message}`);
    }
  };

  const handleInviteMember = async (identifier: string, role: StaffRole) => {
    try {
      const isEmail = identifier.includes('@');
      await createStaffMember({
        identifier,
        email: isEmail ? identifier : undefined,
        phoneNumber: isEmail ? undefined : identifier,
        role,
      }, workspace.id);
      notify.success(`Đã mời thành viên "${identifier}" vào Không gian làm việc!`);
      await fetchStaffList(workspace.id);
    } catch (error) {
      notify.error(`Lỗi mời thành viên: ${(error as Error).message}`);
      throw error;
    }
  };

  const handleCancelInvitation = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy lời mời gửi tới "${memberName}"?`)) return;
    try {
      if (cancelInvitation) await cancelInvitation(memberId, workspace.id);
      else await deleteStaffMember(memberId, workspace.id);
      notify.success(`Đã hủy lời mời gửi tới "${memberName}".`);
      await fetchStaffList(workspace.id);
    } catch (error) {
      notify.error(`Lỗi khi hủy lời mời: ${(error as Error).message}`);
    }
  };

  const handleSaveWorkspaceInfo = (workspaceId: string, data: { name: string; domain: string }) =>
    updateWorkspaceInfo(workspaceId, data);
  const handleDeleteWorkspace = async (workspaceId: string) => {
    await deleteWorkspace(workspaceId);
    onBack();
  };

  return {
    staffId, staffEmail, myWorkspaces, channels, isLoadingChannels, syncingChannelId,
    togglingChannelId, contactsCount, isLoadingContacts, effectiveStaffList, activeStaffList,
    resolvedAdminName, canOwnerLeave, loadChannels, handleSyncChannel, handleToggleChannel,
    handleDisconnectChannel, handleConnectSuccess, handleRemoveMember, handleLeaveWorkspace,
    handleInviteMember, handleCancelInvitation, handleSaveWorkspaceInfo, handleDeleteWorkspace,
  };
}
