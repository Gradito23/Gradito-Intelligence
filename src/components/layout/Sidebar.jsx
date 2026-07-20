import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, PanelLeft, PanelLeftClose, X } from 'lucide-react';
import UserAccountMenu from './UserAccountMenu';
import OpsSidebarNav from './OpsSidebarNav';
import AdminSidebarNav from './AdminSidebarNav';
import { useSidebarLayout } from './SidebarLayoutContext';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useSidebarLayout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const closeMobile = () => setMobileOpen(false);
  const isCollapsedDesktop = collapsed;

  const navContent = (forMobile = false) => {
    const showCollapsed = !forMobile && isCollapsedDesktop;

    return (
      <>
        <div className={cn('pb-4', showCollapsed ? 'px-2 pt-4' : 'p-6')}>
          <div className={cn('flex items-center', showCollapsed ? 'flex-col gap-2' : 'justify-between gap-2')}>
            <div className={cn(showCollapsed && 'text-center')}>
              {showCollapsed ? (
                <h1 className="font-display text-lg font-bold text-sidebar-foreground tracking-wide">G</h1>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold text-sidebar-foreground tracking-wide">
                    GRADITO
                  </h1>
                  <p className="text-xs text-sidebar-foreground/50 mt-1 tracking-widest uppercase">
                    Intelligence
                  </p>
                </>
              )}
            </div>
            {!forMobile && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className={cn(
                  'hidden lg:flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0',
                  showCollapsed ? 'w-8 h-8' : 'w-8 h-8',
                )}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </button>
            )}
          </div>
        </div>
        <nav className={cn('flex-1 overflow-y-auto', showCollapsed ? 'px-1 space-y-2' : 'px-3 space-y-4')}>
          {isAdminRoute ? (
            <AdminSidebarNav onNavigate={closeMobile} collapsed={showCollapsed} />
          ) : (
            <OpsSidebarNav onNavigate={closeMobile} collapsed={showCollapsed} />
          )}
        </nav>
        <UserAccountMenu collapsed={showCollapsed} />
      </>
    );
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-navy text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
        type="button"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={closeMobile} />
      )}

      <aside
        className={cn(
          'hidden lg:flex bg-navy flex-col min-h-screen fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-200',
          isCollapsedDesktop ? 'w-16' : 'w-60',
        )}
      >
        {navContent(false)}
      </aside>

      <aside
        className={cn(
          'lg:hidden fixed left-0 top-0 bottom-0 z-40 w-60 bg-navy flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {navContent(true)}
      </aside>
    </>
  );
}
