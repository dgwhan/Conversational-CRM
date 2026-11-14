import React, { useState } from 'react';
import { Modal, Button } from '../../../../../../../components/ui/index.js';
import { notify } from '../../../../../../../components/feedback/toastEmitter.js';
import { StaffRole } from '../../../../../../../features/auth/constants/auth.constants.js';

export interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteMember: (identifier: string, role: StaffRole) => Promise<void>;
  allowOwnerRole?: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInviteMember,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      notify.warning('Vui lòng nhập Email hoặc Số điện thoại thành viên.');
      return;
    }
    setIsInviting(true);
    try {
      // Mặc định luôn mời thành viên mới với vai trò STAFF; Chủ sở hữu có thể đặt làm Quản lý tại cột Thao tác
      await onInviteMember(cleanId, StaffRole.STAFF);
      setIdentifier('');
      onClose();
    } catch {
      // Error handled in parent/context
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="flat"
      size="sm"
      showCloseButton
      title="Mời thành viên mới vào Không gian làm việc"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email hoặc Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Nhập email (vd: name@example.com) hoặc SĐT (vd: 0912345678)"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs box-border transition-all"
          />
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
          <div className="font-semibold text-blue-800">
            Vai trò mặc định: Nhân viên tư vấn (STAFF)
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-blue-700">
            Thành viên mới sẽ tham gia với vai trò Nhân viên tư vấn. Sau khi tham gia, Chủ sở hữu có thể đặt làm Quản lý tại <strong>Cột Thao tác</strong>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isInviting}
          >
            {isInviting ? 'Đang gửi...' : 'Mời thành viên'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
