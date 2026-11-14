/**
 * Cấu hình mặc định cho module Deals và Khách hàng liên quan.
 * Hệ thống CRM tổng quát, không gắn chặt với nghiệp vụ tuyển sinh hay dữ liệu cứng.
 */
export const DEFAULT_DEAL_CONFIG = {
    /** Kênh tiếp nhận mặc định khi tự động tạo Khách hàng từ Deal */
    DEFAULT_CUSTOMER_CHANNEL: 'MANUAL_IMPORT' as const,

    /** Trạng thái Lead mặc định cho Khách hàng */
    DEFAULT_CUSTOMER_LEAD_STATUS: 'POTENTIAL' as const,

    /** Tên hiển thị mặc định của khách hàng nếu thông tin nhập vào chưa có họ tên */
    DEFAULT_CUSTOMER_NAME: 'Khách hàng',

    /** Tiêu đề mặc định cho cơ hội (Deal) */
    DEFAULT_DEAL_TITLE: 'Cơ hội mới',

    /** Giai đoạn phễu mặc định */
    DEFAULT_STAGE: 'STAGE_NEW',

    /** Mức độ ưu tiên mặc định */
    DEFAULT_PRIORITY: 'MEDIUM',

    /** Trạng thái cơ hội mặc định */
    DEFAULT_STATUS: 'OPEN',

    /** Danh tính người cập nhật mặc định khi không có thông tin caller */
    DEFAULT_UPDATED_BY: 'SYSTEM',
} as const;

/**
 * Thông điệp hệ thống chuẩn hóa cho Deals
 */
export const DEAL_SYSTEM_MESSAGES = {
    DEAL_NOT_FOUND: (id: string) => `Cơ hội với ID "${id}" không tồn tại.`,
    DEAL_ACCESS_DENIED: 'Bạn không có quyền xem thông tin cơ hội này của người khác (403 Forbidden).',
    CANNOT_REASSIGN_STAFF: 'Nhân viên không có quyền tự phân công cơ hội cho người khác (403 Forbidden).',
    CANNOT_DELETE_DEAL: 'Nhân viên không có quyền xóa cơ hội (403 Forbidden).',
    DEAL_DELETED_SUCCESS: 'Đã xóa cơ hội thành công.',
} as const;

