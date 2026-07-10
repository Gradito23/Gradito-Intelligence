import { useAuth } from '@/lib/AuthContext';

export function usePermission(resource, action) {
  const { hasPermission } = useAuth();
  return hasPermission(resource, action);
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}
