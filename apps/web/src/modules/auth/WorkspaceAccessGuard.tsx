import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceConfig } from '../workspace/WorkspaceConfigContext.js';
import { HttpErrorPage } from '../../pages/errors/HttpErrorPage.js';
import { AppSkeleton } from '../../components/ui/AppSkeleton.js';
import { ROUTES, buildRoute } from '../../config/routes.js';
import { apiClient } from '../../lib/api-client/index.js';

import { useTranslation } from '../../i18n/index.js';
export interface WorkspaceAccessGuardProps {
  children?: React.ReactNode;
  /** Yêu cầu Owner hoặc Workspace Manager của workspace này (Mặc định: false) */
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
  const [permissionCheck, setPermissionCheck] = useState<{ workspaceId: string; allowed: boolean | null }>({
    workspaceId: '',
    allowed: null,
  });

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

  useEffect(() => {
    if (!requireOwner || !targetWorkspace) {
      setPermissionCheck({ workspaceId: targetWorkspace?.id ?? '', allowed: null });
      return;
    }
    let cancelled = false;
    setPermissionCheck({ workspaceId: targetWorkspace.id, allowed: null });
    void apiClient.get<{ canManageWorkspace: boolean }>('/workspaces/current/staff/permissions', {
      skipToast: true,
      headers: { 'x-workspace-id': targetWorkspace.id },
    }).then((permissions) => {
      if (!cancelled) setPermissionCheck({ workspaceId: targetWorkspace.id, allowed: Boolean(permissions.canManageWorkspace) });
    }).catch(() => {
      if (!cancelled) setPermissionCheck({ workspaceId: targetWorkspace.id, allowed: false });
    });
    return () => { cancelled = true; };
  }, [requireOwner, targetWorkspace?.id]);

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

  // Kiểm tra quyền quản lý workspace từ API, không suy quyền từ vai trò STAFF/OWNER ở client.
  if (requireOwner && targetWorkspace) {
    if (permissionCheck.workspaceId !== targetWorkspace.id || permissionCheck.allowed === null) {
      return <AppSkeleton />;
    }
    if (!permissionCheck.allowed) {
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
