import {
  Activity,
  Calendar,
  HeartPulse,
  Plug,
  Settings2,
  Upload,
  Users,
} from 'lucide-react';
import { CONFIG_TYPE_LIST } from '@/lib/configMeta';

const CONFIG_NAV_ICONS = {
  Calendar,
};

export const ADMIN_NAV_SECTIONS = [
  {
    label: 'Platform Operations',
    icon: Users,
    items: [
      { path: '/admin/commission-team', label: 'Commission Team', icon: Users, permission: { resource: 'team', action: 'read' } },
      { path: '/admin/data-health', label: 'Data Health', icon: HeartPulse, badgeKey: 'dataHealth', permission: { resource: 'chefs', action: 'read' } },
      { path: '/admin/activity', label: 'Activity Log', icon: Activity, permission: { resource: 'team', action: 'read' } },
      { path: '/admin/bulk-upload', label: 'Bulk Upload', icon: Upload, permission: { resource: 'chefs', action: 'write' } },
    ],
  },
  {
    label: 'Integrations',
    icon: Plug,
    items: [
      { path: '/admin/integrations', label: 'Overview', icon: Plug, permission: { resource: 'integrations', action: 'read' } },
      { path: '/admin/integrations/email', label: 'Email', icon: Plug, permission: { resource: 'integrations', action: 'read' } },
      { path: '/admin/integrations/ai', label: 'OpenAI', permission: { resource: 'integrations', action: 'read' } },
      { path: '/admin/integrations/google-sso', label: 'Google SSO', permission: { resource: 'integrations', action: 'read' } },
    ],
  },
  {
    label: 'User Management',
    icon: Users,
    items: [
      { path: '/admin/users', label: 'Overview', permission: { resource: 'users', action: 'read' } },
      { path: '/admin/users/list', label: 'Users', permission: { resource: 'users', action: 'read' } },
      { path: '/admin/users/roles', label: 'Roles', permission: { resource: 'users', action: 'read' } },
      { path: '/admin/users/permissions', label: 'Permissions', permission: { resource: 'users', action: 'read' } },
    ],
  },
  {
    label: 'Reference Data',
    icon: Settings2,
    defaultCollapsed: true,
    items: CONFIG_TYPE_LIST.map((c) => ({
      path: `/admin/reference-data/${c.slug}`,
      label: c.label,
      icon: c.icon ? CONFIG_NAV_ICONS[c.icon] : undefined,
      permission: { resource: 'config', action: 'read' },
    })),
  },
];
