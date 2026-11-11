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

  // Danh sách khách hàng tiềm năng (Leads)
  LEADS: '/leads',

  // Phễu Tuyển sinh (Kanban Board)
  KANBAN: '/kanban',

  // Lịch biểu & Nhiệm vụ (Calendar & Tasks)
  CALENDAR: '/calendar',

  // Quản lý Đợt Tuyển Sinh & Lịch Sử Dịch Vụ (Dedicated Deals & Intake Management)
  DEALS: '/deals',

  // Quản lý Không gian làm việc & Kết nối Kênh (Workspace & Onboarding)
  WORKSPACE: '/workspace/:id',
  WORKSPACE_DEFAULT: '/workspace',
  WORKSPACE_INVITED: '/workspace/invited/:id',

  // Quản lý Cấu hình Không gian làm việc (Workspace Settings)
  WORKSPACE_SETTINGS: '/workspace-settings/:id',
  WORKSPACE_SETTINGS_DEFAULT: '/workspace-settings',

  // Hỗ trợ chuyển hướng từ các route /onboarding cũ về /workspace
  ONBOARDING: '/onboarding',
  ONBOARDING_DETAIL: '/onboarding/:id',

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
  leads: () => ROUTES.LEADS,
  kanban: () => ROUTES.KANBAN,
  calendar: () => ROUTES.CALENDAR,
  deals: (search?: string) =>
    search ? `/deals?search=${encodeURIComponent(search)}` : ROUTES.DEALS,
  workspace: (id?: string | number | null) =>
    id && id !== 'undefined' ? `/workspace/${encodeURIComponent(id)}` : ROUTES.WORKSPACE_DEFAULT,
  workspaceInvited: (id: string | number) =>
    `/workspace/invited/${encodeURIComponent(id)}`,
  workspaceSettings: (id?: string | number | null) =>
    id && id !== 'undefined' ? `/workspace-settings/${encodeURIComponent(id)}` : ROUTES.WORKSPACE_SETTINGS_DEFAULT,
  onboarding: (idOrSlug?: string | number | null) =>
    idOrSlug && idOrSlug !== 'undefined' ? `/workspace/${encodeURIComponent(idOrSlug)}` : ROUTES.WORKSPACE_DEFAULT,
  import: () => ROUTES.IMPORT,
  login: () => ROUTES.LOGIN,
};

/**
 * Ánh xạ giữa ActiveNavTab và URL route tương ứng
 */
export const TAB_TO_ROUTE_MAP: Record<string, (workspaceId?: string) => string> = {
  reports: () => ROUTES.REPORTS,
  inbox: () => ROUTES.INBOX,
  leads: () => ROUTES.LEADS,
  kanban: () => ROUTES.KANBAN,
  calendar: () => ROUTES.CALENDAR,
  deals: () => ROUTES.DEALS,
  'workspace-settings': (workspaceId) =>
    workspaceId && workspaceId !== 'undefined' ? buildRoute.workspaceSettings(workspaceId) : ROUTES.WORKSPACE_SETTINGS_DEFAULT,
  onboarding: (workspaceId) =>
    workspaceId && workspaceId !== 'undefined' ? buildRoute.workspace(workspaceId) : ROUTES.WORKSPACE_DEFAULT,
  import: () => ROUTES.IMPORT,
};

/**
 * Suy ra ActiveNavTab dựa trên pathname hiện tại của trình duyệt
 */
export function getTabFromPathname(pathname: string): 'inbox' | 'leads' | 'kanban' | 'calendar' | 'deals' | 'reports' | 'onboarding' | 'import' | 'workspace-settings' {
  if (pathname.startsWith('/inbox')) return 'inbox';
  if (pathname.startsWith('/leads')) return 'leads';
  if (pathname.startsWith('/kanban')) return 'kanban';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/deals')) return 'deals';
  if (pathname.startsWith('/workspace-settings')) return 'workspace-settings';
  if (pathname.startsWith('/workspace') || pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.startsWith('/import')) return 'import';
  if (pathname.startsWith('/reports') || pathname.startsWith('/report') || pathname.startsWith('/home')) {
    return 'reports';
  }
  return 'reports';
}
