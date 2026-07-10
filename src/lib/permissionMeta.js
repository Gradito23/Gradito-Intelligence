/** Single source for permission matrix resources and actions. */

export const PERMISSION_ACTIONS = ['read', 'write', 'access'];

export const PERMISSION_RESOURCES = [
  { key: 'config', label: 'Reference Data', actions: ['read', 'write'] },
  { key: 'users', label: 'Users', actions: ['read', 'write'] },
  { key: 'chefs', label: 'Chefs', actions: ['read', 'write'] },
  { key: 'events', label: 'Events', actions: ['read', 'write'] },
  { key: 'team', label: 'Team', actions: ['read', 'write'] },
  { key: 'reports', label: 'Reports', actions: ['read'] },
  { key: 'integrations', label: 'Integrations', actions: ['read', 'write'] },
  { key: 'admin_panel', label: 'Admin Panel', actions: ['access'] },
];

/** null permission = any authenticated user */
export const LANDING_ROUTE_CANDIDATES = [
  { path: '/dashboard', permission: null },
  { path: '/', permission: { resource: 'chefs', action: 'read' } },
  { path: '/events', permission: { resource: 'events', action: 'read' } },
  { path: '/match', permission: { resource: 'chefs', action: 'read' } },
  { path: '/reports', permission: { resource: 'reports', action: 'read' } },
  { path: '/profitability', permission: { resource: 'reports', action: 'read' } },
];

export function permissionKey(resource, action) {
  return `${resource}:${action}`;
}

export function parsePermissionKey(key) {
  const [resource, action] = key.split(':');
  return { resource, action };
}

export function getDefaultLandingPath(hasPermission) {
  for (const candidate of LANDING_ROUTE_CANDIDATES) {
    if (!candidate.permission) return candidate.path;
    const { resource, action } = candidate.permission;
    if (hasPermission(resource, action)) return candidate.path;
  }
  return '/dashboard';
}

export function checkPermission(hasPermission, permission) {
  if (!permission) return true;
  return hasPermission(permission.resource, permission.action);
}
