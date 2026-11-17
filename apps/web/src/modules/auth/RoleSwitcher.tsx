import React from 'react';
import { useUserRole } from './UserRoleContext.js';
import { Headphones, Crown, Lock, ShieldCheck } from 'lucide-react';

import { useTranslation } from '../../i18n/index.js';
/**
 * Hiển thị huy hiệu vai trò RBAC của tài khoản hiện tại.
 * Đã khóa chuyển đổi vai trò tùy tiện để đảm bảo tuân thủ phân quyền và bảo mật hệ thống.
 */
export const RoleSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { isOwner, isManager, role } = useUserRole();
  if (!role) return null;

  return (
    <div
      className="role-switcher-container role-switcher-locked"
      title={t('header.rbacTitle', 'Vai trò bảo mật RBAC: {role} - Xác định theo Workspace hiện tại', { role: isOwner ? 'Owner' : isManager ? 'Manager' : 'Staff' })}
    >
      <div className={`role-switcher-badge ${isOwner ? 'active-owner' : 'active-agent'}`}>
        {isOwner ? (
          <>
            <Crown size={13} className="role-btn-icon" />
            <span className="role-text">{t('header.rbacOwnerBadge', 'Chủ DN (Owner)')}</span>
          </>
        ) : isManager ? (
          <>
            <ShieldCheck size={13} className="role-btn-icon" />
            <span className="role-text">Quản lý (Manager)</span>
          </>
        ) : (
          <>
            <Headphones size={13} className="role-btn-icon" />
            <span className="role-text">{t('header.rbacStaffBadge', 'Tư vấn viên ({role})', { role })}</span>
          </>
        )}
        <span title={t('header.rbacLocked', 'Vai trò đã khóa bảo mật')}><Lock size={11} className="role-lock-icon" /></span>
      </div>
    </div>
  );
};
