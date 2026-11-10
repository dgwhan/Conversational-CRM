import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceConfig } from '../workspace/WorkspaceConfigContext.js';
import { useUserRole } from './UserRoleContext.js';
import { USER_ROLES } from './userRole.types.js';
import { HttpErrorPage } from '../../pages/errors/HttpErrorPage.js';
import { AppSkeleton } from '../../components/ui/AppSkeleton.js';
import { ROUTES } from '../../config/routes.js';

export interface WorkspaceAccessGuardProps {
  children?: React.ReactNode;
  /** Yêu cầu bắt buộc phải có vai trò Owner/Admin đối với workspace này (Mặc định: true) */
  requireOwner?: boolean;
}

/**
 * ============================================================================
 * WORKSPACE ACCESS GUARD (RBAC & BROKEN ACCESS CONTROL PREVENTION)
 * ----------------------------------------------------------------------------
 * Bảo vệ các route có truyền :id của Workspace (ví dụ: /workspace/:id).
 * Ngăn chặn toàn diện các lỗ hổng:
 * 1. BOLA (Broken Object Level Authorization / IDOR):
 *    Kiểm tra xem user có thực sự là thành viên được phân quyền của Workspace :id đó không.
 * 2. BFLA (Broken Function Level Authorization / RBAC):
 *    Kiểm tra xem vai trò của user trong Workspace đó có quyền thực thi cấu hình không (Role = OWNER).
 * 3. Parameter Tampering & Path Traversal:
 *    Kiểm tra định dạng ID tham số trên URL.
 * Trả về mã lỗi HTTP 403 Forbidden chuẩn mực khi vi phạm.
 * ============================================================================
 */
export const WorkspaceAccessGuard: React.FC<WorkspaceAccessGuardProps> = ({
  children,
  requireOwner = true,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { myWorkspaces, activeWorkspaceId, switchWorkspace, isLoading } = useWorkspaceConfig();
  const { isOwner: globalIsOwner } = useUserRole();
  const [isCheckingDone, setIsCheckingDone] = useState(false);

  // 1. Kiểm tra tham số ID hợp lệ (chống ký tự đặc biệt, path traversal, injection)
  const isInvalidIdFormat = !id || /[<>'"\\;`|\s]/.test(id);

  // Đợi nạp danh sách workspace nếu đang tải
  useEffect(() => {
    if (!isLoading) {
      setIsCheckingDone(true);
    }
  }, [isLoading]);

  // Nếu đang nạp ban đầu và chưa có dữ liệu workspace
  if (isLoading && myWorkspaces.length === 0 && !isCheckingDone) {
    return <AppSkeleton />;
  }

  // 2. Chặn tham số ID chứa ký tự nguy hiểm
  if (isInvalidIdFormat) {
    return (
      <HttpErrorPage
        statusCode={403}
        errorLocation={`Route: /workspace/${id || 'undefined'}`}
        errorMessage="Từ chối truy cập (403): Mã định danh Không gian làm việc (Workspace ID) không hợp lệ hoặc chứa ký tự không an toàn."
        onGoHome={() => navigate(ROUTES.REPORTS)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 3. Kiểm tra Object Level Authorization (BOLA / IDOR)
  // User có thuộc Không gian làm việc này không?
  const targetWorkspace = myWorkspaces.find((ws) => ws.id === id);

  if (myWorkspaces.length > 0 && !targetWorkspace) {
    return (
      <HttpErrorPage
        statusCode={403}
        errorLocation={`BOLA Check: User không có quyền truy cập Object ID [${id}]`}
        errorMessage={`Từ chối quyền truy cập (403 Forbidden): Bạn không phải là thành viên hoặc không được cấp quyền truy cập Không gian làm việc có ID "${id}". Hành vi này đã bị chặn để ngăn chặn tấn công Broken Access Control (BOLA/IDOR).`}
        onGoHome={() => navigate(ROUTES.REPORTS)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 4. Kiểm tra Function Level Authorization (BFLA / RBAC)
  // Nếu route yêu cầu quyền Chủ sở hữu (Owner/Admin)
  if (requireOwner && targetWorkspace) {
    const isOwnerOfTarget =
      targetWorkspace.isOwner === true ||
      targetWorkspace.role === USER_ROLES.OWNER ||
      (targetWorkspace.id === activeWorkspaceId && globalIsOwner);

    if (!isOwnerOfTarget) {
      return (
        <HttpErrorPage
          statusCode={403}
          errorLocation={`RBAC / BFLA Check: Vai trò yêu cầu [OWNER], vai trò hiện tại [${targetWorkspace.role || 'STAFF'}]`}
          errorMessage={`Từ chối quyền truy cập (403 Forbidden): Tính năng Quản lý Cấu hình và Thiết lập Không gian làm việc "${targetWorkspace.name}" chỉ dành riêng cho Chủ doanh nghiệp (Workspace Owner). Tài khoản của bạn được phân quyền là Nhân viên (Staff/Agent).`}
          onGoHome={() => navigate(ROUTES.REPORTS)}
          onRetry={() => window.location.reload()}
        />
      );
    }
  }

  // 5. Tự động đồng bộ hóa activeWorkspace nếu ID hợp lệ nhưng chưa được active
  if (id && targetWorkspace && id !== activeWorkspaceId) {
    switchWorkspace(id);
  }

  return <>{children}</>;
};
