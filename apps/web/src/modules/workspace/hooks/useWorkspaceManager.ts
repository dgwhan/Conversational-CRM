import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { WorkspaceItem, WorkspaceConfig, BusinessDomain } from '../workspaceConfig.types.js';
import { CLIENT_INDUSTRY_PRESETS } from '../workspacePresets.js';
import { USER_ROLES, type UserRole } from '../../auth/userRole.types.js';
import { apiClient } from '../../../lib/api-client/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { STORAGE_KEYS } from '../../../config/storage-keys.js';
import { getWorkspaceConfigStorageKey } from '../workspace-config-storage.js';

export const ACTIVE_WORKSPACE_KEY = STORAGE_KEYS.ACTIVE_WORKSPACE;

export interface UseWorkspaceManagerProps {
  staffId?: string;
  staffName?: string;
  effectiveOwnerId: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  syncFromBackend: (targetWsId?: string) => Promise<void>;
  fetchStaffList: (targetWsId?: string) => Promise<any>;
  setConfig: React.Dispatch<React.SetStateAction<WorkspaceConfig>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onWorkspaceRoleChange?: (role: UserRole, ownerId?: string) => void;
}

export const useWorkspaceManager = ({
  staffId,
  staffName,
  effectiveOwnerId,
  isAuthenticated,
  isOwner,
  syncFromBackend,
  fetchStaffList,
  setConfig,
  setIsLoading,
  onWorkspaceRoleChange,
}: UseWorkspaceManagerProps) => {
  const [myWorkspaces, setMyWorkspaces] = useState<WorkspaceItem[]>([]);
  const [workspaceLoadIdentity, setWorkspaceLoadIdentity] = useState('');
  const [isWorkspaceListFetching, setIsWorkspaceListFetching] = useState(false);
  const workspaceFetchSequence = useRef(0);
  const workspaceIdentity = isAuthenticated ? (staffId || effectiveOwnerId || 'authenticated') : '';
  const isWorkspaceListLoading = Boolean(
    workspaceIdentity && (workspaceLoadIdentity !== workspaceIdentity || isWorkspaceListFetching),
  );

  // Lấy workspace ID đang active từ localStorage hoặc khởi tạo
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || '';
    }
    return '';
  });

  // Tìm workspace hiện tại trong danh sách
  const activeWorkspace = myWorkspaces.find((w) => w.id === activeWorkspaceId) || null;
  // Quyền OWNER trong workspace hiện tại
  const isCurrentWorkspaceOwner = Boolean(isAuthenticated && (activeWorkspace ? activeWorkspace.isOwner : isOwner));

  const fetchStaffListRef = useRef(fetchStaffList);
  const syncFromBackendRef = useRef(syncFromBackend);
  useEffect(() => {
    fetchStaffListRef.current = fetchStaffList;
    syncFromBackendRef.current = syncFromBackend;
  });

  // Lấy danh sách Workspaces của user từ Backend
  const fetchMyWorkspaces = useCallback(async (): Promise<WorkspaceItem[]> => {
    const requestSequence = ++workspaceFetchSequence.current;
    if (!isAuthenticated) {
      setMyWorkspaces([]);
      setActiveWorkspaceId('');
      apiClient.setActiveWorkspaceId('');
      setWorkspaceLoadIdentity('');
      setIsWorkspaceListFetching(false);
      return [];
    }
    setIsWorkspaceListFetching(true);
    try {
      const list = await apiClient.getMyWorkspaces(staffId, effectiveOwnerId);
      if (requestSequence !== workspaceFetchSequence.current) return [];
      if (Array.isArray(list) && list.length > 0) {
        // Chuẩn hóa ownerName: Ưu tiên fullName thực tế, loại bỏ hoàn toàn 'Chính bạn'
        const normalized = list.map((ws) => ({
          ...ws,
          ownerName:
            ws.ownerName && ws.ownerName !== 'Chính bạn' && ws.ownerName !== 'Chủ sở hữu'
              ? ws.ownerName
              : (ws.isOwner && staffName ? staffName : (ws.ownerName && ws.ownerName !== 'Chính bạn' ? ws.ownerName : staffName || 'Chủ sở hữu')),
        }));
        setMyWorkspaces(normalized);

        // Nếu chưa chọn active workspace hoặc workspace hiện tại không nằm trong danh sách, chọn cái đầu tiên
        const currentActive = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
        const match = normalized.find((w) => w.id === currentActive);
        const selectedWs = match || normalized[0];
        const selectedId = selectedWs.id;

        setActiveWorkspaceId(selectedId);
        apiClient.setActiveWorkspaceId(selectedId);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, selectedId);

        // Luôn đồng bộ tên và ID theo workspace đang được chọn
        if (selectedWs) {
          setConfig((prev) => {
            if (prev.workspaceId === selectedWs.id && prev.workspaceName === selectedWs.name) {
              return prev;
            }
            return {
              ...prev,
              workspaceId: selectedWs.id,
              workspaceName: selectedWs.name,
              ...(selectedWs.domain ? { domain: selectedWs.domain as BusinessDomain } : {}),
            };
          });
          await syncFromBackend(selectedId);
        }

        return normalized;
      } else {
        // Tài khoản hiện tại chưa sở hữu hoặc không thuộc Workspace nào -> Dọn sạch workspace active cũ
        setMyWorkspaces([]);
        setActiveWorkspaceId('');
        apiClient.setActiveWorkspaceId('');
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        return [];
      }
    } catch (err) {
      if (requestSequence !== workspaceFetchSequence.current) return [];
      console.warn('Could not fetch workspaces:', err);
      setMyWorkspaces([]);
      setActiveWorkspaceId('');
      apiClient.setActiveWorkspaceId('');
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    } finally {
      if (requestSequence === workspaceFetchSequence.current) {
        setWorkspaceLoadIdentity(workspaceIdentity);
        setIsWorkspaceListFetching(false);
      }
    }
    return [];
  }, [isAuthenticated, staffId, effectiveOwnerId, staffName, syncFromBackend, workspaceIdentity]);

  useEffect(() => {
    fetchMyWorkspaces();
  }, [fetchMyWorkspaces]);

  // Đồng bộ role từ Workspace hiện tại vào UserRoleContext
  useEffect(() => {
    if (activeWorkspace) {
      onWorkspaceRoleChange?.(activeWorkspace.role as UserRole, activeWorkspace.ownerId);
    }
  }, [activeWorkspace?.id, activeWorkspace?.role, activeWorkspace?.ownerId, onWorkspaceRoleChange]);

  // Chuyển đổi nhanh giữa các Workspace (Workspace Switcher)
  const switchWorkspace = useCallback(async (targetWsId: string) => {
    if (targetWsId === activeWorkspaceId) return;

    const targetWs = myWorkspaces.find((w) => w.id === targetWsId);
    setActiveWorkspaceId(targetWsId);
    apiClient.setActiveWorkspaceId(targetWsId);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, targetWsId);

    // Đồng bộ cấu hình và tên workspace ngay lập tức
    if (targetWs) {
      const cacheKey = staffId ? getWorkspaceConfigStorageKey(staffId, targetWs.id) : '';
      const cachedConfigStr = cacheKey ? localStorage.getItem(cacheKey) : null;
      if (cachedConfigStr) {
        try {
          const parsed = JSON.parse(cachedConfigStr);
          if (parsed && parsed.pipelineStages && parsed.pipelineStages.length >= 2) {
            setConfig({
              ...parsed,
              workspaceId: targetWs.id,
              workspaceName: targetWs.name,
              ...(targetWs.domain ? { domain: targetWs.domain as BusinessDomain } : {}),
            });
          }
        } catch {
          // Fallback to updating basic info
          setConfig((prev) => ({
            ...prev,
            workspaceId: targetWs.id,
            workspaceName: targetWs.name,
            ...(targetWs.domain ? { domain: targetWs.domain as BusinessDomain } : {}),
          }));
        }
      } else {
        const domainKey = (targetWs.domain in CLIENT_INDUSTRY_PRESETS ? targetWs.domain : 'CUSTOM') as BusinessDomain;
        const preset = CLIENT_INDUSTRY_PRESETS[domainKey] || CLIENT_INDUSTRY_PRESETS.CUSTOM;
        setConfig((prev) => ({
          ...prev,
          workspaceId: targetWs.id,
          workspaceName: targetWs.name,
          domain: domainKey,
          terminology: { ...preset.terminology },
          pipelineStages: preset.pipelineStages.map((s) => ({ ...s })),
          productCatalog: preset.productCatalog.map((p) => ({ ...p })),
          criteria: preset.criteria.map((c) => ({ ...c })),
        }));
      }
    }

    setIsLoading(true);
    try {
      await Promise.all([
        syncFromBackendRef.current(targetWsId),
        fetchStaffListRef.current(targetWsId),
      ]);
      notify.success(
        `Đã chuyển sang không gian làm việc "${targetWs?.name || 'Workspace'}" (${targetWs?.isOwner ? 'Chủ sở hữu' : 'Thành viên'})!`,
        'Đổi Workspace'
      );
    } catch (err) {
      console.error('Switch workspace failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId, myWorkspaces, staffId, setConfig, setIsLoading]);

  /**
   * Tạo một Không gian làm việc (Workspace) mới và chuyển sang workspace đó
   */
  const createWorkspace = async (data: {
    name: string;
    domain?: BusinessDomain | string;
  }): Promise<WorkspaceItem | null> => {
    setIsLoading(true);
    try {
      const res = await apiClient.createWorkspace(
        {
          name: data.name,
          domain: data.domain,
        },
        staffId,
        effectiveOwnerId,
      );

      if (res && res.id) {
        const updatedList = await fetchMyWorkspaces();
        setActiveWorkspaceId(res.id);
        apiClient.setActiveWorkspaceId(res.id);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, res.id);
        await Promise.all([
          syncFromBackend(res.id),
          fetchStaffList(res.id),
        ]);
        notify.success(`Đã tạo Không gian làm việc "${res.name}" thành công!`, 'Tạo Workspace');
        return (
          updatedList.find((w) => w.id === res.id) || {
            id: res.id,
            name: res.name,
            slug: res.slug,
            role: USER_ROLES.OWNER,
            isOwner: true,
            domain: res.domain || 'EDUCATION',
            ownerId: res.ownerId || effectiveOwnerId,
            ownerName: res.ownerName || staffName || 'Chủ sở hữu',
            createdAt: res.createdAt,
          }
        );
      }
    } catch (err) {
      notify.error(`Không thể tạo Không gian làm việc: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  /**
   * Cập nhật thông tin Không gian làm việc (Tên, Lĩnh vực)
   */
  const updateWorkspaceInfo = async (
    targetWsId: string,
    data: { name?: string; domain?: string },
  ): Promise<WorkspaceItem> => {
    setIsLoading(true);
    try {
      const updated = await apiClient.updateWorkspace(
        targetWsId,
        data,
        staffId,
        effectiveOwnerId,
      );

      setMyWorkspaces((prev) =>
        prev.map((w) => (w.id === targetWsId ? { ...w, ...updated } : w)),
      );

      if (activeWorkspaceId === targetWsId && updated.name) {
        setConfig((prev) => ({
          ...prev,
          workspaceName: updated.name,
          ...(data.domain ? { domain: data.domain as BusinessDomain } : {}),
        }));
      }

      notify.success(`Đã cập nhật thông tin không gian làm việc "${updated.name}"!`, 'Cập Nhật Workspace');
      return updated;
    } catch (err) {
      notify.error(`Không thể cập nhật Không gian làm việc: ${(err as Error).message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Xóa Không gian làm việc
   */
  const deleteWorkspace = async (targetWsId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await apiClient.deleteWorkspace(targetWsId, staffId, effectiveOwnerId);
      notify.success('Đã xóa Không gian làm việc thành công!', 'Xóa Workspace');

      const updatedList = await fetchMyWorkspaces();
      if (activeWorkspaceId === targetWsId && updatedList.length > 0) {
        await switchWorkspace(updatedList[0].id);
      }
    } catch (err) {
      notify.error(`Không thể xóa Không gian làm việc: ${(err as Error).message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    myWorkspaces,
    setMyWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspace,
    isCurrentWorkspaceOwner,
    isWorkspaceListLoading,
    fetchMyWorkspaces,
    switchWorkspace,
    createWorkspace,
    updateWorkspaceInfo,
    deleteWorkspace,
  };
};
