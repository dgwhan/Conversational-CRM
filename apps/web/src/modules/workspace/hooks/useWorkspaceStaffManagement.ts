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
            'x-user-role': isCurrentWorkspaceOwner ? USER_ROLES.OWNER : USER_ROLES.STAFF,
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
    if (isAuthenticated && isCurrentWorkspaceOwner && (effectiveOwnerId || staffId)) {
      fetchStaffList();
    }
  }, [isAuthenticated, isCurrentWorkspaceOwner, effectiveOwnerId, staffId, fetchStaffList]);

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
          'x-user-role': USER_ROLES.OWNER,
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

  const deleteStaffMember = async (targetId: string, targetWsId?: string) => {
    const wsId = targetWsId || activeWorkspaceId || configWorkspaceId || '';
    try {
      await apiClient.delete(`/workspaces/current/staff/${targetId}`, {
        headers: {
          'x-owner-id': effectiveOwnerId,
          'x-staff-id': staffId || '',
          'x-user-role': isCurrentWorkspaceOwner ? USER_ROLES.OWNER : USER_ROLES.STAFF,
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

  return {
    staffMembers,
    setStaffMembers,
    fetchStaffList,
    createStaffMember,
    deleteStaffMember,
  };
};
