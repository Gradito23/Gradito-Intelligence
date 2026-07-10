import {
  Activity,
  HeartPulse,
  Plug,
  Settings2,
  Upload,
  Users,
} from 'lucide-react';
import { CONFIG_TYPE_LIST } from '@/lib/configMeta';

export const ADMIN_NAV_SECTIONS = [
  {
    label: 'Platform Operations',
    icon: Users,
    items: [
      { path: '/admin/team', label: 'Team', icon: Users },
      { path: '/admin/data-health', label: 'Data Health', icon: HeartPulse, badgeKey: 'dataHealth' },
      { path: '/admin/activity', label: 'Activity Log', icon: Activity },
      { path: '/admin/bulk-upload', label: 'Bulk Upload', icon: Upload },
    ],
  },
  {
    label: 'Integrations',
    icon: Plug,
    items: [
      { path: '/admin/integrations', label: 'Integrations', icon: Plug },
    ],
  },
  {
    label: 'User Management',
    icon: Users,
    items: [
      { path: '/admin/users', label: 'Overview', comingSoon: true },
      { path: '/admin/users/list', label: 'Users', comingSoon: true },
      { path: '/admin/users/roles', label: 'Roles', comingSoon: true },
      { path: '/admin/users/permissions', label: 'Permissions', comingSoon: true },
    ],
  },
  {
    label: 'Reference Data',
    icon: Settings2,
    items: CONFIG_TYPE_LIST.map((c) => ({
      path: `/admin/reference-data/${c.slug}`,
      label: c.label,
    })),
  },
];
