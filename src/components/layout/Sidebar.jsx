import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, Calendar, Sparkles, BarChart3, Activity, Upload, Menu, X, HeartPulse, DollarSign, Users } from 'lucide-react';
import { useChefs } from '@/hooks/useAppData';
import UserAccountMenu from './UserAccountMenu';

function useDataHealthCount() {
  const { data: chefs } = useChefs();
  return (chefs || []).filter(c =>
    !c.archived && (!c.phone || !c.email || !c.menu_url || (!c.bio_url && !c.bio_page))
  ).length;
}

const NAV_SECTIONS = [
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
  {
    label: 'Admin',
    items: [
      { path: '/team', label: 'Team', icon: Users },
      { path: '/data-health', label: 'Data Health', icon: HeartPulse },
      { path: '/activity', label: 'Activity Log', icon: Activity },
      { path: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dataHealthCount = useDataHealthCount();

  const adminItems = [
    { path: '/team', label: 'Team', icon: Users },
    { path: '/data-health', label: 'Data Health', icon: HeartPulse },
    { path: '/activity', label: 'Activity Log', icon: Activity },
    { path: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
  ];

  const navSections = NAV_SECTIONS.map(s =>
    s.label === 'Admin' ? { ...s, items: adminItems } : s
  );

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <>
      <div className="p-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-sidebar-foreground tracking-wide">
          GRADITO
        </h1>
        <p className="text-xs text-sidebar-foreground/50 mt-1 tracking-widest uppercase">Chef Intelligence</p>
      </div>
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {navSections.map(({ label: sectionLabel, items }) => (
          <div key={sectionLabel}>
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-1">{sectionLabel}</p>
            <div className="space-y-0.5">
              {items.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(path)
                      ? 'bg-sidebar-accent text-gold'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icon size={18} className={isActive(path) ? 'text-gold' : ''} />
                  {label}
                  {path === '/data-health' && !isActive(path) && dataHealthCount > 0 ? (
                    <span className="ml-auto text-xs font-bold bg-gold text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {dataHealthCount > 99 ? '99+' : dataHealthCount}
                    </span>
                  ) : isActive(path) ? (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <UserAccountMenu />
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-navy text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-navy flex-col min-h-screen fixed left-0 top-0 bottom-0 z-30">
        {navContent}
      </aside>

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-60 bg-navy flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </aside>
    </>
  );
}