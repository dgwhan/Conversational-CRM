import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AssignedStaff } from '../../../types.js';
import { Modal } from '../../../../../components/ui/Modal.js';
import { SearchableSelect } from '../../../../../components/ui/SearchableSelect.js';

export interface AssignedAgentSectionProps {
  assignedStaff?: AssignedStaff | null;
  staffList?: AssignedStaff[];
  onAssignStaff?: (staffId: string) => void;
  isOwner?: boolean;
}

export const AssignedAgentSection: React.FC<AssignedAgentSectionProps> = ({
  assignedStaff,
  staffList = [],
  onAssignStaff,
  isOwner = true,
}) => {
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  // Đảm bảo nhân sự đang được phân công luôn xuất hiện trong danh sách lựa chọn
  const mergedStaffList = useMemo(() => {
    const list = [...staffList];
    if (assignedStaff?.id && !list.some((s) => s.id === assignedStaff.id)) {
      list.unshift(assignedStaff);
    }
    return list;
  }, [staffList, assignedStaff]);

  return (
    <div className="p-4 bg-white space-y-2">
      {/* 1. Tiêu đề mục & Dấu chấm than giải thích */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 shrink-0">
          <label
            htmlFor="assigned-staff-select"
            className="m-0 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer"
          >
            Nhân Sự Phụ Trách
          </label>
          <button
            type="button"
            onClick={() => setIsExplainModalOpen(true)}
            className="inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded"
            title="Xem giải thích phân công nhân sự"
            aria-label="Giải thích phân công nhân sự"
          >
            <AlertCircle size={13} />
          </button>
        </div>
      </div>

      {/* 2. Dropdown lựa chọn nhân sự */}
      <div>
        <SearchableSelect
          id="assigned-staff-select"
          value={assignedStaff?.id || ''}
          onChange={(val) => {
            if (!isOwner) return;
            onAssignStaff?.(val);
          }}
          disabled={!isOwner}
          placeholder="-- Chưa phân công nhân sự --"
          allOptionLabel="-- Chưa phân công nhân sự --"
          options={mergedStaffList.map((st) => ({
            value: st.id,
            label: `${st.name}${st.role ? ` (${st.role})` : ''}`,
          }))}
          size="sm"
          fullWidth
          searchPlaceholder="Tìm nhân sự..."
        />
      </div>
      {!isOwner && (
        <p className="text-[11px] text-slate-400 italic m-0">
          Chỉ Quản lý (Owner) mới có quyền phân công nhân sự.
        </p>
      )}

      {/* Modal Giải thích Phân Công Nhân Sự */}
      <Modal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        title="Phân Công Nhân Sự Phụ Trách"
        size="md"
        showCloseButton={true}
        primaryAction={{
          label: 'Đã hiểu',
          onClick: () => setIsExplainModalOpen(false),
          variant: 'primary',
        }}
      >
        <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              1. Trách nhiệm nhân sự phụ trách
            </h5>
            <p className="m-0 text-slate-600">
              Nhân viên được phân công chịu trách nhiệm trực tiếp nhận thông báo, phản hồi tin nhắn và theo dõi tiến độ tư vấn cho khách hàng này.
            </p>
          </div>

          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              2. Quyền điều phối (Chủ doanh nghiệp)
            </h5>
            <p className="m-0 text-slate-600">
              Chỉ Quản lý (Owner) hoặc cấp điều phối mới có quyền đổi hoặc thu hồi nhân sự phụ trách. Tư vấn viên thông thường chỉ xem được người đang đảm nhiệm.
            </p>
          </div>

          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              3. Bộ lọc hộp thư theo nhân sự
            </h5>
            <p className="m-0 text-slate-600">
              Hệ thống dùng thông tin này để phân loại các tab "Của tôi", "Chưa phân công" và "Đang xử lý" trên danh sách hội thoại.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
