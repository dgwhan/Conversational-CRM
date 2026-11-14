import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert, UserCheck, Check, ChevronDown } from 'lucide-react';
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
  const [inputValue, setInputValue] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const [leaveAfterTransfer, setLeaveAfterTransfer] = useState<boolean>(isLeaving);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const getDisplayLabel = (c: ManagedStaffItem) => {
    const roleLabel = c.isWorkspaceManager ? 'Quản lý' : 'Nhân viên tư vấn';
    const name = c.fullName || c.email.split('@')[0];
    return `${name} (${c.email}) - ${roleLabel}`;
  };

  const selectedCandidate = useMemo(() => {
    return activeCandidates.find((c) => c.id === selectedMemberId);
  }, [activeCandidates, selectedMemberId]);

  useEffect(() => {
    if (preselectedMemberId) {
      setSelectedMemberId(preselectedMemberId);
    } else if (activeCandidates.length > 0) {
      setSelectedMemberId(activeCandidates[0].id);
    }
    setLeaveAfterTransfer(isLeaving);
    setSearchQuery('');
    setIsOpenDropdown(false);
  }, [preselectedMemberId, activeCandidates, isLeaving, isOpen]);

  useEffect(() => {
    if (selectedCandidate) {
      setInputValue(getDisplayLabel(selectedCandidate));
    } else {
      setInputValue('');
    }
  }, [selectedCandidate]);

  // Đóng dropdown khi click bên ngoài box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
        if (selectedCandidate) {
          setInputValue(getDisplayLabel(selectedCandidate));
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCandidate]);

  // Lọc danh sách ứng viên theo Tên (hỗ trợ tiếng Việt không dấu), Email hoặc Số điện thoại
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim();
    if (!q || (selectedCandidate && q === getDisplayLabel(selectedCandidate))) {
      return activeCandidates;
    }
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
  }, [activeCandidates, searchQuery, selectedCandidate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSearchQuery(val);
    setIsOpenDropdown(true);
  };

  const handleSelectOption = (c: ManagedStaffItem) => {
    setSelectedMemberId(c.id);
    setInputValue(getDisplayLabel(c));
    setSearchQuery('');
    setIsOpenDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      notify.warning('Vui lòng chọn một thành viên nhận chuyển quyền.');
      return;
    }

    const candidate = activeCandidates.find((c) => c.id === selectedMemberId);
    const candidateName = candidate?.fullName || candidate?.email || selectedMemberId;

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

          {/* Combobox chọn thành viên: hỗ trợ nhập tìm kiếm Tên (tiếng Việt không dấu), Email, SĐT */}
          <div ref={comboboxRef} className="relative">
            <div
              className={`flex items-center w-full px-3 py-2 text-xs border rounded-md bg-white shadow-2xs transition-all ${
                isOpenDropdown
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsOpenDropdown(true)}
                placeholder="Nhập tên, email hoặc số điện thoại để tìm..."
                className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400 cursor-text"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setIsOpenDropdown((prev) => !prev)}
                className="ml-1 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-150 ${isOpenDropdown ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Menu thả xuống hiển thị danh sách thành viên */}
            {isOpenDropdown && (
              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg py-1">
                {activeCandidates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 text-center">
                    Không có thành viên đang hoạt động nào khác trong Workspace.
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 text-center">
                    Không tìm thấy thành viên nào khớp với từ khóa "{searchQuery}".
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = candidate.id === selectedMemberId;
                    const label = getDisplayLabel(candidate);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleSelectOption(candidate)}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{label}</span>
                          {candidate.phoneNumber && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                isSelected ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              ({candidate.phoneNumber})
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={14} className="shrink-0 ml-2 text-white" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
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
