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

export function permissionKey(resource, action) {
  return `${resource}:${action}`;
}

export function parsePermissionKey(key) {
  const [resource, action] = key.split(':');
  return { resource, action };
}
