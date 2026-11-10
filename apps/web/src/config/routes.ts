/**
 * ============================================================================
 * CUSC RECRUITMENT CRM - CENTRALIZED ROUTES CONFIGURATION
 * Định nghĩa tập trung toàn bộ route điều hướng của ứng dụng Web.
 * ============================================================================
 */

export const ROUTES = {
  // Trang giới thiệu sản phẩm (Landing / Home)
  LANDING: '/',
  HOME: '/home',

  // Văn bản pháp lý (Legal Documents)
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Trang chủ quản trị & Báo cáo thống kê (CRM Internal Dashboard)
  REPORTS: '/reports',
  REPORT: '/report', // Alias chuyển hướng về /reports

  // Hộp thư Hội thoại trực tiếp (Unified Inbox)
  INBOX: '/inbox',
  INBOX_CONVERSATION: '/inbox/:conversationId',

  // Phễu Tuyển sinh (Kanban Board)
  KANBAN: '/kanban',

  // Lịch biểu & Nhiệm vụ (Calendar & Tasks)
  CALENDAR: '/calendar',

  // Quản lý Cấu hình Không gian làm việc (Workspace)
  WORKSPACE: '/workspace/:id',
  WORKSPACE_DEFAULT: '/workspace',

  // Quy trình Kết nối Kênh (Onboarding)
  ONBOARDING: '/onboarding',

  // Nhập Dữ liệu Đa kênh (Import)
  IMPORT: '/import',

  // Xác thực người dùng (Login / Sign Up)
  LOGIN: '/login',
  AUTH: '/auth',

  // Trang lỗi & Fallback
  ERROR_404: '/404',
  NOT_FOUND: '*',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

/**
 * Helper xây dựng URL điều hướng động có truyền params
 */
export const buildRoute = {
  landing: () => ROUTES.LANDING,
  home: () => ROUTES.HOME,
  privacy: () => ROUTES.PRIVACY,
  terms: () => ROUTES.TERMS,
  reports: () => ROUTES.REPORTS,
  inbox: (conversationId?: string | null) =>
    conversationId ? `/inbox/${encodeURIComponent(conversationId)}` : ROUTES.INBOX,
  kanban: () => ROUTES.KANBAN,
  calendar: () => ROUTES.CALENDAR,
  workspace: (id: string | number) => `/workspace/${encodeURIComponent(id)}`,
  onboarding: () => ROUTES.ONBOARDING,
  import: () => ROUTES.IMPORT,
  login: () => ROUTES.LOGIN,
};

/**
 * Ánh xạ giữa ActiveNavTab và URL route tương ứng
 */
export const TAB_TO_ROUTE_MAP: Record<string, (workspaceId?: string) => string> = {
  reports: () => ROUTES.REPORTS,
  inbox: () => ROUTES.INBOX,
  kanban: () => ROUTES.KANBAN,
  calendar: () => ROUTES.CALENDAR,
  'workspace-settings': (workspaceId) =>
    workspaceId ? buildRoute.workspace(workspaceId) : ROUTES.WORKSPACE_DEFAULT,
  onboarding: () => ROUTES.ONBOARDING,
  import: () => ROUTES.IMPORT,
};

/**
 * Suy ra ActiveNavTab dựa trên pathname hiện tại của trình duyệt
 */
export function getTabFromPathname(pathname: string): 'inbox' | 'kanban' | 'calendar' | 'reports' | 'onboarding' | 'import' | 'workspace-settings' {
  if (pathname.startsWith('/inbox')) return 'inbox';
  if (pathname.startsWith('/kanban')) return 'kanban';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/workspace')) return 'workspace-settings';
  if (pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.startsWith('/import')) return 'import';
  if (pathname.startsWith('/reports') || pathname.startsWith('/report') || pathname.startsWith('/home')) {
    return 'reports';
  }
  return 'reports';
}
