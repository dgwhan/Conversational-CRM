import React from 'react';
import { useTranslation } from '../../i18n/index.js';
import type { NotificationCenterProps } from './types/notification.types.js';
import { useNotificationCenter } from './hooks/useNotificationCenter.js';
import {
  NotificationTrigger,
  NotificationHeader,
  NotificationTabs,
  NotificationEmptyState,
  NotificationItemRow,
} from './components/index.js';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateTab }) => {
  const { t, locale } = useTranslation();
  const {
    isOpen,
    setIsOpen,
    containerRef,
    notifications,
    filteredNotifications,
    unreadCount,
    filter,
    setFilter,
    isLoading,
    handleMarkAllAsRead,
    handleDeleteNotification,
    handleItemClick,
    handleAcceptInvite,
    handleDeclineInvite,
  } = useNotificationCenter(onNavigateTab);

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* 1. Icon Chuông thông báo trên Header */}
      <NotificationTrigger
        isOpen={isOpen}
        unreadCount={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
        title={t('header.notifications', 'Thông báo hệ thống')}
      />

      {/* 2. Popover Danh sách Thông báo */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col max-h-[520px] animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <NotificationHeader
            unreadCount={unreadCount}
            title={t('notifications.title', 'Trung tâm Thông báo')}
            subtitle={locale === 'en' ? 'Channels & conversations' : 'Kênh liên kết & hội thoại'}
            markAllReadLabel={t('notifications.markAllRead', 'Đọc tất cả')}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClose={() => setIsOpen(false)}
          />

          {/* Filter Tabs */}
          <NotificationTabs
            filter={filter}
            totalCount={notifications.length}
            unreadCount={unreadCount}
            allLabel={t('notifications.all', 'Tất cả')}
            unreadLabel={t('notifications.unread', 'Chưa đọc')}
            onFilterChange={setFilter}
          />

          {/* List items */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 bg-white">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                <div>{t('notifications.loadingList', 'Đang tải thông báo...')}</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <NotificationEmptyState
                isFilteredUnread={filter === 'UNREAD'}
                emptyAllText={t('notifications.emptyList', 'Không có thông báo nào')}
                emptyUnreadText={t('notifications.noUnread', 'Không có thông báo chưa đọc')}
              />
            ) : (
              filteredNotifications.map((item) => (
                <NotificationItemRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  t={t}
                  onItemClick={handleItemClick}
                  onDelete={handleDeleteNotification}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
