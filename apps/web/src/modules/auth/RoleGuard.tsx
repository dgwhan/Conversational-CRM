import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from './UserRoleContext.js';
import { useWorkspaceConfig } from '../workspace/WorkspaceConfigContext.js';
import { USER_ROLES, type UserRole } from './userRole.types.js';
import { HttpErrorPage } from '../../pages/errors/HttpErrorPage.js';
import { ROUTES } from '../../config/routes.js';

import { useTranslation } from '../../i18n/index.js';
import { translate } from '../../i18n/translate.js';
export interface RoleGuardProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  requireOwner?: boolean;
  featureName?: string;
}

/**
 * ============================================================================
 * ROLE GUARD (FUNCTION LEVEL ACCESS CONTROL)
 * ----------------------------------------------------------------------------
 * Kiểm tra phân quyền theo vai trò (RBAC / BFLA) trước khi cho phép vào Route.
 * Trả về 403 Forbidden chuẩn mực khi tài khoản không đủ quyền hạn.
 * ============================================================================
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = [USER_ROLES.OWNER],
  requireOwner = true,
  featureName = translate('errors.defaultFeatureName', 'Tính năng Quản trị Hệ thống'),
}) => {
  const { t } = useTranslation();
  const { isOwner, role, isAgent } = useUserRole();
  const { isCurrentWorkspaceOwner } = useWorkspaceConfig();
  const navigate = useNavigate();

  const hasOwnerPrivilege = isOwner || isCurrentWorkspaceOwner;
  const isRolePermitted = allowedRoles.includes(role) || (requireOwner && hasOwnerPrivilege);

  if (requireOwner && !hasOwnerPrivilege && isAgent) {
    return (
      <HttpErrorPage
        statusCode={403}
        errorLocation={`RBAC Guard: ${featureName} (Yêu cầu vai trò: OWNER)`}
        errorMessage={t('errors.rbacOwnerOnly', 'Từ chối quyền truy cập (403 Forbidden): {feature} chỉ dành riêng cho Chủ doanh nghiệp (Owner). Bạn đang ở vai trò Tư vấn viên (Agent/Staff).', { feature: featureName })}
        onGoHome={() => navigate(ROUTES.REPORTS)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!isRolePermitted && !hasOwnerPrivilege) {
    return (
      <HttpErrorPage
        statusCode={403}
        errorLocation={`RBAC Guard: ${featureName} (Vai trò hiện tại: ${role || 'STAFF'})`}
        errorMessage={t('errors.rbacNoRole', 'Từ chối quyền truy cập (403 Forbidden): Bạn không có vai trò hợp lệ để truy cập {feature}.', { feature: featureName })}
        onGoHome={() => navigate(ROUTES.REPORTS)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <>{children}</>;
};
