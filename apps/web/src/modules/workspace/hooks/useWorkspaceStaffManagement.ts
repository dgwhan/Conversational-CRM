import { useState, useCallback, useEffect } from 'react';
import type { ManagedStaffItem } from '../workspaceConfig.types.js';
import { USER_ROLES } from '../../auth/userRole.types.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../lib/api-client/index.js';

export interface UseWorkspaceStaffManagementProps {
  effectiveOwnerId: string;
  staffId?: string;
  isAuthenticated?: boolean;
  isCurrentWorkspaceOwner: boolean;
  activeWorkspaceId: string;
  configWorkspaceId: string;
  onStaffChange?: () => Promise<any> | void;
}

export const useWorkspaceStaffManagement = ({
  effectiveOwnerId,
  staffId,
  isAuthenticated = false,
  isCurrentWorkspaceOwner,
  activeWorkspaceId,
  configWorkspaceId,
  onStaffChange,
}: UseWorkspaceStaffManagementProps) => {
  const [staffMembers, setStaffMembers] = useState<ManagedStaffItem[]>([]);

  const fetchStaffList = useCallback(
    async (targetWsId?: string): Promise<ManagedStaffItem[]> => {
      // TUYỆT ĐỐI KHÔNG quét hoặc gọi API nhân sự nếu chưa đăng nhập hoặc callerId rỗng
      if (!isAuthenticated || (!effectiveOwnerId && !staffId)) {
        return [];
      }
      const wsToFetch = targetWsId || activeWorkspaceId || configWorkspaceId || '';
      if (!wsToFetch) {
        return [];
      }
      try {
        const data = await apiClient.get<ManagedStaffItem[]>('/workspaces/current/staff', {
          skipToast: true,
          headers: {
            'x-owner-id': effectiveOwnerId,
            'x-staff-id': staffId || '',
            'x-workspace-id': wsToFetch,
          },
        });
        if (Array.isArray(data)) {
          setStaffMembers(data);
          return data;
        }
      } catch (err) {
        console.warn('Could not fetch staff from backend:', err);
      }
      return [];
    },
    [isAuthenticated, effectiveOwnerId, staffId, isCurrentWorkspaceOwner, activeWorkspaceId, configWorkspaceId]
  );

  useEffect(() => {
    if (isAuthenticated && (effectiveOwnerId || staffId)) {
      fetchStaffList();
    }
  }, [isAuthenticated, effectiveOwnerId, staffId, fetchStaffList]);

  const createStaffMember = async (
    data: { identifier?: string; email?: string; fullName?: string; phoneNumber?: string; password?: string; role?: typeof USER_ROLES.STAFF | typeof USER_ROLES.OWNER },
    targetWsId?: string
  ) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    try {
      const created = await apiClient.post<ManagedStaffItem>('/workspaces/current/staff', data, {
        headers: {
          'x-owner-id': effectiveOwnerId,
          'x-staff-id': staffId || '',
          'x-workspace-id': wsId,
        },
      });

      setStaffMembers((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      notify.success(`Đã thêm nhân viên "${created.fullName || created.email || created.phoneNumber}" vào Workspace!`);
    } catch (err) {
      notify.error((err as Error).message, 'Mời Nhân Viên Thất Bại');
      throw err;
    }
  };

  const deleteStaffMember = async (
    targetId: string,
    targetWsId?: string,
    targetNewOwnerId?: string,
  ) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    const query = targetNewOwnerId ? `?targetNewOwnerId=${encodeURIComponent(targetNewOwnerId)}` : '';
    try {
      await apiClient.delete(`/workspaces/current/staff/${targetId}${query}`, {
        headers: {
          'x-owner-id': effectiveOwnerId,
          'x-staff-id': staffId || '',
          'x-workspace-id': wsId,
        },
      });

      setStaffMembers((prev) => prev.filter((s) => s.id !== targetId));
      if (onStaffChange) {
        await onStaffChange();
      }
      notify.success('Thao tác thành công!');
    } catch (err) {
      notify.error((err as Error).message, 'Thao Tác Thất Bại');
      throw err;
    }
  };

  const transferOwnership = async (
    targetMemberId: string,
    leaveWorkspace = false,
    targetWsId?: string,
  ) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    try {
      const res = await apiClient.post<{ success: boolean; message: string; newOwnerId: string }>(
        `/workspaces/${wsId}/transfer-ownership`,
        { targetMemberId, leaveWorkspace },
        {
          headers: {
            'x-owner-id': effectiveOwnerId,
            'x-staff-id': staffId || '',
            'x-workspace-id': wsId,
          },
        },
      );
      notify.success(res.message || 'Chuyển quyền Chủ sở hữu thành công!');
      if (onStaffChange) {
        await onStaffChange();
      }
      return res;
    } catch (err) {
      notify.error((err as Error).message, 'Chuyển Quyền Chủ Sở Hữu Thất Bại');
      throw err;
    }
  };

  const toggleStaffLock = async (
    targetId: string,
    lock: boolean,
    targetWsId?: string,
  ) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    try {
      const res = await apiClient.patch<{ success: boolean; message: string; isActive: boolean }>(
        `/workspaces/current/staff/${targetId}/lock`,
        { lock },
        {
          headers: {
            'x-owner-id': effectiveOwnerId,
            'x-staff-id': staffId || '',
            'x-workspace-id': wsId,
          },
        },
      );
      setStaffMembers((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, isActive: res.isActive } : m)),
      );
      notify.success(res.message || (lock ? 'Đã khóa thành viên.' : 'Đã mở khóa thành viên.'));
      if (onStaffChange) {
        await onStaffChange();
      }
      return res;
    } catch (err) {
      notify.error((err as Error).message, 'Thao Tác Thất Bại');
      throw err;
    }
  };

  const setWorkspaceManagerPermission = async (targetId: string, enabled: boolean, targetWsId?: string) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    const result = await apiClient.patch<{ isWorkspaceManager: boolean }>(
      `/workspaces/current/staff/${targetId}/permissions`,
      { isWorkspaceManager: enabled },
      {
        headers: {
          'x-workspace-id': wsId,
          'x-owner-id': effectiveOwnerId,
          'x-staff-id': staffId || '',
        },
      },
    );
    setStaffMembers((prev) => prev.map((member) =>
      member.id === targetId ? { ...member, isWorkspaceManager: result.isWorkspaceManager } : member,
    ));
    notify.success(enabled ? 'Đã cấp quyền Quản lý workspace.' : 'Đã thu hồi quyền Quản lý workspace.');
  };

  const cancelInvitation = async (targetId: string, targetWsId?: string) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    try {
      await apiClient.delete(`/workspaces/current/staff/invitations/${targetId}`, {
        headers: {
          'x-owner-id': effectiveOwnerId,
          'x-staff-id': staffId || '',
          'x-workspace-id': wsId,
        },
      });

      setStaffMembers((prev) => prev.filter((s) => s.id !== targetId && s.memberId !== targetId));
      if (onStaffChange) {
        await onStaffChange();
      }
      notify.success('Đã hủy lời mời thành công!');
    } catch (err) {
      notify.error((err as Error).message, 'Hủy Lời Mời Thất Bại');
      throw err;
    }
  };

  const acceptInvitation = async (targetWsId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string; workspace: any }>(
        `/workspaces/${targetWsId}/members/accept`,
        {},
        {
          headers: {
            'x-staff-id': staffId || '',
            'x-owner-id': effectiveOwnerId,
          },
        }
      );
      notify.success(res.message || 'Đã chấp nhận lời mời tham gia Workspace!');
      if (onStaffChange) {
        await onStaffChange();
      }
      return res;
    } catch (err) {
      notify.error((err as Error).message, 'Chấp Nhận Lời Mời Thất Bại');
      throw err;
    }
  };

  const declineInvitation = async (targetWsId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>(
        `/workspaces/${targetWsId}/members/decline`,
        {},
        {
          headers: {
            'x-staff-id': staffId || '',
            'x-owner-id': effectiveOwnerId,
          },
        }
      );
      notify.success(res.message || 'Đã từ chối lời mời!');
      if (onStaffChange) {
        await onStaffChange();
      }
      return res;
    } catch (err) {
      notify.error((err as Error).message, 'Từ Chối Lời Mời Thất Bại');
      throw err;
    }
  };

  return {
    staffMembers,
    setStaffMembers,
    fetchStaffList,
    createStaffMember,
    deleteStaffMember,
    transferOwnership,
    toggleStaffLock,
    setWorkspaceManagerPermission,
    cancelInvitation,
    acceptInvitation,
    declineInvitation,
  };
};
