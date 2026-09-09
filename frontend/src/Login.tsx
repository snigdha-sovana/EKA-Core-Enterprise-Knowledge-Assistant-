import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  Cpu,
} from 'lucide-react';
import { useApp } from './context/AppContext';
import type { UserRole } from './mock/mockData';
import { SEED_USERS } from './mock/mockData';

export const Login: React.FC = () => {
  const { switchUser } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('employee@nexora.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('employee');
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSelect = (role: UserRole) => {
    setSelectedDemoRole(role);
    setEmail(SEED_USERS[role].email);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      switchUser(selectedDemoRole);
      setIsLoading(false);

      // Navigate directly to corresponding experience
      if (selectedDemoRole === 'employee') navigate('/app/dashboard');
      else if (selectedDemoRole === 'finance_admin') navigate('/admin/finance/dashboard');
      else if (selectedDemoRole === 'hr_admin') navigate('/admin/hr/dashboard');
      else if (selectedDemoRole === 'orion_admin') navigate('/admin/projects/orion/dashboard');
      else if (selectedDemoRole === 'super_admin') navigate('/super-admin/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-erp-600 text-white text-2xl font-black shadow-lg shadow-erp-500/30 mb-4">
          N
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Nexora<span className="text-erp-600">ERP</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <span>Enterprise Knowledge Assistant</span>
          <span className="w-1.5 h-1.5 rounded-full bg-eka-500"></span>
          <span className="text-eka-600 font-bold">EKA Embedded</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 sm:rounded-2xl sm:px-10 border border-slate-200/80">
          
          {/* Quick Demo Persona Switcher */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-eka-600" />
                Select Demo Account (1-Click Switch)
              </span>
              <span className="text-[11px] font-semibold text-erp-600 bg-erp-50 px-2 py-0.5 rounded-full">
                Interactive Persona
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(SEED_USERS) as UserRole[]).map((rKey) => {
                const persona = SEED_USERS[rKey];
                const isSelected = selectedDemoRole === rKey;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleDemoSelect(rKey)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-erp-600 bg-erp-50/60 ring-2 ring-erp-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center justify-between">
                        <span>{persona.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-erp-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-medium">{persona.roleTitle}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{persona.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                Or Sign In With Single Sign-On
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-erp-500 focus:border-transparent font-medium transition-all"
                  placeholder="name@nexora.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-erp-500 focus:border-transparent font-medium transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-erp-600 focus:ring-erp-500"
                />
                <span className="text-slate-600 font-medium">Remember on this device</span>
              </label>

              <button
                type="button"
                className="text-erp-600 hover:text-erp-700 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-erp-600 hover:bg-erp-700 active:bg-erp-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-erp-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Authenticating with Nexora SSO...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to NexoraERP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Corporate Trust Badges */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> SOC2 Type II Certified
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-500" /> Multi-Tenant Row Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-eka-500" /> 256-Bit EKA Guardrails
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
