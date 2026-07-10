import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Chefs from '@/pages/Chefs';
import Events from '@/pages/Events';
import ChefMatch from '@/pages/ChefMatch';
import Reports from '@/pages/Reports';
import ActivityLog from '@/pages/ActivityLog';
import ChefIntake from '@/pages/ChefIntake';
import BulkUpload from '@/pages/BulkUpload';
import DataHealth from '@/pages/DataHealth';
import Profitability from '@/pages/Profitability';
import Team from '@/pages/Team';
import Profile from '@/pages/Profile';
import AdminRoute from '@/components/AdminRoute';
import AdminPanelLayout from '@/components/admin/AdminPanelLayout';
import IntegrationsHub from '@/pages/admin/IntegrationsHub';
import EmailIntegration from '@/pages/admin/EmailIntegration';
import UserManagementHub from '@/pages/admin/UserManagementHub';
import UsersList from '@/pages/admin/UsersList';
import RolesList from '@/pages/admin/RolesList';
import PermissionsMatrix from '@/pages/admin/PermissionsMatrix';
import ComingSoonPage from '@/pages/admin/ComingSoonPage';
import ConfigCrudPage from '@/pages/admin/ConfigCrudPage';
import AcceptInvite from '@/pages/AcceptInvite';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-navy tracking-wide mb-4">GRADITO</h1>
          <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/intake" element={<ChefIntake />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Chefs />} />
          <Route path="/events" element={<Events />} />
          <Route path="/match" element={<ChefMatch />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profitability" element={<Profitability />} />

          <Route path="/team" element={<Navigate to="/admin/team" replace />} />
          <Route path="/data-health" element={<Navigate to="/admin/data-health" replace />} />
          <Route path="/activity" element={<Navigate to="/admin/activity" replace />} />
          <Route path="/bulk-upload" element={<Navigate to="/admin/bulk-upload" replace />} />
          <Route path="/users" element={<Navigate to="/admin/users" replace />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanelLayout />}>
              <Route index element={<Navigate to="/admin/reference-data/service-areas" replace />} />
              <Route path="team" element={<Team />} />
              <Route path="data-health" element={<DataHealth />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="bulk-upload" element={<BulkUpload />} />
              <Route path="integrations" element={<IntegrationsHub />} />
              <Route path="integrations/email" element={<EmailIntegration />} />
              <Route
                path="integrations/ai"
                element={(
                  <ComingSoonPage
                    title="OpenAI"
                    description="Connect OpenAI API for AI-assisted workflows."
                    backTo="/admin/integrations"
                    backLabel="Integrations"
                  />
                )}
              />
              <Route path="users" element={<UserManagementHub />} />
              <Route path="users/list" element={<UsersList />} />
              <Route path="users/roles" element={<RolesList />} />
              <Route path="users/permissions" element={<PermissionsMatrix />} />
              <Route path="reference-data/:configType" element={<ConfigCrudPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

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
