import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Menu, ShieldCheck, Globe } from 'lucide-react';
import type { ActiveNavTab } from '../app/Sidebar.js';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher.js';
import { useTranslation } from '../i18n/index.js';
import { StaffPresenceSelector } from '../modules/realtime/StaffPresenceSelector.js';
import { NotificationCenter } from '../modules/notification/NotificationCenter.js';
import { useUserRole } from '../modules/auth/index.js';
import { WorkspaceSwitcher } from '../modules/workspace/WorkspaceSwitcher.js';
import '../styles/header-layout.css';

export interface HeaderLayoutProps {
  currentTab: ActiveNavTab;
  onTabChange?: (tab: ActiveNavTab) => void;
  onApiUrlChange?: (newUrl: string) => void;
  onToggleMobileMenu?: () => void;
  title?: string;
  extraActions?: React.ReactNode;
}

const TAB_NAME_MAP: Record<ActiveNavTab, string> = {
  reports: 'Báo cáo & Thống kê',
  inbox: 'Hộp thư Hội thoại',
  kanban: 'Phễu Tuyển sinh',
  calendar: 'Lịch biểu & Nhiệm vụ',
  'workspace-settings': 'Quản lý Cấu hình',
  onboarding: 'Kết nối Kênh',
  import: 'Nhập Dữ liệu',
};

/**
 * Layout Header chuyên biệt cho toàn bộ ứng dụng CUSC Conversational CRM.
 * Thiết kế theo phong cách Modern SaaS Glassmorphism hiện đại, tinh tế.
 * Tối ưu responsive hoàn hảo cho Desktop, Tablet và Mobile (đặc biệt iPhone 15 Pro Max 430x873).
 * Loại bỏ triệt để hiện tượng đè chồng nút chức năng và nội dung trên màn hình nhỏ.
 */
export const HeaderLayout: React.FC<HeaderLayoutProps> = ({
  currentTab,
  onTabChange,
  onToggleMobileMenu,
  title,
  extraActions,
}) => {
  const { isOwner, staffName, staffEmail, logout } = useUserRole();
  const { t, locale, setLocale } = useTranslation();
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);

  // Đóng Mobile User Menu khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        mobileUserMenuRef.current &&
        !mobileUserMenuRef.current.contains(e.target as Node)
      ) {
        setIsMobileUserMenuOpen(false);
      }
    };
    if (isMobileUserMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMobileUserMenuOpen]);

  const currentTabLabel = title || TAB_NAME_MAP[currentTab] || t('nav.liveInbox');
  const userRoleText = isOwner ? 'Chủ doanh nghiệp' : 'Tư vấn viên';
  const userInitial = (staffName || (isOwner ? 'O' : 'A')).trim().charAt(0).toUpperCase();

  return (
    <header className="crm-navbar" role="banner">
      <div className="crm-navbar-container">
        {/* 1. KHU VỰC BÊN TRÁI: HAMBURGER & TAB TITLE */}
        <div className="crm-navbar-left">
          {onToggleMobileMenu && (
            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={onToggleMobileMenu}
              title="Mở thanh điều hướng"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Tiêu đề trang / Tab hiện tại - Giúp định hướng nhanh */}
          <div className="crm-header-title-box">
            <span className="crm-header-current-tab" title={currentTabLabel}>
              {currentTabLabel}
            </span>
          </div>
        </div>

        {/* 2. KHU VỰC BÊN PHẢI: UTILITIES & ACTIONS */}
        <div className="crm-navbar-right crm-navbar-actions">
          {/* Tab chuyển đổi nhanh giữa các Workspace */}
          <div className="crm-header-action-item ws-item-wrap">
            <WorkspaceSwitcher />
          </div>

          {/* Hộp lưu thông báo trung tâm */}
          <div className="crm-header-action-item notif-item-wrap">
            <NotificationCenter onNavigateTab={onTabChange} />
          </div>

          {/* Trạng thái nhân viên trực tuyến (Desktop đầy đủ, Mobile compact) */}
          <div className="crm-header-action-item presence-item-wrap desktop-only">
            <StaffPresenceSelector compact={false} />
          </div>
          <div className="crm-header-action-item presence-item-wrap mobile-only">
            <StaffPresenceSelector compact={true} />
          </div>

          {/* Chuyển đổi ngôn ngữ Tiếng Việt / English - Chỉ hiện trực tiếp trên Desktop */}
          <div className="crm-header-action-item lang-item-wrap desktop-only">
            <LanguageSwitcher />
          </div>

          {/* Thông tin tài khoản & Đăng xuất - Desktop view */}
          <div className="crm-user-profile-pill desktop-only">
            <div className="crm-avatar-mini" aria-hidden="true">
              {userInitial}
            </div>
            <span
              className="crm-user-profile-name"
              title={staffName || userRoleText}
            >
              {staffName || userRoleText}
            </span>
            <button
              type="button"
              className="crm-user-logout-btn"
              onClick={logout}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={13} />
              <span className="logout-text">Thoát</span>
            </button>
          </div>

          {/* Các action widget bổ sung nếu truyền từ bên ngoài */}
          {extraActions && (
            <div className="crm-header-action-item extra-item-wrap desktop-only">
              {extraActions}
            </div>
          )}

          {/* Nút Avatar Profile trên Mobile - Gom User Info + Ngôn ngữ + Đăng xuất tránh tràn màn hình 430px */}
          <div className="mobile-user-profile-wrapper mobile-only" ref={mobileUserMenuRef}>
            <button
              type="button"
              className={`mobile-profile-avatar-btn ${isMobileUserMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileUserMenuOpen((prev) => !prev)}
              title="Xem thông tin tài khoản và cài đặt nhanh"
              aria-expanded={isMobileUserMenuOpen}
              aria-label="Tài khoản và cài đặt"
            >
              <span className="mobile-avatar-text">{userInitial}</span>
              <span className="mobile-avatar-badge-dot" />
            </button>

            {/* Popover / Sheet Tài Khoản Nhanh Trên Mobile */}
            {isMobileUserMenuOpen && (
              <div className="mobile-user-popover-backdrop" onClick={() => setIsMobileUserMenuOpen(false)}>
                <div
                  className="mobile-user-popover-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header thẻ user */}
                  <div className="popover-user-card-header">
                    <div className="popover-avatar-lg">
                      {userInitial}
                    </div>
                    <div className="popover-user-info">
                      <div className="popover-user-name" title={staffName || userRoleText}>
                        {staffName || userRoleText}
                      </div>
                      <div className="popover-user-role">
                        <ShieldCheck size={12} className={isOwner ? 'text-indigo-600' : 'text-blue-600'} />
                        <span className={`role-badge ${isOwner ? 'owner' : 'agent'}`}>
                          {userRoleText}
                        </span>
                      </div>
                      {staffEmail && (
                        <div className="popover-user-email" title={staffEmail}>
                          {staffEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Cài đặt ngôn ngữ */}
                  <div className="popover-section-row">
                    <span className="section-row-label">
                      <Globe size={14} className="text-slate-500" />
                      <span>Ngôn ngữ hiển thị</span>
                    </span>
                    <div className="mobile-lang-pills">
                      <button
                        type="button"
                        className={`lang-pill-btn ${locale === 'vi' ? 'active' : ''}`}
                        onClick={() => setLocale('vi')}
                      >
                        Tiếng Việt
                      </button>
                      <button
                        type="button"
                        className={`lang-pill-btn ${locale === 'en' ? 'active' : ''}`}
                        onClick={() => setLocale('en')}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Nút Đăng xuất */}
                  <div className="popover-footer-action">
                    <button
                      type="button"
                      className="popover-logout-btn"
                      onClick={() => {
                        setIsMobileUserMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
