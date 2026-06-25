import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import laspeLogo from './assets/laspa-logo.png';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { VehicleDetail } from './pages/VehicleDetail';
import { Fines } from './pages/Fines';
import { FineDetail } from './pages/FineDetail';
import { Bookings } from './pages/Bookings';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

import {
  LayoutDashboard, ClipboardList, Receipt, BookOpen,
  FileSpreadsheet, Settings as SettingsIcon, Menu, X, LogOut,
  Sun, Moon, ChevronRight, ChevronLeft,
} from 'lucide-react';

// ─── Theme Hook ───────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('laspa_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('laspa_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}

// ─── Protected Route ──────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('OFFICER' | 'SUPERVISOR' | 'ADMIN')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role } = useAppStore();
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── Nav Items ─────────────────────────────────────────────────────────────────
const navItems = [
  { path: '/dashboard', label: 'Dashboard',       icon: <LayoutDashboard className="w-4 h-4" />, roles: ['OFFICER','SUPERVISOR','ADMIN'] },
  { path: '/vehicles',  label: 'Scans Log',       icon: <ClipboardList className="w-4 h-4" />,   roles: ['OFFICER','SUPERVISOR','ADMIN'] },
  { path: '/fines',     label: 'Fines',           icon: <Receipt className="w-4 h-4" />,         roles: ['OFFICER','SUPERVISOR','ADMIN'] },
  { path: '/bookings',  label: 'Parking Bookings',icon: <BookOpen className="w-4 h-4" />,        roles: ['OFFICER','SUPERVISOR','ADMIN'] },
  { path: '/reports',   label: 'Reports',         icon: <FileSpreadsheet className="w-4 h-4" />, roles: ['SUPERVISOR','ADMIN'] },
  { path: '/settings',  label: 'Settings',        icon: <SettingsIcon className="w-4 h-4" />,    roles: ['ADMIN'] },
];

// ─── Theme Toggle Button ───────────────────────────────────────────────────────
const ThemeToggle: React.FC<{ theme: string; toggle: () => void; compact?: boolean }> = ({ theme, toggle, compact }) => (
  <button
    onClick={toggle}
    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    className="flex items-center gap-2 rounded-xl cursor-pointer transition-all duration-200"
    style={{
      background: 'var(--bg-surface-2)',
      border: '1px solid var(--border-muted)',
      color: 'var(--text-secondary)',
      padding: compact ? '0.625rem' : '0.5rem 0.875rem',
      justifyContent: compact ? 'center' : 'flex-start',
      width: compact ? '40px' : '100%',
    }}
  >
    {theme === 'dark'
      ? <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
      : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
    {!compact && (
      <span className="text-xs font-semibold truncate">
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </span>
    )}
  </button>
);

// ─── App Layout ────────────────────────────────────────────────────────────────
const AppLayout: React.FC = () => {
  const { currentUser, role, logout } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Auth bypass — ensure default session exists
  if (!currentUser) {
    const defaultUser = {
      officer_id: 'default_admin',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN' as const,
      badge_number: 'BADGE-0001',
    };
    useAppStore.setState({ currentUser: defaultUser, role: 'ADMIN', token: 'bypass-token' });
    return null;
  }

  const filteredNav = navItems.filter(item => !item.roles || (role && item.roles.includes(role)));

  const isActive = (path: string) => location.pathname.startsWith(path);

  const NavLink: React.FC<{ item: typeof navItems[0]; onClick?: () => void }> = ({ item, onClick }) => (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ${
        collapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5 gap-3'
      } ${
        isActive(item.path) ? 'nav-active' : 'nav-item'
      }`}
    >
      <span className="shrink-0 nav-icon">
        {item.icon}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && isActive(item.path) && (
        <ChevronRight className="w-3 h-3 opacity-60 nav-arrow" />
      )}
    </Link>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col shrink-0 select-none glass-sidebar"
        style={{ width: collapsed ? '80px' : '260px' }}
      >
        {/* Logo */}
        <div
          className={`flex ${collapsed ? 'flex-col gap-2.5 px-2 py-4 items-center' : 'flex-row items-center justify-between px-5 py-4'}`}
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-muted)' }}
            >
              <img src={laspeLogo} alt="LASPA" className="w-10 h-10 object-cover" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-extrabold tracking-tight leading-none logo-text truncate">
                  LASPA ANPR
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Console
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-800/40 text-text-muted hover:text-text-primary cursor-pointer transition-all duration-200 shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Pill */}
        <div className={`mt-4 mb-2 rounded-xl flex items-center ${collapsed ? 'mx-2 p-1.5 justify-center' : 'mx-4 px-3 py-2.5 gap-2.5'}`}
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
          title={collapsed ? `${currentUser?.name} (${role})` : undefined}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-extrabold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}
          >
            {currentUser?.name ? currentUser.name.charAt(0) : 'A'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {currentUser?.name}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {role} · {currentUser?.badge_number || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 flex flex-col gap-1 overflow-y-auto ${collapsed ? 'px-2 items-stretch' : 'px-4'}`}>
          {!collapsed ? (
            <div className="text-[10px] font-bold uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              Navigation
            </div>
          ) : (
            <div className="h-px bg-border-subtle my-2 mx-2" />
          )}
          {filteredNav.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Footer */}
        <div className={`pb-4 flex flex-col gap-2 ${collapsed ? 'px-2 items-center' : 'px-4'}`} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <ThemeToggle theme={theme} toggle={toggleTheme} compact={collapsed} />
          <button
            onClick={() => logout()}
            title={collapsed ? "Sign Out" : undefined}
            className={`flex items-center rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              collapsed ? 'justify-center p-2.5 w-10' : 'w-full px-3.5 py-2.5 gap-2.5'
            }`}
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.15)',
              color: '#FCA5A5',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.14)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'; }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full flex flex-col glass-sidebar animate-slide-in-left"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile logo header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <img src={laspeLogo} alt="LASPA" className="w-9 h-9 rounded-xl object-cover" />
                <span className="font-extrabold text-sm logo-text">LASPA ANPR Console</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile nav */}
            <nav className="flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto">
              {filteredNav.map(item => (
                <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
              ))}
            </nav>

            {/* Mobile footer */}
            <div className="px-4 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <ThemeToggle theme={theme} toggle={toggleTheme} />
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  color: '#FCA5A5',
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Topbar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl cursor-pointer"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <img src={laspeLogo} alt="LASPA" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-extrabold text-sm logo-text">LASPA ANPR Console</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} toggle={toggleTheme} compact />
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff' }}
            >
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto scroll-smooth animate-fade-in animate-slide-up"
          style={{ background: 'transparent' }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/vehicles"  element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
            <Route path="/vehicles/:event_id" element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>} />
            <Route path="/fines"     element={<ProtectedRoute><Fines /></ProtectedRoute>} />
            <Route path="/fines/:fine_id" element={<ProtectedRoute><FineDetail /></ProtectedRoute>} />
            <Route path="/bookings"  element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/reports"   element={<ProtectedRoute allowedRoles={['SUPERVISOR','ADMIN']}><Reports /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute allowedRoles={['ADMIN']}><Settings /></ProtectedRoute>} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ─── App Root ──────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
