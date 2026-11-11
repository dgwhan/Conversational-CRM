import React from 'react';
import {
  Building2,
  Users,
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { WORKSPACE_MEMBER_STATUS } from '../WorkspaceConfigContext.js';
import { AppSkeleton } from '../../../components/ui/AppSkeleton.js';
import { Button } from '../../../components/ui/Button.js';
import { ROUTES, buildRoute } from '../../../config/routes.js';
import { maskEmail } from '../../../config/ui.js';
import { useWorkspaceInvitation } from '../hooks/useWorkspaceInvitation.js';

export const WorkspaceInvitationPage: React.FC = () => {
  const {
    invitation,
    isLoading,
    isError,
    isSubmitting,
    fetchInvitation,
    handleAccept,
    handleDecline,
    navigate,
    switchWorkspace,
  } = useWorkspaceInvitation();

  // Đang nạp dữ liệu
  if (isLoading) {
    return <AppSkeleton />;
  }

  // Keep invitation failures inside the app shell instead of replacing the entire page.
  if (isError || !invitation) {
    return (
      <section className="mx-auto my-10 max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Lời mời hiện không khả dụng</h1>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSPACE_DEFAULT)}>Về workspace</Button>
          <Button variant="primary" onClick={fetchInvitation}>Thử lại</Button>
        </div>
      </section>
    );
  }

  const isPending = invitation.status === WORKSPACE_MEMBER_STATUS.PENDING;
  const isActive = invitation.status === WORKSPACE_MEMBER_STATUS.ACTIVE;
  const isDeclined = invitation.status === WORKSPACE_MEMBER_STATUS.DECLINED;
  const membersCount = invitation.membersCount;

  return (
    <div className="min-h-[82vh] w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50/60">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header đơn giản chuẩn hệ thống */}
        <div className="p-6 border-b border-slate-100 text-center bg-white">
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mb-3 shadow-2xs">
            <Building2 size={24} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-100/80">
            Lời mời tham gia
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-2 tracking-tight">
            {invitation.workspaceName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            CUSC Recruitment CRM
          </p>
        </div>

        {/* Nội dung thông tin chi tiết */}
        <div className="p-6 space-y-4">
          {/* Trạng thái lời mời */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="font-medium text-slate-500">
              Trạng thái lời mời
            </span>
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <Clock size={12} className="text-amber-600" />
                Chờ bạn phản hồi
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Đã tham gia
              </span>
            )}
            {isDeclined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <XCircle size={12} className="text-slate-500" />
                Đã từ chối
              </span>
            )}
          </div>

          {/* Chi tiết người gửi, người nhận, số lượng thành viên, thời gian */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-lg border border-slate-100 text-xs">
            {/* Người gửi lời mời - Ẩn gmail dạng *** */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <UserCheck size={14} className="text-slate-400" />
                Người gửi lời mời:
              </span>
              <span className="font-semibold text-slate-800 text-right">
                {invitation.invitedBy?.fullName ?? '—'}
                {invitation.invitedBy?.email && (
                  <span className="block text-[11px] font-normal text-slate-500">
                    {maskEmail(invitation.invitedBy.email)}
                  </span>
                )}
              </span>
            </div>

            {/* Số lượng thành viên */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <Users size={14} className="text-slate-400" />
                Số lượng thành viên:
              </span>
              <span className="font-semibold text-slate-800">
                {membersCount === undefined ? '—' : `${membersCount} thành viên`}
              </span>
            </div>

            {/* Thời gian gửi */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <Calendar size={14} className="text-slate-400" />
                Thời gian gửi:
              </span>
              <span className="text-slate-600 font-medium">
                {new Date(invitation.invitedAt).toLocaleString('vi-VN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    })}
              </span>
            </div>
          </div>

          {/* Thông báo nếu đã Active */}
          {isActive && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                Bạn đã là thành viên chính thức
              </p>
              <p className="mt-0.5 text-emerald-700">
                Bạn có thể truy cập Không gian làm việc bất cứ lúc nào.
              </p>
            </div>
          )}

          {/* Thông báo nếu đã Declined */}
          {isDeclined && (
            <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs">
              <p className="font-semibold flex items-center gap-1.5">
                <XCircle size={14} className="text-slate-500 shrink-0" />
                Lời mời đã kết thúc
              </p>
              <p className="mt-0.5 text-slate-600">
                Bạn đã từ chối lời mời này.
              </p>
            </div>
          )}

          {/* Các nút hành động */}
          <div className="pt-2">
            {isPending && (
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-medium py-2 text-xs"
                  disabled={isSubmitting}
                  onClick={handleDecline}
                  icon={<XCircle size={14} />}
                >
                  Từ chối
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center font-semibold py-2 text-xs shadow-2xs"
                  disabled={isSubmitting}
                  onClick={handleAccept}
                  icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Chấp nhận lời mời'}
                </Button>
              </div>
            )}

            {isActive && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center font-semibold py-2 text-xs shadow-2xs"
                  onClick={() => {
                    const targetId = invitation.workspaceSlug ?? invitation.workspaceId;
                    switchWorkspace(invitation.workspaceId);
                    navigate(buildRoute.workspace(targetId));
                  }}
                  icon={<ArrowRight size={14} />}
                >
                  Vào Không gian làm việc
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-center text-slate-500 hover:text-slate-800 text-xs py-1.5"
                  onClick={() => navigate(ROUTES.WORKSPACE_DEFAULT)}
                >
                  Quay về danh sách không gian làm việc
                </Button>
              </div>
            )}

            {isDeclined && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center py-2 text-xs text-slate-700"
                onClick={() => navigate(ROUTES.WORKSPACE_DEFAULT)}
              >
                Quay về trang quản lý không gian làm việc
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
