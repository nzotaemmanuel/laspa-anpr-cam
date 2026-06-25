import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Shield, KeyRound, User, Loader2, Info } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, currentUser, authLoading, authError } = useAppStore();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    const success = await login(username.trim(), password.trim());
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-dark-bg relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Visual background gradients (only for form side) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
      
      {/* Left side: Login Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="glass-panel max-w-md w-full rounded-2xl p-8 shadow-2xl text-left animate-slide-up">
          {/* App Logo/Branding */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-brand-accent/15 border border-brand-accent/30 p-3 rounded-xl mb-3 text-brand-accent">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight leading-tight">
              LASPA ANPR Console
            </h1>
            <p className="text-xs text-text-muted mt-1.5 font-semibold uppercase tracking-wider">
              Enforcement Management Gateway
            </p>
          </div>

          {/* Credentials hints for demo since they are not predefined */}
          <div className="bg-slate-900/60 border border-dark-border px-4 py-3 rounded-lg mb-6 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300">Production Authentication Required:</span>
              <br />Use your authorized officer credentials to gain access. (Role privileges: Officer, Supervisor, Admin).
            </div>
          </div>

          {authError && (
            <div className="bg-status-fined/10 border border-status-fined/20 text-status-fined px-4 py-3 rounded-lg text-xs font-semibold mb-5">
              Authentication Failed: {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. officer.john"
                  disabled={authLoading}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 py-2.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={authLoading}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 py-2.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg py-2.5 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-brand-accent/15 cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authorizing session...
                </>
              ) : (
                'Sign In to Console'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right side: Realistic Image Column */}
      <div className="hidden lg:block lg:col-span-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#080C18] via-[#080C18]/45 to-transparent z-10 animate-fade-in" />
        <div className="absolute inset-0 bg-black/35 z-10" />
        <img
          src="/assets/lagos_parking_enforcement.png"
          alt="Lagos Parking Enforcement"
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
        />
        {/* Image branding text overlays */}
        <div className="absolute bottom-16 left-16 right-16 z-20 text-left">
          <span className="bg-brand-accent/80 backdrop-blur-md border border-brand-accent/30 text-white text-[10px] font-bold tracking-widest px-3.5 py-1.5 rounded-full uppercase">
            LASPA Enforcement Gateway
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-5 tracking-tight leading-tight max-w-lg">
            Regulating Parking Operations in Lagos Metropolis
          </h2>
          <p className="text-sm text-slate-300 mt-2.5 max-w-md leading-relaxed">
            Real-time ANPR scan ingestion, automated parking reservations audit, and penalty fine issuing portal.
          </p>
        </div>
      </div>
    </div>
  );
};
