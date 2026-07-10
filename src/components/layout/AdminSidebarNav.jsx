import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChefs } from '@/hooks/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_NAV_SECTIONS } from '@/lib/adminNav';
import { checkPermission } from '@/lib/permissionMeta';
import SidebarNavSection from './SidebarNavSection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function useDataHealthCount() {
  const { data: chefs } = useChefs();
  return (chefs || []).filter(c =>
    !c.archived && (!c.phone || !c.email || !c.menu_url || (!c.bio_url && !c.bio_page))
  ).length;
}

function isPathActive(pathname, path) {
  if (path === '/admin/users') {
    return pathname === '/admin/users';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getOpenSectionsForPath(pathname) {
  const open = {};
  ADMIN_NAV_SECTIONS.forEach(({ label, items, defaultCollapsed }) => {
    if (defaultCollapsed || label === 'Reference Data') return;
    if (items.some((item) => isPathActive(pathname, item.path))) {
      open[label] = true;
    }
  });
  return open;
}

export default function AdminSidebarNav({ onNavigate, collapsed = false }) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const dataHealthCount = useDataHealthCount();
  const [openSections, setOpenSections] = useState(() =>
    getOpenSectionsForPath(location.pathname),
  );

  const visibleSections = useMemo(() => ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => checkPermission(hasPermission, item.permission)),
  })).filter((section) => section.items.length > 0), [hasPermission]);

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      ADMIN_NAV_SECTIONS.forEach(({ label, items, defaultCollapsed }) => {
        if (defaultCollapsed || label === 'Reference Data') return;
        if (items.some((item) => isPathActive(location.pathname, item.path))) {
          next[label] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  const isActive = (path) => isPathActive(location.pathname, path);

  const toggleSection = (label) => (open) => {
    setOpenSections((prev) => ({ ...prev, [label]: open }));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={collapsed ? 'px-1' : 'px-3'}>
        <div className={collapsed ? 'flex justify-center mb-3' : 'mb-4'}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/dashboard"
                  onClick={onNavigate}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft size={18} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to dashboard</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/dashboard"
              onClick={onNavigate}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 pb-3">
            <h2 className="font-display text-lg font-bold text-sidebar-foreground">Admin Panel</h2>
            <p className="text-xs text-sidebar-foreground/50 mt-0.5">System configuration</p>
          </div>
        )}

        {visibleSections.map(({ label, icon, items }) => (
          <SidebarNavSection
            key={label}
            label={label}
            icon={icon}
            items={items}
            isOpen={!!openSections[label]}
            onOpenChange={toggleSection(label)}
            collapsed={collapsed}
            isActive={isActive}
            onNavigate={onNavigate}
            dataHealthCount={dataHealthCount}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
