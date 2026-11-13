import { useEffect, useState } from 'react';
import type { QuickReplyItem } from '../types.js';
import { MOCK_QUICK_REPLIES } from '../mockData.js';
import { apiClient } from '../../../lib/api-client/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';

/**
 * Mẫu trả lời nhanh dùng chung cho cả nhóm, lưu theo workspace trên server
 * (trước đây chỉ nằm trong localStorage của từng trình duyệt nên không chia sẻ được).
 */
export const useQuickReplies = () => {
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>(MOCK_QUICK_REPLIES);
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .getQuickReplies()
      .then(({ items }) => {
        if (active && items) setQuickReplies(items);
      })
      .catch(() => {
        // Giữ mẫu mặc định nếu chưa tải được; lần lưu tiếp theo sẽ báo lỗi nếu server vẫn không phản hồi
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveQuickReplies = (replies: QuickReplyItem[]) => {
    const previous = quickReplies;
    setQuickReplies(replies);
    apiClient.saveQuickReplies(replies).catch((err: unknown) => {
      setQuickReplies(previous);
      notify.error(err instanceof Error ? err.message : 'Không thể lưu mẫu trả lời nhanh.');
    });
  };

  return {
    quickReplies,
    isQuickReplyModalOpen,
    setIsQuickReplyModalOpen,
    handleSaveQuickReplies,
  };
};
