import React, { useState } from 'react';
import { Plus, Trash2, LogOut, Users, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import {
  WORKSPACE_MEMBER_STATUS,
  type ManagedStaffItem,
} from '../../../../WorkspaceConfigContext.js';
import { StaffRole } from '../../../../../../features/auth/constants/auth.constants.js';
import {
  PageToolbar,
  SearchInput,
  Select,
  Button,
  EmptyState,
} from '../../../../../../components/ui/index.js';
import { InviteMemberModal } from './modals/index.js';

export interface WorkspaceMembersTabProps {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  currentStaffId: string;
  currentStaffEmail: string;
  staffMembers: ManagedStaffItem[];
  onRemoveMember: (memberId: string, memberName: string, memberRole?: string) => Promise<void>;
  onLeaveWorkspace: () => Promise<void>;
  onInviteMember: (identifier: string, role: StaffRole) => Promise<void>;
  onCancelInvitation?: (memberId: string, memberName: string) => Promise<void>;
}

export const WorkspaceMembersTab: React.FC<WorkspaceMembersTabProps> = ({
  isOwner,
  currentStaffId,
  currentStaffEmail,
  staffMembers,
  onRemoveMember,
  onLeaveWorkspace,
  onInviteMember,
  onCancelInvitation,
}) => {
  // 2 Sub-tabs con: 'members' (Thành viên chính thức) & 'invitations' (Lời mời đã gửi)
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invitations'>('members');

  // Tìm kiếm và bộ lọc vai trò
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [memberPage, setMemberPage] = useState(1);
  const pageSize = 10;

  // Modal mời thành viên mới
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Phân chia dữ liệu theo 2 Sub-tabs
  const activeMembers = staffMembers.filter(
    (m) => !m.memberStatus || m.memberStatus === WORKSPACE_MEMBER_STATUS.ACTIVE
  );
  const pendingInvitations = staffMembers.filter(
    (m) => m.memberStatus === WORKSPACE_MEMBER_STATUS.PENDING
  );

  // Quy tắc phân quyền: Staff chỉ được xem danh sách thành viên chính thức ('members')
  // Chỉ Chủ sở hữu (Owner) mới được xem và quản lý tab 'invitations' (Lời mời đã gửi)
  const effectiveSubTab = isOwner ? activeSubTab : 'members';

  // Danh sách hiển thị theo subtab đang chọn
  const currentTabMembers = effectiveSubTab === 'members' ? activeMembers : pendingInvitations;

  // Quy tắc nghiệp vụ: 1 workspace ít nhất 1 owner, nếu có >= 2 owner cho phép rời workspace
  const totalOwners = activeMembers.filter((m) => m.role === StaffRole.OWNER).length;
  const canOwnerLeave = totalOwners >= 2;

  // Lọc theo từ khóa tìm kiếm & vai trò
  const filteredStaff = currentTabMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phoneNumber && m.phoneNumber.toLowerCase().includes(q));
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchQuery && matchRole;
  });

  // Phân trang
  const totalPages = Math.ceil(filteredStaff.length / pageSize) || 1;
  const paginatedStaff = filteredStaff.slice((memberPage - 1) * pageSize, memberPage * pageSize);

  const roleFilterOptions = [
    { value: 'ALL', label: 'Tất cả vai trò' },
    { value: StaffRole.OWNER, label: 'Chủ sở hữu' },
    { value: StaffRole.STAFF, label: 'Nhân viên tư vấn' },
  ];

  return (
    <div className="space-y-3.5 pt-1">
      {/* 1. Thanh điều hướng Sub-tabs con (Ẩn tab Lời mời đã gửi đối với vai trò Staff) */}
      {isOwner && (
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('members');
              setMemberPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              effectiveSubTab === 'members'
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Users size={14} className={effectiveSubTab === 'members' ? 'text-blue-600' : 'text-slate-500'} />
            <span>Thành viên</span>
            <span
              className={`px-1.5 py-0.2 text-[10.5px] rounded-full font-medium ${
                effectiveSubTab === 'members'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('invitations');
              setMemberPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              effectiveSubTab === 'invitations'
                ? 'bg-amber-50 text-amber-800 font-semibold shadow-2xs border border-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Mail size={14} className={effectiveSubTab === 'invitations' ? 'text-amber-600' : 'text-slate-500'} />
            <span>Lời mời đã gửi</span>
            {pendingInvitations.length > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10.5px] rounded-full font-semibold ${
                  effectiveSubTab === 'invitations'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* 2. Global Page Toolbar & Search System */}
      <PageToolbar
        search={
          <SearchInput
            value={memberSearch}
            onChange={(val) => {
              setMemberSearch(val);
              setMemberPage(1);
            }}
            placeholder={
              effectiveSubTab === 'members'
                ? 'Tìm kiếm thành viên theo tên, email hoặc số điện thoại... (Nhấn /)'
                : 'Tìm kiếm lời mời theo tên, email hoặc số điện thoại...'
            }
            shortcutHint="/"
            size="sm"
          />
        }
        filters={
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setMemberPage(1);
            }}
            options={roleFilterOptions}
            size="sm"
          />
        }
        actions={
          isOwner && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Mời thành viên
            </Button>
          )
        }
      />

      {/* 3. Bảng danh sách thành viên / lời mời */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
              <th className="py-3 px-5 sm:px-6">
                {effectiveSubTab === 'members' ? 'Thành viên' : 'Người được mời'}
              </th>
              <th className="py-3 px-5 sm:px-6">Email</th>
              <th className="py-3 px-5 sm:px-6">
                {effectiveSubTab === 'members' ? 'Số điện thoại' : 'Thời gian mời'}
              </th>
              <th className="py-3 px-5 sm:px-6">Vai trò</th>
              <th className="py-3 px-5 sm:px-6">Trạng thái</th>
              <th className="py-3 px-5 sm:px-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginatedStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    icon={
                      effectiveSubTab === 'members' ? (
                        <Users size={28} className="mx-auto text-slate-400" />
                      ) : (
                        <Mail size={28} className="mx-auto text-amber-400" />
                      )
                    }
                    title={
                      memberSearch
                        ? effectiveSubTab === 'members'
                          ? 'Không tìm thấy thành viên nào'
                          : 'Không tìm thấy lời mời nào'
                        : effectiveSubTab === 'members'
                        ? 'Chưa có thành viên nào'
                        : 'Chưa có lời mời nào đang chờ'
                    }
                    description={
                      memberSearch
                        ? `Không có kết quả nào khớp với "${memberSearch}". Thử kiểm tra lại từ khóa.`
                        : effectiveSubTab === 'members'
                        ? 'Mời thành viên mới tham gia không gian làm việc để cùng cộng tác.'
                        : 'Hiện không có lời mời nào đang chờ phản hồi. Bạn có thể nhấn nút "Mời thành viên" để gửi lời mời mới.'
                    }
                    isDashed={false}
                    className="border-none py-8 bg-white"
                  />
                </td>
              </tr>
            ) : (
              paginatedStaff.map((member) => {
                const isOwnerMember = member.role === StaffRole.OWNER;
                const isPending = member.memberStatus === WORKSPACE_MEMBER_STATUS.PENDING;
                const isCurrentUser =
                  (member.id && member.id === currentStaffId) ||
                  (member.email && currentStaffEmail && member.email.toLowerCase() === currentStaffEmail.toLowerCase());

                return (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Tên thành viên / Người nhận */}
                    <td className="py-3.5 px-5 sm:px-6 font-semibold text-slate-900">
                      {member.fullName || member.email.split('@')[0]}
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-5 sm:px-6 text-slate-600 font-mono text-[11.5px]">
                      {member.email}
                    </td>

                    {/* Số điện thoại / Thời gian mời */}
                    <td className="py-3 px-5 sm:px-6 text-slate-600 font-mono text-[11.5px]">
                      {effectiveSubTab === 'members' ? (
                        member.phoneNumber || <span className="text-slate-400">—</span>
                      ) : (
                        member.invitedAt ? (
                          new Date(member.invitedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-400">—</span>
                        )
                      )}
                    </td>

                    {/* Nhãn vai trò tiếng Việt */}
                    <td className="py-3.5 px-5 sm:px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${
                          isOwnerMember
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isOwnerMember ? 'Chủ sở hữu' : 'Nhân viên tư vấn'}
                      </span>
                    </td>

                    {/* Trạng thái (Chính thức xanh lá / Chờ chấp nhận vàng cam) */}
                    <td className="py-3.5 px-5 sm:px-6">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} className="text-amber-500 animate-pulse" />
                          <span>Chờ chấp nhận</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-500" />
                          <span>Chính thức</span>
                        </span>
                      )}
                    </td>

                    {/* Cột thao tác */}
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      {(() => {
                        // Trường hợp A: Đang ở trạng thái Chờ chấp nhận (PENDING)
                        if (isPending) {
                          if (isOwner) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetId = member.memberId || member.id;
                                  const targetName = member.fullName || member.email;
                                  if (onCancelInvitation) {
                                    onCancelInvitation(targetId, targetName);
                                  } else {
                                    onRemoveMember(targetId, targetName, member.role);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-md bg-transparent border-none cursor-pointer transition-colors"
                                title="Hủy lời mời tham gia Không gian làm việc này"
                              >
                                <XCircle size={13} />
                                <span>Hủy lời mời</span>
                              </button>
                            );
                          }
                          return <span className="text-slate-400 text-xs">—</span>;
                        }

                        // Trường hợp B: Thành viên Chính thức - Chính tài khoản đang đăng nhập
                        if (isCurrentUser) {
                          if (isOwnerMember && !canOwnerLeave) {
                            return (
                              <span
                                className="text-slate-400 text-[11px]"
                                title="Không gian làm việc phải có ít nhất 1 Chủ sở hữu. Cần tối thiểu 2 Chủ sở hữu để rời."
                              >
                                —
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={onLeaveWorkspace}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md bg-transparent border-none cursor-pointer transition-colors"
                              title="Rời khỏi Không gian làm việc này"
                            >
                              <LogOut size={13} />
                              <span>Rời workspace</span>
                            </button>
                          );
                        }

                        // Trường hợp C: Quản trị viên (Owner) thao tác trên thành viên chính thức khác
                        if (isOwner) {
                          if (isOwnerMember && !canOwnerLeave) {
                            return (
                              <span
                                className="text-slate-400 text-xs"
                                title="Không thể xóa khi chỉ còn 1 Chủ sở hữu duy nhất"
                              >
                                —
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => onRemoveMember(member.id, member.fullName || member.email, member.role)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md bg-transparent border-none cursor-pointer transition-colors"
                              title={isOwnerMember ? 'Loại bỏ Chủ sở hữu này khỏi Không gian làm việc' : 'Xóa thành viên khỏi không gian làm việc'}
                            >
                              <Trash2 size={13} />
                              <span>{isOwnerMember ? 'Loại bỏ' : 'Xóa'}</span>
                            </button>
                          );
                        }

                        return <span className="text-slate-400 text-xs">—</span>;
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Footer phân trang */}
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500 flex-wrap gap-2">
        <span>
          Hiển thị {paginatedStaff.length > 0 ? (memberPage - 1) * pageSize + 1 : 0}–
          {Math.min(memberPage * pageSize, filteredStaff.length)} trên tổng số {filteredStaff.length}{' '}
          {effectiveSubTab === 'members' ? 'thành viên' : 'lời mời'}
        </span>

        {/* Nút phân trang */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={memberPage === 1}
              onClick={() => setMemberPage((p) => Math.max(p - 1, 1))}
            >
              Trước
            </Button>
            <span className="px-2 font-medium text-slate-700">
              {memberPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={memberPage === totalPages}
              onClick={() => setMemberPage((p) => Math.min(p + 1, totalPages))}
            >
              Sau
            </Button>
          </div>
        )}
      </div>

      {/* 5. Modal Mời thành viên */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteMember={onInviteMember}
      />
    </div>
  );
};
