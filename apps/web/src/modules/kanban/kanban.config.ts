import type { KanbanCandidate, KanbanColumnConfig } from './kanban.types.js';

export type { KanbanCandidate, KanbanColumnConfig };

export const getKanbanStagesConfig = (
  t: (key: string, fb?: string) => string
): KanbanColumnConfig[] => [
  {
    id: 'NEW',
    title: t('kanban.stages.newTitle', '1. Khách mới tiếp cận'),
    subtitle: t('kanban.stages.newSub', 'Chưa phân loại / Mới nhắn tin'),
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  {
    id: 'QUALIFIED',
    title: t('kanban.stages.qualifiedTitle', '2. Đã xác nhận nhu cầu'),
    subtitle: t('kanban.stages.qualifiedSub', 'Có nhu cầu học thật / Đã lấy SĐT'),
    color: '#0d9488',
    bgColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  {
    id: 'CONSULTING',
    title: t('kanban.stages.consultingTitle', '3. Đang tư vấn chuyên sâu'),
    subtitle: t('kanban.stages.consultingSub', 'Đã gửi lộ trình & giải đáp học phí'),
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  {
    id: 'TRIAL_APPOINTMENT',
    title: t('kanban.stages.trialTitle', '4. Hẹn học thử / Đến trực tiếp'),
    subtitle: t('kanban.stages.trialSub', 'Đã đặt lịch hẹn tư vấn trực tiếp'),
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  {
    id: 'DEPOSIT_PAID',
    title: t('kanban.stages.depositTitle', '5. Đã đóng cọc / Giữ chỗ'),
    subtitle: t('kanban.stages.depositSub', 'Đã chuyển khoản giữ suất học bổng'),
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    id: 'ENROLLED',
    title: t('kanban.stages.enrolledTitle', '6. Nhập học thành công'),
    subtitle: t('kanban.stages.enrolledSub', 'Hoàn tất 100% học phí & nhận lớp'),
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  {
    id: 'LOST',
    title: t('kanban.stages.lostTitle', '7. Hủy / Thất bại'),
    subtitle: t('kanban.stages.lostSub', 'Không phù hợp / Không liên lạc được'),
    color: '#64748b',
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
];

export const KANBAN_STAGES_CONFIG: KanbanColumnConfig[] = getKanbanStagesConfig((_k, fb) => fb || '');

/**
 * Danh sách ứng viên Kanban khởi tạo rỗng.
 * Toàn bộ ứng viên sẽ được đồng bộ và cập nhật tự động từ các nguồn kênh trực tiếp.
 */
export const INITIAL_KANBAN_CANDIDATES: KanbanCandidate[] = [];
