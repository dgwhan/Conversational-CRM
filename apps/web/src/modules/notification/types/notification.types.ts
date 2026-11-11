import type { ReactNode } from 'react';
import type { ActiveNavTab } from '../../../app/Sidebar.js';

export interface NotificationCenterProps {
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

export type NotificationFilter = 'ALL' | 'UNREAD';

export interface SeverityBadgeConfig {
  icon: ReactNode;
  bg: string;
  badgeClass: string;
  label: string;
}

