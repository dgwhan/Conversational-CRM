import { useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { MainLayout } from './layouts/index.js';
import { ErrorBoundary } from './app/ErrorBoundary.js';
import { I18nProvider } from './i18n/I18nContext.js';
import { ToastProvider } from './components/feedback/ToastContext.js';
import { ToastContainer } from './components/feedback/ToastContainer.js';
import { UserRoleProvider, useUserRole, WorkspaceAccessGuard } from './modules/auth/index.js';
import { RealtimeProvider } from './modules/realtime/RealtimeContext.js';
import { WorkspaceConfigProvider, useWorkspaceConfig } from './modules/workspace/WorkspaceConfigContext.js';
import { AuthPage } from './features/auth/pages/AuthPage.js';
import { AppSkeleton } from './components/ui/AppSkeleton.js';
import { HttpErrorPage } from './pages/errors/HttpErrorPage.js';
import { ROUTES, buildRoute } from './config/routes.js';
import type { LoginResponse } from './features/auth/types/auth.types.js';

// Lazy load CRM internal pages and components for high performance initial load
const LandingHomePage = lazy(() =>
  import('./modules/landing/pages/LandingHomePage.js').then((m) => ({ default: m.LandingHomePage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./modules/legal/pages/PrivacyPolicyPage.js').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsOfServicePage = lazy(() =>
  import('./modules/legal/pages/TermsOfServicePage.js').then((m) => ({ default: m.TermsOfServicePage }))
);
const UnifiedInboxPage = lazy(() =>
  import('./modules/inbox/pages/UnifiedInboxPage.js').then((m) => ({ default: m.UnifiedInboxPage }))
);
const AdmissionKanbanBoard = lazy(() =>
  import('./modules/kanban/AdmissionKanbanBoard.js').then((m) => ({ default: m.AdmissionKanbanBoard }))
);
const CalendarTasksPage = lazy(() =>
  import('./modules/calendar/pages/CalendarTasksPage.js').then((m) => ({ default: m.CalendarTasksPage }))
);
const ReportsDashboardPage = lazy(() =>
  import('./modules/reports/pages/ReportsDashboardPage.js').then((m) => ({ default: m.ReportsDashboardPage }))
);
const WorkspaceSettingsPage = lazy(() =>
  import('./modules/workspace/pages/WorkspaceSettingsPage.js').then((m) => ({ default: m.WorkspaceSettingsPage }))
);
const WorkspaceInvitationPage = lazy(() =>
  import('./modules/workspace/pages/WorkspaceInvitationPage.js').then((m) => ({ default: m.WorkspaceInvitationPage }))
);
const OnboardingWizardPage = lazy(() =>
  import('./modules/workspace/onboarding/pages/OnboardingWizardPage.js').then((m) => ({ default: m.OnboardingWizardPage }))
);
const MessagingImportPage = lazy(() =>
  import('./modules/messaging/pages/MessagingImportPage.js').then((m) => ({ default: m.MessagingImportPage }))
);
const Error404Page = lazy(() =>
  import('./pages/errors/Error404Page.js').then((m) => ({ default: m.Error404Page }))
);

/**
 * Route xác thực người dùng (Login / Sign Up)
 */
function AuthRoute() {
  const { isAuthenticated, login } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || ROUTES.REPORTS;

  const handleLoginSuccess = (session: LoginResponse) => {
    login(session);
    navigate(from, { replace: true });
  };

  if (isAuthenticated) {
    return <Navigate to={ROUTES.REPORTS} replace />;
  }

  return <AuthPage onLoginSuccess={handleLoginSuccess} />;
}

/**
 * Layout bọc cho các route yêu cầu đăng nhập (Protected Routes)
 */
function ProtectedLayout() {
  const { isAuthenticated } = useUserRole();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <MainLayout />;
}

/**
 * Route Hộp thư Hội thoại (hỗ trợ cả /inbox và /inbox/:conversationId)
 * Tăng cường bảo mật: Chặn path traversal & ký tự nguy hiểm trên ID
 */
function InboxRoute() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  if (conversationId && /[<>'"\\;`|\s]/.test(conversationId)) {
    return (
      <HttpErrorPage
        statusCode={403}
        errorLocation={`Route: /inbox/${conversationId}`}
        errorMessage="Từ chối quyền truy cập (403): Mã định danh cuộc hội thoại (Conversation ID) không hợp lệ hoặc chứa ký tự bị cấm."
        onGoHome={() => navigate(ROUTES.INBOX)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <UnifiedInboxPage
      initialConversationId={conversationId || null}
      onNavigateToKanban={() => navigate(ROUTES.KANBAN)}
      onNavigateToCalendar={() => navigate(ROUTES.CALENDAR)}
    />
  );
}

/**
 * Route Phễu Tuyển sinh Kanban
 */
function KanbanRoute() {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceConfig();

  return (
    <AdmissionKanbanBoard
      onOpenChat={(convId) => navigate(buildRoute.inbox(convId))}
      onNavigateToCalendar={() => navigate(ROUTES.CALENDAR)}
      onNavigateToSettings={() => navigate(buildRoute.workspaceSettings(activeWorkspaceId || 'default'))}
    />
  );
}

/**
 * Route Lịch biểu & Nhiệm vụ
 */
function CalendarRoute() {
  const navigate = useNavigate();

  return (
    <CalendarTasksPage
      onOpenChat={(convId) => navigate(buildRoute.inbox(convId))}
      onNavigateToKanban={() => navigate(ROUTES.KANBAN)}
    />
  );
}

/**
 * Route chuyển hướng tự động khi truy cập /workspace-settings không có id (Quản lý Cấu hình)
 */
function WorkspaceSettingsDefaultRoute() {
  const { activeWorkspaceId, myWorkspaces, isWorkspaceListLoading } = useWorkspaceConfig();

  if (isWorkspaceListLoading) {
    return <AppSkeleton />;
  }

  const targetId = activeWorkspaceId || myWorkspaces[0]?.id || myWorkspaces[0]?.slug;
  if (!targetId || targetId === 'undefined') {
    return <Navigate to={ROUTES.REPORTS} replace />;
  }

  return <Navigate to={buildRoute.workspaceSettings(targetId)} replace />;
}

/**
 * Route Không gian làm việc & Kết nối Kênh (Workspace)
 * Hỗ trợ cả /workspace và /workspace/:id (id hoặc slug)
 * Cho phép cả OWNER lẫn STAFF truy cập (không chặn 403)
 * Nếu vào sai ID/Slug workspace thì trả về 404 Not Found (không trả về 403)
 */
function WorkspaceRoute() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { myWorkspaces, isWorkspaceListLoading } = useWorkspaceConfig();

  // Kiểm tra nếu có :id trên URL mà user không thuộc workspace này -> trả 404 Not Found
  if (id && id !== 'undefined') {
    if (isWorkspaceListLoading) {
      return <AppSkeleton />;
    }
    const target = myWorkspaces.find((ws) => ws.id === id || ws.slug === id);
    if (!target) {
      return (
        <HttpErrorPage
          statusCode={404}
          errorLocation="Workspace Security Guard"
          errorMessage="Không tìm thấy Không gian làm việc hoặc bạn không có quyền truy cập."
          onGoHome={() => navigate(ROUTES.WORKSPACE_DEFAULT)}
          onRetry={() => window.location.reload()}
        />
      );
    }
  }

  return (
    <OnboardingWizardPage
      onComplete={() => navigate(ROUTES.INBOX)}
      onSkipToInbox={() => navigate(ROUTES.INBOX)}
    />
  );
}

/**
 * Chuyển hướng các route /onboarding cũ về /workspace
 */
function WorkspaceRouteRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={buildRoute.workspace(id)} replace />;
}

/**
 * Tự động cuộn trang lên đầu khi chuyển route (đặc biệt khi vào /privacy, /terms hoặc /home)
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
}

/**
 * Component xử lý Route tập trung của CRM
 */
function CRMAppRoutes() {
  const navigate = useNavigate();

  // Bắt callback từ popup OAuth Meta / Zalo nếu cửa sổ này được mở dạng popup
  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener && window.location.search.includes('code=')) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code) {
        window.opener.postMessage(
          { type: 'OAUTH_CALLBACK', code, state },
          window.location.origin
        );
        window.close();
      }
    }
  }, []);

  return (
    <>
      <ScrollToTop />
      <ToastContainer />
      <Suspense fallback={<AppSkeleton />}>
        <Routes>
          {/* 1. Trang công khai: Giới thiệu & Pháp lý */}
          <Route path={ROUTES.LANDING} element={<LandingHomePage />} />
          <Route path={ROUTES.HOME} element={<LandingHomePage />} />
          <Route path={ROUTES.PRIVACY} element={<PrivacyPolicyPage />} />
          <Route path={ROUTES.TERMS} element={<TermsOfServicePage />} />

          {/* 2. Routes Xác thực */}
          <Route path={ROUTES.LOGIN} element={<AuthRoute />} />
          <Route path={ROUTES.AUTH} element={<Navigate to={ROUTES.LOGIN} replace />} />

          {/* 3. Routes Ứng dụng chính (Được bảo vệ bởi ProtectedLayout) */}
          <Route element={<ProtectedLayout />}>
            <Route path={ROUTES.REPORT} element={<Navigate to={ROUTES.REPORTS} replace />} />

            {/* Báo cáo thống kê */}
            <Route path={ROUTES.REPORTS} element={<ReportsDashboardPage />} />

            {/* Hộp thư hội thoại trực tiếp */}
            <Route path={ROUTES.INBOX} element={<InboxRoute />} />
            <Route path={ROUTES.INBOX_CONVERSATION} element={<InboxRoute />} />

            {/* Phễu tuyển sinh Kanban */}
            <Route path={ROUTES.KANBAN} element={<KanbanRoute />} />

            {/* Lịch biểu & Nhiệm vụ */}
            <Route path={ROUTES.CALENDAR} element={<CalendarRoute />} />

            {/* Quản lý Cấu hình Không gian làm việc (Workspace Settings) - BẢO VỆ CHỐNG BROKEN ACCESS CONTROL BẰNG WorkspaceAccessGuard */}
            <Route path={ROUTES.WORKSPACE_SETTINGS_DEFAULT} element={<WorkspaceSettingsDefaultRoute />} />
            <Route
              path={ROUTES.WORKSPACE_SETTINGS}
              element={
                <WorkspaceAccessGuard requireOwner={true}>
                  <WorkspaceSettingsPage />
                </WorkspaceAccessGuard>
              }
            />

            {/* Trang Chấp nhận Lời mời riêng biệt (ID lời mời riêng - scope độc lập với Workspace) */}
            <Route path={ROUTES.WORKSPACE_INVITED} element={<WorkspaceInvitationPage />} />

            {/* Quản lý Không gian làm việc & Kết nối Kênh (/workspace và /workspace/:id) */}
            <Route path={ROUTES.WORKSPACE_DEFAULT} element={<WorkspaceRoute />} />
            <Route path={ROUTES.WORKSPACE} element={<WorkspaceRoute />} />

            {/* Chuyển hướng các route /onboarding cũ về /workspace */}
            <Route path={ROUTES.ONBOARDING} element={<Navigate to={ROUTES.WORKSPACE_DEFAULT} replace />} />
            <Route path={ROUTES.ONBOARDING_DETAIL} element={<WorkspaceRouteRedirect />} />
            <Route path={ROUTES.IMPORT} element={<MessagingImportPage />} />
          </Route>

          {/* 3. Trang 404 Not Found */}
          <Route
            path={ROUTES.NOT_FOUND}
            element={
              <Error404Page
                onGoHome={() => navigate(ROUTES.REPORTS)}
                onGoBack={() => navigate(-1)}
              />
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ToastProvider>
          <UserRoleProvider>
            <RealtimeProvider>
              <WorkspaceConfigProvider>
                <BrowserRouter>
                  <CRMAppRoutes />
                </BrowserRouter>
              </WorkspaceConfigProvider>
            </RealtimeProvider>
          </UserRoleProvider>
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
