import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  UserCheck,
  LogOut,
  Sparkles,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../mock/mockData';
import { SEED_USERS } from '../../mock/mockData';

export const TopBar: React.FC = () => {
  const {
    currentUser,
    switchUser,
    setActiveEkaQuery,
    setEkaFloatingOpen,
    requests,
    backendHealth,
    ragLearnedChunks,
    fastForwardSync,
    resetSimulation,
  } = useApp();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    switchUser(role);
    setRoleMenuOpen(false);
    setUserMenuOpen(false);

    // Redirect to respective dashboard
    if (role === 'employee') navigate('/app/dashboard');
    else if (role === 'finance_admin') navigate('/admin/finance/dashboard');
    else if (role === 'hr_admin') navigate('/admin/hr/dashboard');
    else if (role === 'orion_admin') navigate('/admin/projects/orion/dashboard');
    else if (role === 'super_admin') navigate('/super-admin/dashboard');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveEkaQuery(searchQuery);
    setEkaFloatingOpen(true);
    setSearchQuery('');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ask EKA or search policies, ERP records... (Enter to query)"
          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white text-xs text-slate-900 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-erp-500 focus:border-transparent transition-all"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300">
          ↵
        </span>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Continuous RAG Learning Pipeline Status Pill */}
        {(() => {
          const ingestingChunk = ragLearnedChunks.find(c => c.status === 'ingesting');
          const syncedChunk = ragLearnedChunks.find(c => c.status === 'synced' && c.requestId === 'FIN-2026-0142');
          
          if (ingestingChunk) {
            return (
              <button
                onClick={() => fastForwardSync(ingestingChunk.requestId)}
                className="hidden sm:flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all animate-pulse"
                title="Continuous learning in progress — Click to fast-forward vector indexing"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                <span>RAG Ingesting ({ingestingChunk.countdownSeconds}s)</span>
              </button>
            );
          }
          if (syncedChunk) {
            return (
              <div
                className="hidden sm:flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-2xs"
                title="RAG model incorporates ticket FIN-2026-0142 into active vector memory (Policy v3.3)"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>RAG Synced (v3.3)</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Reset Demo Simulation Button */}
        <button
          onClick={resetSimulation}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-all shadow-2xs cursor-pointer"
          title="Reset simulation tickets and RAG model to initial baseline"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset Demo</span>
        </button>

        {/* Live Backend Connection Status Pill */}
        <div className="hidden sm:flex items-center">
          {backendHealth.online ? (
            <div
              className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-xs"
              title={`Live FastAPI backend active at http://localhost:8000 (${backendHealth.latencyMs || 0}ms latency)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FastAPI :8000</span>
              <span className="text-[10px] text-emerald-600 font-mono">({backendHealth.latencyMs || 12}ms)</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              title="Enterprise Local Demo State with Zero Drift"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>EKA Local (Zero Drift)</span>
            </div>
          )}
        </div>

        {/* Quick Role Switcher Pill */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all shadow-sm"
            title="1-Click Demo Persona Switcher"
          >
            <span className="w-2 h-2 rounded-full bg-erp-600 animate-pulse"></span>
            <span className="text-slate-600 font-normal">Persona:</span>
            <span className="font-bold text-erp-700">{currentUser.name.split(' ')[0]} ({currentUser.role.split('_')[0]})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>Select Demo Persona</span>
                <span className="text-erp-600 text-[10px] lowercase font-normal">1-click switch</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(Object.keys(SEED_USERS) as UserRole[]).map((rKey) => {
                  const user = SEED_USERS[rKey];
                  const isSelected = user.id === currentUser.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleRoleSelect(rKey)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-erp-50/70 border-l-4 border-erp-600' : ''
                      }`}
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>{user.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-erp-600" />}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">{user.roleTitle}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{user.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Button */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 relative transition-all"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[11px] text-erp-600 font-medium cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2 bg-purple-50/60 border border-purple-100 rounded-lg flex gap-2.5">
                  <Sparkles className="w-4 h-4 text-eka-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900 text-[11px]">EKA Escalation Update</div>
                    <div className="text-[11px] text-slate-600">FIN-2026-0142 status moved to Under Review.</div>
                    <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Just now
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg flex gap-2.5">
                  <Layers className="w-4 h-4 text-erp-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900 text-[11px]">Sync Schedule Notice</div>
                    <div className="text-[11px] text-slate-600">14-day auto-reconciliation scheduled for Sep 15, 2026.</div>
                    <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 2 hours ago
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
            />
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-600 leading-tight">{currentUser.roleTitle}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-600 font-mono truncate">{currentUser.email}</div>
                <div className="mt-1 text-[10px] font-semibold text-erp-700 bg-erp-50 px-2 py-0.5 rounded inline-block">
                  {currentUser.department}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/app/profile');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  View ERP Profile
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setRoleMenuOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  Switch Role / Persona
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  Sign Out of NexoraERP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
