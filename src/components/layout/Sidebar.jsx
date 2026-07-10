import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import UserAccountMenu from './UserAccountMenu';
import OpsSidebarNav from './OpsSidebarNav';
import AdminSidebarNav from './AdminSidebarNav';

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <>
      <div className="p-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-sidebar-foreground tracking-wide">
          GRADITO
        </h1>
        <p className="text-xs text-sidebar-foreground/50 mt-1 tracking-widest uppercase">Chef Intelligence</p>
      </div>
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {isAdminRoute ? (
          <AdminSidebarNav onNavigate={closeMobile} />
        ) : (
          <OpsSidebarNav onNavigate={closeMobile} />
        )}
      </nav>
      <UserAccountMenu />
    </>
  );

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

      <aside className="hidden lg:flex w-60 bg-navy flex-col min-h-screen fixed left-0 top-0 bottom-0 z-30">
        {navContent}
      </aside>

      <aside className={`lg:hidden fixed left-0 top-0 bottom-0 z-40 w-60 bg-navy flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </aside>
    </>
  );
}
