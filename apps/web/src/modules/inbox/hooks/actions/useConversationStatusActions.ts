import React from 'react';
import type {
  ConversationItem,
  AssignedStaff,
} from '../../types.js';
import { apiClient } from '../../../../lib/api-client/index.js';
import { notify } from '../../../../components/feedback/toastEmitter.js';

interface UseConversationStatusActionsProps {
  currentConv?: ConversationItem;
  setConversations: React.Dispatch<React.SetStateAction<ConversationItem[]>>;
  staffName?: string | null;
  staffList: AssignedStaff[];
  activeWorkspaceId?: string | null;
}

export const useConversationStatusActions = ({
  currentConv,
  setConversations,
  staffName,
  staffList,
  activeWorkspaceId,
}: UseConversationStatusActionsProps) => {
  // 1. Phân công nhân sự
  const handleAssignStaff = (staffId: string) => {
    if (!currentConv) return;
    const staff = staffId
      ? staffList.find((s) => s.id === staffId) ||
        (currentConv.assignedStaff?.id === staffId
          ? currentConv.assignedStaff
          : { id: staffId, name: staffName || 'Tư vấn viên', role: 'Tư vấn viên', avatar: '' })
      : undefined;

    setConversations((prev) =>
      prev.map((c) => (c.id === currentConv.id ? { ...c, assignedStaff: staff } : c))
    );

    if (currentConv.id) {
      apiClient
        .assignConversation(
          currentConv.id,
          {
            staffId: staff?.id || null,
            staffName: staff?.name || null,
          },
          activeWorkspaceId || undefined
        )
        .then((result) => {
          if (result && typeof result === 'object' && 'overCapacity' in result && result.overCapacity) {
            notify.info(`${staff?.name || 'Nhân viên'} đang vượt hạn mức hội thoại mở. Đây là cảnh báo thông tin; Owner vẫn có thể tiếp tục phân công.`);
            return;
          }
          notify.success(
            staff
              ? `Đã phân công ${staff.name} phụ trách cuộc hội thoại này.`
              : 'Đã hủy phân công nhân sự.'
          );
        })
        .catch((error: unknown) => {
          setConversations((prev) => prev.map((conversation) => conversation.id === currentConv.id ? { ...conversation, assignedStaff: currentConv.assignedStaff } : conversation));
          notify.error(error instanceof Error ? error.message : 'Không thể phân công hội thoại.');
        });
    }
  };

  // 2. Đổi trạng thái hội thoại (OPEN / RESOLVED)
  const handleToggleStatus = () => {
    if (!currentConv) return;
    const nextStatus = currentConv.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    setConversations((prev) =>
      prev.map((c) => (c.id === currentConv.id ? { ...c, status: nextStatus } : c))
    );
    notify.info(
      nextStatus === 'RESOLVED'
        ? 'Đã đánh dấu hoàn tất cuộc trò chuyện.'
        : 'Đã mở lại cuộc trò chuyện.'
    );
  };

  return {
    handleAssignStaff,
    handleToggleStatus,
  };
};
