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

export default function OpsSidebarNav({ onNavigate }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {NAV_SECTIONS.map(({ label: sectionLabel, items }) => (
        <div key={sectionLabel}>
          <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1">
            {sectionLabel}
          </p>
          <div className="space-y-0.5">
            {items.map(({ path, label, icon: Icon }) => (
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
                <Icon size={18} className={isActive(path) ? 'text-gold' : ''} />
                {label}
                {isActive(path) && (
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
