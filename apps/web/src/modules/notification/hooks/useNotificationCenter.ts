import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api-client/index.js';
import type { NotificationItem } from '../../../lib/api-client/index.js';
import { useRealtime } from '../../realtime/RealtimeContext.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { useUserRole } from '../../auth/index.js';
import type { ActiveNavTab } from '../../../app/Sidebar.js';
import { ROUTES, buildRoute } from '../../../config/routes.js';
import type { NotificationFilter } from '../types/notification.types.js';

const isWorkspaceUuid = (value?: string | null): value is string =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

export function useNotificationCenter(onNavigateTab?: (tab: ActiveNavTab) => void) {
  const navigate = useNavigate();
  const { onNotification } = useRealtime();
  const { activeWorkspaceId, acceptInvitation, declineInvitation, fetchMyWorkspaces } = useWorkspaceConfig();
  const { staffId, ownerId } = useUserRole();
  const currentUserId = staffId || ownerId || undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeWsId = activeWorkspaceId || apiClient.getActiveWorkspaceId() || '';
  // Keep the legacy non-UUID only for fetching user-scoped invitations before a workspace is active.
  const effectiveWsId = activeWsId || 'ws-default-001';

  // Tải danh sách thông báo từ API có kèm userId của tài khoản hiện tại
  const fetchNotifications = useCallback(async () => {
    if (!effectiveWsId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getNotifications(effectiveWsId, {
        limit: 30,
        userId: currentUserId,
      });
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unreadCount || res.items.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Lỗi khi tải thông báo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveWsId, currentUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Lắng nghe sự kiện realtime notification:new (bảo vệ quyền riêng tư)
  useEffect(() => {
    const unsub = onNotification((newItem) => {
      // Chỉ nhận thông báo nếu là thông báo chung (không có userId) hoặc gửi riêng cho chính mình
      if (newItem.userId && currentUserId && newItem.userId !== currentUserId) {
        return;
      }
      setNotifications((prev) => [newItem, ...prev.filter((n) => n.id !== newItem.id)]);
      setUnreadCount((c) => c + 1);
    });
    return unsub;
  }, [onNotification, currentUserId]);

  // Đóng popover khi nhấp ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const unreadItems = notifications.filter((item) => !item.isRead && isWorkspaceUuid(item.workspaceId));
      if (isWorkspaceUuid(activeWsId)) {
        await apiClient.markAllNotificationsRead(activeWsId);
        setNotifications((prev) => prev.map((item) =>
          item.workspaceId === activeWsId ? { ...item, isRead: true } : item,
        ));
        setUnreadCount((count) => Math.max(0, count - unreadItems.filter((item) => item.workspaceId === activeWsId).length));
      } else {
        await Promise.all(unreadItems.map((item) =>
          apiClient.markNotificationRead(item.workspaceId, item.id),
        ));
        const markedIds = new Set(unreadItems.map((item) => item.id));
        setNotifications((prev) => prev.map((item) =>
          markedIds.has(item.id) ? { ...item, isRead: true } : item,
        ));
        setUnreadCount((count) => Math.max(0, count - unreadItems.length));
      }
    } catch (err) {
      console.warn('Không thể đánh dấu đọc tất cả:', err);
    }
  };

  const handleDeleteNotification = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isWorkspaceUuid(item.workspaceId)) return;
    try {
      await apiClient.deleteNotification(item.workspaceId, item.id);
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      if (!item.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.warn('Không thể xóa thông báo:', err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead && isWorkspaceUuid(item.workspaceId)) {
      try {
        await apiClient.markNotificationRead(item.workspaceId, item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn('Lỗi đánh dấu đã đọc:', err);
      }
    }

    // 1. Điều hướng riêng biệt cho Lời mời Workspace sang trang /workspace/invited/:id (Scope riêng biệt)
    if (item.type === 'WORKSPACE_INVITATION' || item.actionUrl?.includes('/invited/')) {
      setIsOpen(false);
      const inviteId =
        item.metadata?.memberId ||
        item.metadata?.invitationId ||
        item.actionUrl?.match(/\/invited\/([^/?#]+)/)?.[1] ||
        item.metadata?.workspaceId;
      if (inviteId) {
        navigate(buildRoute.workspaceInvited(inviteId));
        return;
      }
    }

    if (item.actionUrl) {
      setIsOpen(false);
      if (item.actionUrl.includes('workspace') || item.actionUrl.includes('onboarding')) {
        const wsMatch = item.actionUrl.match(/\/workspaces?\/([a-zA-Z0-9_-]+)/);
        if (wsMatch && wsMatch[1] && wsMatch[1] !== 'accept' && wsMatch[1] !== 'decline') {
          navigate(buildRoute.workspace(wsMatch[1]));
        } else {
          navigate(ROUTES.WORKSPACE_DEFAULT);
        }
        onNavigateTab?.('onboarding');
      } else if (item.actionUrl.includes('inbox')) {
        navigate(ROUTES.INBOX);
        onNavigateTab?.('inbox');
      } else if (item.actionUrl.startsWith('/')) {
        navigate(item.actionUrl);
      }
    }
  };

  const handleAcceptInvite = async (wsId: string, item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (acceptInvitation) {
        await acceptInvitation(wsId);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (fetchMyWorkspaces) {
        await fetchMyWorkspaces();
      }
      setIsOpen(false);
      navigate(buildRoute.workspace(wsId));
      onNavigateTab?.('onboarding');
    } catch (err) {
      console.warn('Lỗi khi chấp nhận lời mời:', err);
    }
  };

  const handleDeclineInvite = async (wsId: string, item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (declineInvitation) {
        await declineInvitation(wsId);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      if (!item.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.warn('Lỗi khi từ chối lời mời:', err);
    }
  };

  const filteredNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return {
    isOpen,
    setIsOpen,
    containerRef,
    notifications,
    filteredNotifications,
    unreadCount,
    filter,
    setFilter,
    isLoading,
    fetchNotifications,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleItemClick,
    handleAcceptInvite,
    handleDeclineInvite,
  };
}
