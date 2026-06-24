import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { Dashboard } from './pages/Dashboard';
import { LiveFeed } from './pages/LiveFeed';
import { Vehicles } from './pages/Vehicles';
import { VehicleDetail } from './pages/VehicleDetail';
import { Fines } from './pages/Fines';
import { FineDetail } from './pages/FineDetail';
import { Bookings } from './pages/Bookings';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';



import { 
  LayoutDashboard, Radio, ClipboardList, Receipt, BookOpen, 
  FileSpreadsheet, Settings as SettingsIcon, Menu, X, Shield, LogOut
} from 'lucide-react';

// Protected Route wrapper component
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

const AppLayout: React.FC = () => {
  const { currentUser, role, logout } = useAppStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth bypassed — ensure a default session exists so the layout always renders
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

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['OFFICER', 'SUPERVISOR', 'ADMIN'] },
    { path: '/live', label: 'Live Stream', icon: <Radio className="w-4 h-4" />, roles: ['OFFICER', 'SUPERVISOR', 'ADMIN'] },
    { path: '/vehicles', label: 'Scans Log', icon: <ClipboardList className="w-4 h-4" />, roles: ['OFFICER', 'SUPERVISOR', 'ADMIN'] },
    { path: '/fines', label: 'Fines', icon: <Receipt className="w-4 h-4" />, roles: ['OFFICER', 'SUPERVISOR', 'ADMIN'] },
    { path: '/bookings', label: 'Parking Bookings', icon: <BookOpen className="w-4 h-4" />, roles: ['OFFICER', 'SUPERVISOR', 'ADMIN'] },
    { path: '/reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" />, roles: ['SUPERVISOR', 'ADMIN'] },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, roles: ['ADMIN'] },
  ];

  const activeClass = (path: string) => {
    return location.pathname.startsWith(path)
      ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
      : 'text-text-muted hover:text-slate-200 hover:bg-slate-900/60';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-bg text-slate-200">
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-dark-border bg-dark-surface/30 shrink-0 select-none">
        {/* App Title */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-dark-border/40">
          <Shield className="w-6 h-6 text-brand-accent shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm leading-none text-slate-100 uppercase tracking-tight">LASPA System</span>
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-1">ANPR Console</span>
          </div>
        </div>

        {/* User profile Summary */}
        <div className="px-6 py-4 border-b border-dark-border/30 bg-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-accent">
              {currentUser?.name ? currentUser.name.charAt(0) : 'O'}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-xs font-bold text-slate-200 truncate">{currentUser?.name}</span>
              <span className="text-[9px] text-text-muted font-bold tracking-wider mt-0.5">
                {role} • {currentUser?.badge_number || 'BADGE-N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-4 flex flex-col gap-1.5 overflow-y-auto">
          {navItems
            .filter(item => !item.roles || (role && item.roles.includes(role)))
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeClass(item.path)}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-dark-border/30">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-xs font-bold text-status-fined hover:bg-status-fined/10 transition-all cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* Mobile Menu Slideout */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-64 h-full bg-dark-bg border-r border-dark-border flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between px-6 py-5 border-b border-dark-border/40">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-accent" />
                  <span className="font-bold text-sm text-slate-100">LASPA Console</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="px-4 py-4 flex flex-col gap-1.5">
                {navItems
                  .filter(item => !item.roles || (role && item.roles.includes(role)))
                  .map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeClass(item.path)}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </nav>
            </div>

            {/* Mobile Sign Out */}
            <div className="p-4 border-t border-dark-border/30">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-xs font-bold text-status-fined hover:bg-status-fined/10 transition-all cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header (Toolbar) */}
        <header className="lg:hidden flex items-center justify-between border-b border-dark-border/40 px-4 py-3.5 bg-dark-surface/10 shrink-0">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="text-text-muted p-1 rounded-lg hover:bg-slate-900 border border-dark-border"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-slate-200">
            <Shield className="w-4.5 h-4.5 text-brand-accent" />
            <span>LASPA System</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-accent">
            {currentUser?.name ? currentUser.name.charAt(0) : 'O'}
          </div>
        </header>

        {/* Active Page Component Scrollbox */}
        <main className="flex-1 overflow-y-auto bg-slate-950/15">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/live" element={
              <ProtectedRoute>
                <LiveFeed />
              </ProtectedRoute>
            } />

            <Route path="/vehicles" element={
              <ProtectedRoute>
                <Vehicles />
              </ProtectedRoute>
            } />

            <Route path="/vehicles/:event_id" element={
              <ProtectedRoute>
                <VehicleDetail />
              </ProtectedRoute>
            } />

            <Route path="/fines" element={
              <ProtectedRoute>
                <Fines />
              </ProtectedRoute>
            } />

            <Route path="/fines/:fine_id" element={
              <ProtectedRoute>
                <FineDetail />
              </ProtectedRoute>
            } />

            <Route path="/bookings" element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                <Reports />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Settings />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

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
