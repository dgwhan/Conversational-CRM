import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceConfig } from '../workspace/WorkspaceConfigContext.js';
import { useUserRole } from './UserRoleContext.js';
import { USER_ROLES } from './userRole.types.js';
import { HttpErrorPage } from '../../pages/errors/HttpErrorPage.js';
import { AppSkeleton } from '../../components/ui/AppSkeleton.js';
import { ROUTES, buildRoute } from '../../config/routes.js';

import { useTranslation } from '../../i18n/index.js';
export interface WorkspaceAccessGuardProps {
  children?: React.ReactNode;
  /** Yêu cầu bắt buộc phải có vai trò Owner/Admin đối với workspace này (Mặc định: false) */
  requireOwner?: boolean;
}

export const WorkspaceAccessGuard: React.FC<WorkspaceAccessGuardProps> = ({
  children,
  requireOwner = false,
}) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { myWorkspaces, activeWorkspaceId, switchWorkspace, isWorkspaceListLoading } = useWorkspaceConfig();
  const { isOwner: globalIsOwner } = useUserRole();

  // 1. Kiểm tra tham số ID hợp lệ (chống ký tự đặc biệt, path traversal, injection)
  const isInvalidIdFormat = !id || /[<>'"\\;`|\s]/.test(id);
  const targetWorkspace = myWorkspaces.find((ws) => ws.id === id || ws.slug === id);

  // Tự động chuyển hướng an toàn nếu URL bị truyền literal string "undefined"
  useEffect(() => {
    if (id === 'undefined' && !isWorkspaceListLoading && myWorkspaces.length > 0) {
      const fallbackId = activeWorkspaceId || myWorkspaces[0]?.id;
      if (fallbackId && fallbackId !== 'undefined') {
        navigate(buildRoute.workspaceSettings(fallbackId), { replace: true });
      }
    }
  }, [id, isWorkspaceListLoading, myWorkspaces, activeWorkspaceId, navigate]);

  // Đồng bộ workspace từ URL sau khi danh sách đã tải xong
  useEffect(() => {
    if (targetWorkspace && targetWorkspace.id !== activeWorkspaceId) {
      switchWorkspace(targetWorkspace.id);
    }
  }, [targetWorkspace, activeWorkspaceId, switchWorkspace]);

  if (isWorkspaceListLoading) {
    return <AppSkeleton />;
  }

  // Nếu id là 'undefined' nhưng danh sách workspace đã có, component sẽ redirect ở useEffect trên
  if (id === 'undefined' && myWorkspaces.length > 0) {
    return <AppSkeleton />;
  }

  // Chặn tham số ID chứa ký tự nguy hiểm -> Trả 404 chống enumeration/injection
  if (isInvalidIdFormat) {
    return (
      <HttpErrorPage
        statusCode={404}
        errorLocation="Workspace Security Guard"
        errorMessage={t('errors.workspaceNotFoundOrInvalid', 'Không tìm thấy Không gian làm việc hoặc đường dẫn không hợp lệ.')}
        onGoHome={() => navigate(ROUTES.WORKSPACE_SETTINGS_DEFAULT)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Kiểm tra Object Level Authorization
  // User có thuộc Không gian làm việc này không? Hỗ trợ cả ID (UUID) và Slug
  // Nếu không tìm thấy workspace (hoặc user không thuộc workspace này):
  // Luôn trả về 404 Not Found, tuyệt đối không trả về 403 để triệt tiêu lỗ hổng Workspace Enumeration
  if (!targetWorkspace) {
    return (
      <HttpErrorPage
        statusCode={404}
        errorLocation="Workspace Security Guard"
        errorMessage={t('errors.workspaceNotFoundOrDenied', 'Không tìm thấy Không gian làm việc hoặc bạn không có quyền truy cập.')}
        onGoHome={() => navigate(ROUTES.WORKSPACE_SETTINGS_DEFAULT)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Kiểm tra Function Level Authorization (BFLA / RBAC)
  // Nếu route yêu cầu quyền Chủ sở hữu (requireOwner = true) nhưng người dùng không phải Owner:
  // Trả về 404 Not Found đồng nhất (không trả về 403 và không làm lộ tên/thông tin workspace)
  if (requireOwner && targetWorkspace) {
    const isOwnerOfTarget =
      targetWorkspace.isOwner === true ||
      targetWorkspace.role === USER_ROLES.OWNER ||
      (targetWorkspace.id === activeWorkspaceId && globalIsOwner);

    if (!isOwnerOfTarget) {
      return (
        <HttpErrorPage
          statusCode={404}
          errorLocation="Workspace Security Guard"
          errorMessage={t('errors.workspaceNotFoundOrDenied', 'Không tìm thấy Không gian làm việc hoặc bạn không có quyền truy cập.')}
          onGoHome={() => navigate(ROUTES.WORKSPACE_SETTINGS_DEFAULT)}
          onRetry={() => window.location.reload()}
        />
      );
    }
  }

  return <>{children}</>;
};
