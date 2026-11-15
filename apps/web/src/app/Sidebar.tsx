import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  BarChart3,
  Layers,
  LayoutGrid,
  Calendar,
  GraduationCap,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTranslation } from '../i18n/index.js';
import { useRealtime } from '../modules/realtime/RealtimeContext.js';
import { useWorkspaceConfig } from '../modules/workspace/WorkspaceConfigContext.js';
import { notify } from '../components/feedback/toastEmitter.js';
import { TAB_TO_ROUTE_MAP, getTabFromPathname } from '../config/routes.js';

export type ActiveNavTab =
  | 'inbox'
  | 'leads'
  | 'kanban'
  | 'calendar'
  | 'deals'
  | 'reports'
  | 'onboarding'
  | 'workspace-settings';

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
  const location = useLocation();
  const navigate = useNavigate();

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

  interface NavItem {
    id: ActiveNavTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badgeCount?: number;
    restricted?: boolean;
  }

  const resolvedPipelineLabel =
    (config.terminology.pipelineName || t('header.kanbanTab', 'Phễu Tuyển sinh'))
      .replace(/\s*(CUSC|PolarisX)/gi, '')
      .trim() || t('header.kanbanTab', 'Phễu Tuyển sinh');

  const mainNavItems: NavItem[] = [
    {
      id: 'reports',
      label: t('nav.reportsStats'),
      shortLabel: 'Báo cáo',
      icon: <BarChart3 size={18} strokeWidth={1.85} />,
    },
    {
      id: 'inbox',
      label: t('nav.liveInbox'),
      shortLabel: 'Hộp thư',
      icon: <MessageSquare size={18} strokeWidth={1.85} />,
      badgeCount: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'leads',
      label: t('nav.leadsList', 'Danh sách Lead'),
      shortLabel: 'Lead',
      icon: <Users size={18} strokeWidth={1.85} />,
    },
    {
      id: 'kanban',
      label: resolvedPipelineLabel,
      shortLabel: 'Tuyển sinh',
      icon: <LayoutGrid size={18} strokeWidth={1.85} />,
    },
    {
      id: 'calendar',
      label: t('nav.calendarTasks', 'Lịch biểu & Nhiệm vụ'),
      shortLabel: 'Lịch biểu',
      icon: <Calendar size={18} strokeWidth={1.85} />,
    },
    {
      id: 'deals',
      label: t('nav.deals', 'Lịch Sử & Đợt Tuyển Sinh'),
      shortLabel: 'Đợt TS',
      icon: <GraduationCap size={18} strokeWidth={1.85} />,
    },
    {
      id: 'onboarding',
      label: t('nav.onboarding'),
      shortLabel: 'Không gian',
      icon: <Layers size={18} strokeWidth={1.85} />,
    },
  ];

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    e.preventDefault();
    if (item.restricted) {
      notify.warning(
        t(
          'sidebar.restrictedAgentMsg',
          'Bạn đang ở vai trò Tư vấn viên (Agent). Tính năng này chỉ dành cho Chủ doanh nghiệp (Owner).'
        ),
        t('sidebar.restrictedTitle', 'Hạn chế Quyền hạn')
      );
      return;
    }

    const targetRoute = TAB_TO_ROUTE_MAP[item.id]?.(activeWorkspaceId) || '/reports';
    navigate(targetRoute);

    onTabChange?.(item.id);
    onCloseMobile?.();
  };

  return (
    <aside
      className={`crm-sidebar ${isCollapsed ? 'collapsed !w-[74px] !min-w-[74px] !max-w-[74px]' : '!w-[232px] !min-w-[232px] !max-w-[232px]'} ${isMobileOpen ? 'mobile-open' : ''
        } !bg-slate-50/70 !border-r !border-slate-200 flex flex-col h-full shrink-0 select-none transition-all duration-200`}
    >
      {/* Brand Header */}
      <div
        className={`crm-sidebar-brand ${isCollapsed ? 'collapsed !justify-center !px-2' : '!justify-between !px-3.5'} !h-12 !border-b !border-slate-200/80 flex items-center shrink-0`}
      >
        {!isCollapsed && (
          <div className="crm-brand-text min-w-0">
            <span className="crm-brand-title !text-[13.5px] !font-semibold !text-slate-950 tracking-tight truncate block">
              Conversational CRM
            </span>
          </div>
        )}

        <button
          type="button"
          className="crm-sidebar-toggle-btn !w-7 !h-7 inline-flex items-center justify-center !rounded-md !text-slate-500 hover:!text-slate-950 hover:!bg-slate-200/60 !border-0 !shadow-none !bg-transparent transition-colors cursor-pointer"
          onClick={toggleCollapse}
          title={
            isCollapsed
              ? t('sidebar.expandNav', 'Mở rộng thanh điều hướng')
              : t('sidebar.collapseNav', 'Thu gọn thanh điều hướng')
          }
          aria-label={
            isCollapsed
              ? t('sidebar.openSidebar', 'Mở rộng sidebar')
              : t('sidebar.closeSidebar', 'Thu gọn sidebar')
          }
        >
          {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
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
      <div className={`crm-sidebar-menu flex-1 overflow-y-auto ${isCollapsed ? '!px-1.5 !py-2.5' : '!px-2.5 !py-2.5'}`}>
        <nav className={`crm-nav-list flex flex-col ${isCollapsed ? '!gap-1' : '!gap-0.5'}`}>
          {mainNavItems.map((item) => {
            const isActive = effectiveTab === item.id;
            const targetHref = TAB_TO_ROUTE_MAP[item.id]?.(activeWorkspaceId) || '#';

            return (
              <a
                key={item.id}
                href={targetHref}
                className={`crm-nav-item group relative !border-0 !shadow-none transition-colors no-underline ${item.restricted ? 'nav-restricted opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${isCollapsed
                    ? '!flex !flex-col !items-center !justify-center !gap-1 !px-1 !py-2 !rounded-lg'
                    : '!flex !flex-row !items-center !gap-2.5 !px-2.5 !py-2 !rounded-lg'
                  } ${isActive
                    ? 'active !bg-blue-50 !text-blue-700'
                    : '!bg-transparent !text-slate-700 hover:!bg-slate-200/55 hover:!text-slate-950'
                  }`}
                title={isCollapsed ? item.label : undefined}
                onClick={(e) => handleItemClick(e, item)}
              >
                {/* Icon + Badge thông báo tin nhắn chưa đọc */}
                <span
                  className={`crm-nav-icon relative inline-flex items-center justify-center shrink-0 ${isActive
                      ? '!text-blue-600'
                      : '!text-slate-500 group-hover:!text-slate-900'
                    }`}
                >
                  {item.icon}
                  {Boolean(item.badgeCount) && isCollapsed && (
                    <span
                      className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-semibold inline-flex items-center justify-center leading-none tabular-nums ring-2 ring-slate-50"
                      title={`${item.badgeCount} ${t('sidebar.unreadDotTitle', 'tin nhắn mới chưa đọc')}`}
                    >
                      {item.badgeCount! > 99 ? '99+' : item.badgeCount}
                    </span>
                  )}
                </span>

                {/* Nhãn menu: Hiển thị text sub đen nhỏ khi thu gọn, nhãn đầy đủ khi mở rộng */}
                {isCollapsed ? (
                  <span
                    className={`!block !w-full !text-center !text-[10px] !leading-[1.15] truncate ${isActive
                        ? '!font-semibold !text-blue-700'
                        : '!font-medium !text-slate-950'
                      }`}
                  >
                    {item.shortLabel}
                  </span>
                ) : (
                  <>
                    <span
                      className={`crm-nav-label flex-1 !text-[13px] truncate ${isActive
                          ? '!font-semibold !text-blue-700'
                          : '!font-medium !text-slate-800 group-hover:!text-slate-950'
                        }`}
                    >
                      {item.label}
                    </span>

                    {Boolean(item.badgeCount) && (
                      <span className="unread-total-badge !ml-auto !px-1.5 !py-0.5 !text-[10.5px] !font-semibold !rounded-full !bg-blue-600 !text-white leading-none tabular-nums">
                        {item.badgeCount! > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  </>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};