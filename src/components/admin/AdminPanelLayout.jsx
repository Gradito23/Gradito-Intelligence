import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, Plug, Settings2, Users } from 'lucide-react';
import { CONFIG_TYPE_LIST } from '@/lib/configMeta';
import { Badge } from '@/components/ui/badge';

const NAV_SECTIONS = [
  {
    label: 'Integrations',
    icon: Plug,
    items: [
      { path: '/admin/integrations', label: 'Integrations', comingSoon: true },
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

export default function AdminPanelLayout() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin/users') {
      return location.pathname === '/admin/users';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-56 shrink-0">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold text-navy">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">System configuration</p>
        </div>
        <nav className="space-y-5">
          {NAV_SECTIONS.map(({ label, icon: Icon, items }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </p>
              <div className="space-y-0.5">
                {items.map(({ path, label: itemLabel, comingSoon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(path)
                        ? 'bg-navy/5 text-navy font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex-1">{itemLabel}</span>
                    {comingSoon && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Soon
                      </Badge>
                    )}
                    {isActive(path) && !comingSoon && (
                      <ChevronRight className="h-3.5 w-3.5 text-gold" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
