import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute, { PermissionRoute } from '@/components/ProtectedRoute';
import PageSkeleton from '@/components/PageSkeleton';
import AdminRoute from '@/components/AdminRoute';
import GraditoLogo from '@/components/brand/GraditoLogo';

const PageNotFound = lazy(() => import('@/lib/PageNotFound'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'));
const ChefIntake = lazy(() => import('@/pages/ChefIntake'));
const GuideRedirect = lazy(() => import('@/pages/GuideRedirect'));

const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Chefs = lazy(() => import('@/pages/Chefs'));
const IntakeRequests = lazy(() => import('@/pages/IntakeRequests'));
const Events = lazy(() => import('@/pages/Events'));
const ChefMatch = lazy(() => import('@/pages/ChefMatch'));
const Reports = lazy(() => import('@/pages/Reports'));
const Profitability = lazy(() => import('@/pages/Profitability'));
const Profile = lazy(() => import('@/pages/Profile'));
const AdminPanelLayout = lazy(() => import('@/components/admin/AdminPanelLayout'));
const Team = lazy(() => import('@/pages/Team'));
const DataHealth = lazy(() => import('@/pages/DataHealth'));
const ActivityLog = lazy(() => import('@/pages/ActivityLog'));
const BulkUpload = lazy(() => import('@/pages/BulkUpload'));
const IntegrationsHub = lazy(() => import('@/pages/admin/IntegrationsHub'));
const EmailIntegration = lazy(() => import('@/pages/admin/EmailIntegration'));
const UserManagementHub = lazy(() => import('@/pages/admin/UserManagementHub'));
const UsersList = lazy(() => import('@/pages/admin/UsersList'));
const RolesList = lazy(() => import('@/pages/admin/RolesList'));
const PermissionsMatrix = lazy(() => import('@/pages/admin/PermissionsMatrix'));
const OpenAIIntegration = lazy(() => import('@/pages/admin/OpenAIIntegration'));
const GoogleSSOIntegration = lazy(() => import('@/pages/admin/GoogleSSOIntegration'));
const ConfigCrudPage = lazy(() => import('@/pages/admin/ConfigCrudPage'));
const UserGuide = lazy(() => import('@/pages/admin/UserGuide'));

const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/intake',
]);

function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="flex justify-center text-navy mb-4">
          <GraditoLogo className="h-8 w-auto" title="Gradito" />
        </div>
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}

function InviteHashRedirect() {
  useEffect(() => {
    if (
      window.location.hash.includes('type=invite')
      && !window.location.pathname.startsWith('/accept-invite')
    ) {
      window.location.replace(`/accept-invite${window.location.hash}`);
    }
  }, []);
  return null;
}

function AuthenticatedApp() {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isPublicRoute = PUBLIC_PATHS.has(location.pathname)
    || location.pathname.startsWith('/guide/');

  if (isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return <FullPageSpinner />;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  const suspenseFallback = isPublicRoute ? <FullPageSpinner /> : <PageSkeleton />;

  return (
    <>
      <InviteHashRedirect />
      <Suspense fallback={suspenseFallback}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/intake" element={<ChefIntake />} />
          <Route path="/guide/:token" element={<GuideRedirect />} />

          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={(
                  <PermissionRoute permission={null}>
                    <Dashboard />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/profile"
                element={(
                  <PermissionRoute permission={null}>
                    <Profile />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/chefs"
                element={(
                  <PermissionRoute permission={{ resource: 'chefs', action: 'read' }}>
                    <Chefs />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/intake-requests"
                element={(
                  <PermissionRoute permission={{ resource: 'intake', action: 'read' }}>
                    <IntakeRequests />
                  </PermissionRoute>
                )}
              />
              <Route path="/" element={<Navigate to="/chefs" replace />} />
              <Route
                path="/events"
                element={(
                  <PermissionRoute permission={{ resource: 'events', action: 'read' }}>
                    <Events />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/match"
                element={(
                  <PermissionRoute permission={{ resource: 'chefs', action: 'read' }}>
                    <ChefMatch />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/reports"
                element={(
                  <PermissionRoute permission={{ resource: 'reports', action: 'read' }}>
                    <Reports />
                  </PermissionRoute>
                )}
              />
              <Route
                path="/profitability"
                element={(
                  <PermissionRoute permission={{ resource: 'reports', action: 'read' }}>
                    <Profitability />
                  </PermissionRoute>
                )}
              />

              <Route path="/team" element={<Navigate to="/admin/commission-team" replace />} />
              <Route path="/admin/team" element={<Navigate to="/admin/commission-team" replace />} />
              <Route path="/data-health" element={<Navigate to="/admin/data-health" replace />} />
              <Route path="/activity" element={<Navigate to="/admin/activity" replace />} />
              <Route path="/bulk-upload" element={<Navigate to="/admin/bulk-upload" replace />} />
              <Route path="/users" element={<Navigate to="/admin/users" replace />} />

              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPanelLayout />}>
                  <Route index element={<Navigate to="/admin/users" replace />} />
                  <Route
                    path="commission-team"
                    element={(
                      <PermissionRoute permission={{ resource: 'team', action: 'read' }}>
                        <Team />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="data-health"
                    element={(
                      <PermissionRoute permission={{ resource: 'chefs', action: 'read' }}>
                        <DataHealth />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="activity"
                    element={(
                      <PermissionRoute permission={{ resource: 'team', action: 'read' }}>
                        <ActivityLog />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="bulk-upload"
                    element={(
                      <PermissionRoute permission={{ resource: 'chefs', action: 'write' }}>
                        <BulkUpload />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="user-guide"
                    element={(
                      <PermissionRoute permission={{ resource: 'config', action: 'read' }}>
                        <UserGuide />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="integrations"
                    element={(
                      <PermissionRoute permission={{ resource: 'integrations', action: 'read' }}>
                        <IntegrationsHub />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="integrations/email"
                    element={(
                      <PermissionRoute permission={{ resource: 'integrations', action: 'read' }}>
                        <EmailIntegration />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="integrations/ai"
                    element={(
                      <PermissionRoute permission={{ resource: 'integrations', action: 'read' }}>
                        <OpenAIIntegration />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="integrations/google-sso"
                    element={(
                      <PermissionRoute permission={{ resource: 'integrations', action: 'read' }}>
                        <GoogleSSOIntegration />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="users"
                    element={(
                      <PermissionRoute permission={{ resource: 'users', action: 'read' }}>
                        <UserManagementHub />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="users/list"
                    element={(
                      <PermissionRoute permission={{ resource: 'users', action: 'read' }}>
                        <UsersList />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="users/roles"
                    element={(
                      <PermissionRoute permission={{ resource: 'users', action: 'read' }}>
                        <RolesList />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="users/permissions"
                    element={(
                      <PermissionRoute permission={{ resource: 'users', action: 'read' }}>
                        <PermissionsMatrix />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="reference-data/:configType"
                    element={(
                      <PermissionRoute permission={{ resource: 'config', action: 'read' }}>
                        <ConfigCrudPage />
                      </PermissionRoute>
                    )}
                  />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
