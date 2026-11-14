import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, UserCheck, Search, Check, Phone, Mail, User } from 'lucide-react';
import { Modal, Button } from '../../../../../../../components/ui/index.js';
import type { ManagedStaffItem } from '../../../../../WorkspaceConfigContext.js';
import { notify } from '../../../../../../../components/feedback/toastEmitter.js';
import { matchesUnaccent } from '../../../../../../../lib/unaccent.js';

export interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  activeCandidates: ManagedStaffItem[];
  preselectedMemberId?: string;
  isLeaving?: boolean;
  onConfirm: (targetMemberId: string, leaveWorkspace: boolean) => Promise<void>;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? '')
    .join('')
    .toLocaleUpperCase('vi');

export const TransferOwnershipModal: React.FC<TransferOwnershipModalProps> = ({
  isOpen,
  onClose,
  workspaceName,
  activeCandidates,
  preselectedMemberId,
  isLeaving = false,
  onConfirm,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [leaveAfterTransfer, setLeaveAfterTransfer] = useState<boolean>(isLeaving);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedMemberId) {
      setSelectedMemberId(preselectedMemberId);
    } else if (activeCandidates.length > 0) {
      setSelectedMemberId(activeCandidates[0].id);
    }
    setLeaveAfterTransfer(isLeaving);
    setSearchQuery('');
  }, [preselectedMemberId, activeCandidates, isLeaving, isOpen]);

  // Lọc danh sách ứng viên theo Tên (hỗ trợ tiếng Việt không dấu), Email hoặc Số điện thoại
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return activeCandidates;
    const lowerQ = q.toLowerCase();
    const digitsQ = q.replace(/\D/g, '');

    return activeCandidates.filter((c) => {
      // 1. So khớp tên (hỗ trợ tiếng Việt có dấu và không dấu qua matchesUnaccent)
      const matchName = Boolean(
        c.fullName && (
          matchesUnaccent(c.fullName, q) ||
          c.fullName.toLowerCase().includes(lowerQ)
        ),
      );

      // 2. So khớp email
      const matchEmail = Boolean(
        c.email && (
          c.email.toLowerCase().includes(lowerQ) ||
          matchesUnaccent(c.email, q)
        ),
      );

      // 3. So khớp số điện thoại
      const rawCandidatePhone = c.phoneNumber ? String(c.phoneNumber).replace(/\D/g, '') : '';
      const matchPhone = Boolean(
        c.phoneNumber && (
          c.phoneNumber.toLowerCase().includes(lowerQ) ||
          (digitsQ.length >= 3 && rawCandidatePhone.includes(digitsQ))
        ),
      );

      return matchName || matchEmail || matchPhone;
    });
  }, [activeCandidates, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      notify.warning('Vui lòng chọn một thành viên nhận chuyển quyền.');
      return;
    }

    const selectedCandidate = activeCandidates.find((c) => c.id === selectedMemberId);
    const candidateName = selectedCandidate?.fullName || selectedCandidate?.email || selectedMemberId;

    const confirmMsg = leaveAfterTransfer
      ? `Bạn có chắc chắn muốn chuyển giao quyền Chủ sở hữu cho "${candidateName}" và rời khỏi Không gian làm việc "${workspaceName}"?`
      : `Bạn có chắc chắn muốn chuyển giao quyền Chủ sở hữu cho "${candidateName}"? Bạn sẽ ở lại với vai trò Quản lý workspace.`;

    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedMemberId, leaveAfterTransfer);
      onClose();
    } catch {
      // Error is handled in hook/service
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="flat"
      size="md"
      showCloseButton
      title={isLeaving ? 'Chuyển quyền Chủ sở hữu để rời Workspace' : 'Chuyển quyền Chủ sở hữu Workspace'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Cơ cấu 1 Chủ sở hữu duy nhất:</strong> Mỗi Không gian làm việc chỉ có duy nhất 1 Chủ sở hữu.
            {leaveAfterTransfer ? (
              <span> Trước khi rời đi, bạn bắt buộc phải chuyển quyền Chủ sở hữu cho một thành viên đang hoạt động khác.</span>
            ) : (
              <span> Sau khi chuyển giao, thành viên được chọn sẽ là Chủ sở hữu mới và bạn sẽ trở thành Quản lý workspace.</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Chọn thành viên nhận quyền Chủ sở hữu <span className="text-red-500">*</span>
          </label>

          {/* Ô nhập tìm kiếm bao gồm Tên, Email, Số điện thoại */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên, email hoặc số điện thoại để tìm..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs transition-all"
            />
          </div>

          {activeCandidates.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded border border-slate-200 text-center">
              Không có thành viên đang hoạt động nào khác trong Workspace.
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded border border-slate-200 text-center">
              Không tìm thấy thành viên nào khớp với từ khóa "{searchQuery}".
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
              {filteredCandidates.map((candidate) => {
                const isSelected = candidate.id === selectedMemberId;
                const displayName = candidate.fullName || candidate.email.split('@')[0];
                return (
                  <div
                    key={candidate.id}
                    onClick={() => setSelectedMemberId(candidate.id)}
                    className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer border transition-all text-xs ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                        {getInitials(displayName) || <User size={13} />}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {displayName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              candidate.isWorkspaceManager
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {candidate.isWorkspaceManager ? 'Quản lý' : 'Nhân viên tư vấn'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 truncate" title={candidate.email}>
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            {candidate.email}
                          </span>
                          {candidate.phoneNumber && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              {candidate.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white ml-2">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isLeaving && (
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={leaveAfterTransfer}
              onChange={(e) => setLeaveAfterTransfer(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Đồng thời rời khỏi Không gian làm việc sau khi chuyển quyền</span>
          </label>
        )}

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
            disabled={isSubmitting || !selectedMemberId}
            icon={<UserCheck size={14} />}
          >
            {isSubmitting
              ? 'Đang xử lý...'
              : leaveAfterTransfer
              ? 'Chuyển quyền & Rời đi'
              : 'Xác nhận chuyển quyền'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
