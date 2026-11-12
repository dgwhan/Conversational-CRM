import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notify } from '../../components/feedback/toastEmitter.js';
import type { LoginResponse } from '../../features/auth/types/auth.types.js';
import { apiClient } from '../../lib/api-client/index.js';
import { USER_ROLES } from './userRole.types.js';
import type { UserRole, UserRoleContextValue } from './userRole.types.js';
import { STORAGE_KEYS } from '../../config/storage-keys.js';

import { translate } from '../../i18n/translate.js';
export { USER_ROLES };
export type { UserRole, UserRoleContextValue } from './userRole.types.js';

// Truy vấn các khóa định danh lưu trữ từ cấu hình tập trung (.env)
const AUTH_SESSION_KEY = STORAGE_KEYS.AUTH_SESSION;
const ACTIVE_WORKSPACE_KEY = STORAGE_KEYS.ACTIVE_WORKSPACE;

/**
 * Xóa sạch dữ liệu phiên & cache tài khoản khỏi trình duyệt
 */
function clearAccountCache() {
  try {
    if (AUTH_SESSION_KEY) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    if (ACTIVE_WORKSPACE_KEY) {
      sessionStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  } catch { }

  apiClient.setActiveWorkspaceId('');
}

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

export const UserRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lấy session từ sessionStorage (cách ly an toàn theo từng tab làm việc)
  const [session, setSession] = useState<LoginResponse | null>(() => {
    try {
      if (!AUTH_SESSION_KEY) return null;
      let saved = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!saved) {
        saved = localStorage.getItem(AUTH_SESSION_KEY);
        if (saved) {
          sessionStorage.setItem(AUTH_SESSION_KEY, saved);
          localStorage.removeItem(AUTH_SESSION_KEY);
        }
      }
      if (saved) {
        const parsed = JSON.parse(saved) as LoginResponse;
        if (parsed?.accessToken) {
          apiClient.setAccessToken(parsed.accessToken);
        }
        return parsed;
      }
    } catch { }
    return null;
  });

  // Role được nạp In-Memory từ Backend theo Workspace đang làm việc.
  // Tuyệt đối không lưu / đọc role từ storage để chống Client-Side Privilege Escalation.
  const [role, setRoleState] = useState<UserRole>(USER_ROLES.EMPTY);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string>('');

  // Đồng bộ accessToken sang apiClient mỗi khi session thay đổi
  useEffect(() => {
    if (session?.accessToken) {
      apiClient.setAccessToken(session.accessToken);
    }
  }, [session?.accessToken]);

  // Đăng ký trực tiếp sự kiện token refresh và session expiration trong bộ nhớ từ apiClient
  // Tuyệt đối không dùng CustomEvent toàn cục trên window để tránh bị giả mạo / DOM event injection
  useEffect(() => {
    const unsubRefreshed = apiClient.onTokenRefreshed((newAccessToken, staff) => {
      apiClient.setAccessToken(newAccessToken);
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          accessToken: newAccessToken,
          staff: staff ?? prev.staff,
        };
      });
    });

    const unsubExpired = apiClient.onSessionExpired(() => {
      clearAccountCache();
      apiClient.setAccessToken(null);
      setSession(null);
      setRoleState(USER_ROLES.EMPTY);
      setWorkspaceOwnerId('');
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch { }
      notify.warning(translate('header.sessionExpired', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'), translate('header.sessionTitle', 'Phiên làm việc'));
      window.location.href = '/login';
    });

    return () => {
      unsubRefreshed();
      unsubExpired();
    };
  }, []);

  // Thông tin tài khoản người dùng thực tế từ session (AuthUser)
  // Trả về dữ liệu chính xác theo trạng thái xác thực: nếu chưa đăng nhập thì trả về null
  // Tuyệt đối không trả về chuỗi rỗng '' (dữ liệu ảo)
  const isAuthenticated = Boolean(session?.accessToken);
  const currentUser = session?.user ?? session?.staff ?? null;
  const userId = currentUser ? currentUser.id : '';
  const userName = currentUser ? currentUser.fullName : '';
  const userEmail = currentUser ? currentUser.email : '';
  const staffId = userId;
  const staffName = userName;
  const staffEmail = userEmail;

  // Xác thực quyền hạn chính xác theo vai trò thực tế
  const isOwner = Boolean(isAuthenticated && role === USER_ROLES.OWNER);
  const isStaff = Boolean(isAuthenticated && role === USER_ROLES.STAFF);
  const isAgent = isStaff;
  const isRoleLocked = isAuthenticated;
  const ownerId = workspaceOwnerId || (isOwner ? userId : '');

  // Cập nhật vai trò từ Backend Workspace Context (chỉ lưu trong React State in-memory)
  const setRole = useCallback((newRole: UserRole, newOwnerId?: string) => {
    setRoleState(newRole);
    if (newOwnerId !== undefined) {
      setWorkspaceOwnerId(newOwnerId);
    }
  }, []);

  const login = useCallback((newSession: LoginResponse) => {
    clearAccountCache();

    apiClient.setAccessToken(newSession.accessToken);
    setSession(newSession);

    try {
      if (AUTH_SESSION_KEY) {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newSession));
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch { }

    setRoleState(USER_ROLES.EMPTY);
    setWorkspaceOwnerId('');

    const userObj = newSession.user || newSession.staff;
    notify.success(
      translate('header.welcomeUser', 'Chào mừng {name}!', { name: userObj?.fullName || translate('header.welcomeFallbackName', 'bạn') }),
      translate('header.loginSuccessTitle', 'Đăng nhập thành công')
    );
  }, []);

  const logout = useCallback(() => {
    apiClient.clearAuth();
    clearAccountCache();
    setSession(null);
    setRoleState(USER_ROLES.EMPTY);
    setWorkspaceOwnerId('');

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch { }

    apiClient.post('/auth/logout').catch(() => { });
    notify.info(translate('header.loggedOut', 'Đã đăng xuất khỏi hệ thống.'), translate('header.sessionTitle', 'Phiên làm việc'));
    window.location.href = '/login';
  }, []);

  const toggleRole = useCallback(() => {
    // Không cho phép đảo quyền client-side vì vai trò do Backend kiểm soát
    notify.warning(translate('header.roleServerManaged', 'Vai trò được xác thực và quản lý từ máy chủ theo từng Không gian làm việc.'), translate('header.roleTitle', 'Phân quyền hệ thống'));
  }, []);

  return (
    <UserRoleContext.Provider
      value={{
        role,
        isOwner,
        isStaff,
        isAgent,
        isRoleLocked,
        user: currentUser,
        userId,
        userName,
        userEmail,
        staffId,
        staffName,
        staffEmail,
        ownerId,
        session,
        isAuthenticated,
        login,
        logout,
        setRole,
        toggleRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = (): UserRoleContextValue => {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};
