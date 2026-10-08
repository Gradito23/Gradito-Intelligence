import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ADMIN_DOC_NAV } from '@/lib/adminDocNav';
import { cn } from '@/lib/utils';

function isDocPathActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function AdminSidebarDocLinks({ onNavigate, collapsed = false }) {
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'shrink-0 border-t border-sidebar-foreground/10 space-y-1',
          collapsed ? 'px-1 py-2' : 'px-3 py-3',
        )}
      >
        {ADMIN_DOC_NAV.map(({ path, label, icon: Icon }) => {
          const active = isDocPathActive(location.pathname, path);
          const linkClass = cn(
            'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2.5 w-full',
            active
              ? 'bg-sidebar-accent text-gold'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
          );

          if (collapsed) {
            return (
              <Tooltip key={path}>
                <TooltipTrigger asChild>
                  <Link
                    to={path}
                    onClick={onNavigate}
                    className={linkClass}
                    aria-label={label}
                  >
                    <Icon size={18} className={active ? 'text-gold' : ''} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link key={path} to={path} onClick={onNavigate} className={linkClass}>
              <Icon size={18} className={active ? 'text-gold' : ''} />
              <span className="flex-1">{label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />}
            </Link>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
