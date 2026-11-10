import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import '../App.css';
import { Sidebar, type ActiveNavTab } from '../app/Sidebar.js';
import { HeaderLayout } from './HeaderLayout.js';
import { getTabFromPathname } from '../config/routes.js';

export interface MainLayoutProps {
  children?: React.ReactNode;
  currentTab?: ActiveNavTab;
  onTabChange?: (tab: ActiveNavTab) => void;
  onApiUrlChange?: (newUrl: string) => void;
  headerTitle?: string;
  headerExtraActions?: React.ReactNode;
}

/**
 * Layout chính của CRM (Sidebar + HeaderLayout + Content Viewport).
 * Hỗ trợ cả hai chế độ:
 * 1. React Router Outlet (Route-based)
 * 2. Children props (Component-based)
 */
export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentTab,
  onTabChange,
  onApiUrlChange,
  headerTitle,
  headerExtraActions,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Xác định tab hiện tại từ props hoặc tự động nhận diện từ URL route
  const effectiveTab = currentTab || getTabFromPathname(location.pathname);

  return (
    <div className="crm-app-container">
      {/* Overlay mờ khi mở menu trên mobile */}
      <div
        className={`crm-sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* 1. Thanh Menu Điều Hướng Bên Trái (Sidebar) */}
      <Sidebar
        currentTab={effectiveTab}
        onTabChange={(tab) => {
          onTabChange?.(tab);
          setIsMobileSidebarOpen(false);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Khung Viewport Chính: Gồm HeaderLayout và Main Content */}
      <div className="crm-main-viewport">
        <HeaderLayout
          currentTab={effectiveTab}
          onTabChange={onTabChange}
          onApiUrlChange={onApiUrlChange}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          title={headerTitle}
          extraActions={headerExtraActions}
        />

        <main
          className={`crm-content-area ${
            effectiveTab === 'inbox'
              ? 'pancake-fullscreen !p-0 !overflow-hidden flex flex-col flex-1 h-full min-h-0'
              : ''
          }`}
        >
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
