import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  BarChart3,
  Layers,
  LayoutGrid,
  Sliders,
  Calendar,
  GraduationCap,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTranslation } from '../i18n/index.js';
import { useRealtime } from '../modules/realtime/RealtimeContext.js';
import { useUserRole } from '../modules/auth/UserRoleContext.js';
import { useWorkspaceConfig } from '../modules/workspace/WorkspaceConfigContext.js';
import { notify } from '../components/feedback/toastEmitter.js';
import { TAB_TO_ROUTE_MAP, getTabFromPathname } from '../config/routes.js';

export type ActiveNavTab = 'inbox' | 'leads' | 'kanban' | 'calendar' | 'deals' | 'reports' | 'onboarding' | 'workspace-settings';

export interface SidebarProps {
  currentTab?: ActiveNavTab;
  onTabChange?: (tab: ActiveNavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { t } = useTranslation();
  const { unreadCount } = useRealtime();
  const { config, activeWorkspaceId } = useWorkspaceConfig();
  const { isAgent } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định tab đang active từ props hoặc từ URL pathname hiện tại
  const effectiveTab = currentTab || getTabFromPathname(location.pathname);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('crm_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('crm_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };

  const mainNavItems = [
    {
      id: 'reports' as ActiveNavTab,
      label: t('nav.reportsStats'),
      icon: <BarChart3 size={18} />,
    },
    {
      id: 'inbox' as ActiveNavTab,
      label: t('nav.liveInbox'),
      icon: <MessageSquare size={18} />,
      badgeCount: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'leads' as ActiveNavTab,
      label: t('nav.leadsList', 'Danh sách Lead'),
      icon: <Users size={18} />,
    },
    {
      id: 'kanban' as ActiveNavTab,
      label: (config.terminology.pipelineName || t('header.kanbanTab', 'Phễu Tuyển sinh'))
        .replace(/\s*(CUSC|PolarisX)/gi, '')
        .trim() || t('header.kanbanTab', 'Phễu Tuyển sinh'),
      icon: <LayoutGrid size={18} />,
    },
    {
      id: 'calendar' as ActiveNavTab,
      label: t('nav.calendarTasks', 'Lịch biểu & Nhiệm vụ'),
      icon: <Calendar size={18} />,
    },
    {
      id: 'deals' as ActiveNavTab,
      label: t('nav.deals', 'Lịch Sử & Đợt Tuyển Sinh'),
      icon: <GraduationCap size={18} />,
    },
    {
      id: 'workspace-settings' as ActiveNavTab,
      label: t('nav.workspaceSettings', 'Quản lý cấu hình'),
      icon: <Sliders size={18} />,
      restricted: isAgent,
    },
    {
      id: 'onboarding' as ActiveNavTab,
      label: t('nav.onboarding'),
      icon: <Layers size={18} />,
    },
  ];

  const handleItemClick = (e: React.MouseEvent, item: (typeof mainNavItems)[0]) => {
    e.preventDefault();
    if (item.restricted) {
      notify.warning(
        t('sidebar.restrictedAgentMsg', 'Bạn đang ở vai trò Tư vấn viên (Agent). Tính năng này chỉ dành cho Chủ doanh nghiệp (Owner).'),
        t('sidebar.restrictedTitle', 'Hạn chế Quyền hạn')
      );
      return;
    }

    // Điều hướng theo React Router
    const targetRoute = TAB_TO_ROUTE_MAP[item.id]?.(activeWorkspaceId) || '/reports';
    navigate(targetRoute);

    // Báo callback nếu component cha lắng nghe
    onTabChange?.(item.id);
    onCloseMobile?.();
  };

  return (
    <aside className={`crm-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className={`crm-sidebar-brand ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="crm-brand-text">
          <span className="crm-brand-title">Conversational CRM</span>
        </div>
        <button
          type="button"
          className="crm-sidebar-toggle-btn"
          onClick={toggleCollapse}
          title={isCollapsed ? t('sidebar.expandNav', 'Mở rộng thanh điều hướng') : t('sidebar.collapseNav', 'Thu gọn thanh điều hướng')}
          aria-label={isCollapsed ? t('sidebar.openSidebar', 'Mở rộng sidebar') : t('sidebar.closeSidebar', 'Thu gọn sidebar')}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {onCloseMobile && (
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={onCloseMobile}
            style={{ marginLeft: 'auto', display: isMobileOpen ? 'inline-flex' : undefined }}
            title={t('sidebar.closeMenu', 'Đóng menu')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Main Navigation Menu */}
      <div className="crm-sidebar-menu">
        <nav className="crm-nav-list">
          {mainNavItems.map((item) => {
            const isActive = effectiveTab === item.id;
            const targetHref = TAB_TO_ROUTE_MAP[item.id]?.(activeWorkspaceId) || '#';

            return (
              <a
                key={item.id}
                href={targetHref}
                className={`crm-nav-item ${isActive ? 'active' : ''} ${item.restricted ? 'nav-restricted' : ''}`}
                title={isCollapsed ? item.label : undefined}
                onClick={(e) => handleItemClick(e, item)}
                style={item.restricted ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <span className="crm-nav-icon">
                  {item.icon}
                  {item.id === 'inbox' && Boolean(unreadCount > 0) && (
                    <span
                      className="sidebar-unread-dot"
                      title={`${unreadCount} ${t('sidebar.unreadDotTitle', 'tin nhắn mới chưa đọc')}`}
                    />
                  )}
                </span>
                <span className="crm-nav-label">{item.label}</span>
                {Boolean(item.badgeCount) && (
                  <span className="unread-total-badge">
                    {item.badgeCount! > 99 ? '99+' : item.badgeCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
