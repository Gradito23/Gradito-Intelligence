import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChefs } from '@/hooks/useAppData';
import { ADMIN_NAV_SECTIONS } from '@/lib/adminNav';
import { Badge } from '@/components/ui/badge';

function useDataHealthCount() {
  const { data: chefs } = useChefs();
  return (chefs || []).filter(c =>
    !c.archived && (!c.phone || !c.email || !c.menu_url || (!c.bio_url && !c.bio_page))
  ).length;
}

export default function AdminSidebarNav({ onNavigate }) {
  const location = useLocation();
  const dataHealthCount = useDataHealthCount();

  const isActive = (path) => {
    if (path === '/admin/users') {
      return location.pathname === '/admin/users';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      <div className="px-3 mb-4">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>

      <div className="px-6 pb-3">
        <h2 className="font-display text-lg font-bold text-sidebar-foreground">Admin Panel</h2>
        <p className="text-xs text-sidebar-foreground/50 mt-0.5">System configuration</p>
      </div>

      {ADMIN_NAV_SECTIONS.map(({ label, items }) => (
        <div key={label} className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1">
            {label}
          </p>
          <div className="space-y-0.5">
            {items.map(({ path, label: itemLabel, icon: Icon, comingSoon, badgeKey }) => (
              <Link
                key={path}
                to={path}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-sidebar-accent text-gold'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                {Icon && <Icon size={18} className={isActive(path) ? 'text-gold' : ''} />}
                <span className="flex-1">{itemLabel}</span>
                {comingSoon && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-sidebar-accent text-sidebar-foreground/70">
                    Soon
                  </Badge>
                )}
                {badgeKey === 'dataHealth' && !isActive(path) && dataHealthCount > 0 && (
                  <span className="ml-auto text-xs font-bold bg-gold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {dataHealthCount > 99 ? '99+' : dataHealthCount}
                  </span>
                )}
                {isActive(path) && !comingSoon && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
