import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getDefaultLandingPath } from '@/lib/permissionMeta';

export default function AdminRoute() {
  const { user, isLoadingAuth, hasPermission } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPermission('admin_panel', 'access')) {
    return <Navigate to={getDefaultLandingPath(hasPermission)} replace />;
  }

  if (user?.needsPasswordSetup) {
    return <Navigate to="/accept-invite" replace />;
  }

  return <Outlet />;
}
