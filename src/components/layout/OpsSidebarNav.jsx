import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChefHat,
  Calendar,
  Sparkles,
  BarChart3,
  DollarSign,
  LayoutDashboard,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/', label: 'Chefs', icon: ChefHat },
      { path: '/events', label: 'Events', icon: Calendar },
      { path: '/match', label: 'Chef Match', icon: Sparkles },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3 },
      { path: '/profitability', label: 'Profitability', icon: DollarSign },
    ],
  },
];

export default function OpsSidebarNav({ onNavigate, collapsed = false }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const linkClass = (path) =>
    cn(
      'flex items-center rounded-lg text-sm font-medium transition-all duration-200',
      collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
      isActive(path)
        ? 'bg-sidebar-accent text-gold'
        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
    );

  const renderLink = ({ path, label, icon: Icon }) => {
    const link = (
      <Link key={path} to={path} onClick={onNavigate} className={linkClass(path)} aria-label={label}>
        <Icon size={18} className={isActive(path) ? 'text-gold' : ''} />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            {isActive(path) && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={path}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  return (
    <TooltipProvider delayDuration={0}>
      {NAV_SECTIONS.map(({ label: sectionLabel, items }) => (
        <div key={sectionLabel} className={collapsed ? 'mb-2' : ''}>
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1">
              {sectionLabel}
            </p>
          )}
          <div className={cn('space-y-0.5', collapsed && 'space-y-1')}>
            {items.map(renderLink)}
          </div>
        </div>
      ))}
    </TooltipProvider>
  );
}
