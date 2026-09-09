import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  User as UserIcon,
  Clock,
  Calendar,
  CreditCard,
  Briefcase,
  FileText,
  Sparkles,
  ListTodo,
  ShieldCheck,
  Building2,
  Lock,
  BarChart3,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Users,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { currentUser, setEkaFloatingOpen, requests } = useApp();
  const navigate = useNavigate();

  // Calculate pending requests count for badges
  const pendingCount = requests.filter(r => r.status === 'Pending Review').length;

  const getNavLinks = () => {
    switch (currentUser.role) {
      case 'employee':
        return [
          { name: 'Dashboard', path: '/app/dashboard', icon: Home },
          { name: 'My Profile', path: '/app/profile', icon: UserIcon },
          { name: 'Attendance', path: '/app/attendance', icon: Clock },
          { name: 'Leave Management', path: '/app/leave', icon: Calendar },
          { name: 'Expense Claims', path: '/app/expenses', icon: CreditCard },
          { name: 'Projects (Orion)', path: '/app/projects', icon: Briefcase },
          { name: 'Company Docs', path: '/app/documents', icon: FileText },
          {
            name: 'EKA Assistant',
            path: '/app/eka/chat',
            icon: Sparkles,
            isAi: true,
          },
          {
            name: 'My Requests',
            path: '/app/eka/requests',
            icon: ListTodo,
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
        ];

      case 'finance_admin':
        return [
          { name: 'Finance Dashboard', path: '/admin/finance/dashboard', icon: Home },
          {
            name: 'EKA Requests',
            path: '/admin/finance/requests',
            icon: Sparkles,
            isAi: true,
            badge: pendingCount,
          },
          { name: 'Expense Audit', path: '/admin/finance/expenses', icon: CreditCard },
          { name: 'Finance Policies', path: '/admin/finance/documents', icon: FileText },
          { name: 'Knowledge Base', path: '/admin/finance/knowledge', icon: Layers },
        ];

      case 'hr_admin':
        return [
          { name: 'HR Dashboard', path: '/admin/hr/dashboard', icon: Home },
          { name: 'HR EKA Requests', path: '/admin/hr/requests', icon: Sparkles, isAi: true },
          { name: 'HR Documents', path: '/admin/hr/documents', icon: FileText },
          { name: 'Company Policies', path: '/admin/hr/policies', icon: ShieldCheck },
          { name: 'People Knowledge', path: '/admin/hr/knowledge', icon: Layers },
        ];

      case 'orion_admin':
        return [
          { name: 'Orion Dashboard', path: '/admin/projects/orion/dashboard', icon: Home },
          { name: 'Orion EKA Requests', path: '/admin/projects/orion/requests', icon: Sparkles, isAi: true },
          { name: 'Technical Docs', path: '/admin/projects/orion/documents', icon: FileText },
          { name: 'Team Roster', path: '/admin/projects/orion/team', icon: Users },
          { name: 'Sprint Knowledge', path: '/admin/projects/orion/knowledge', icon: Layers },
        ];

      case 'super_admin':
        return [
          { name: 'Executive Overview', path: '/super-admin/dashboard', icon: Home },
          { name: 'User Management', path: '/super-admin/users', icon: Users },
          { name: 'Departments', path: '/super-admin/departments', icon: Building2 },
          { name: 'Company Knowledge Hub', path: '/super-admin/knowledge', icon: FileText },
          { name: 'Access Control Matrix', path: '/super-admin/access-control', icon: Lock },
          { name: 'EKA Analytics', path: '/super-admin/eka-analytics', icon: BarChart3, isAi: true },
          { name: 'Knowledge Gap Analytics', path: '/super-admin/knowledge-gaps', icon: AlertCircle, isAi: true },
          { name: '14-Day Sync Monitor', path: '/super-admin/sync-monitor', icon: RefreshCw },
          { name: 'Security Audit Logs', path: '/super-admin/audit-logs', icon: FileSpreadsheet },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="w-9 h-9 rounded-lg bg-erp-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-erp-500/30">
          N
        </div>
        <div>
          <div className="font-bold text-slate-900 leading-tight text-base tracking-tight flex items-center gap-1.5">
            Nexora<span className="text-erp-600">ERP</span>
          </div>
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <span>Enterprise Suite</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* Role Context Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Role</span>
          <span className="text-xs font-semibold text-erp-700 truncate">{currentUser.roleTitle}</span>
        </div>
        <span className="text-[10px] bg-erp-100 text-erp-800 font-bold px-1.5 py-0.5 rounded uppercase">
          {currentUser.role.split('_')[0]}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? item.isAi
                      ? 'bg-eka-50 text-eka-700 font-semibold shadow-sm border-l-4 border-eka-600'
                      : 'bg-erp-50 text-erp-700 font-semibold shadow-sm border-l-4 border-erp-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? item.isAi ? 'text-eka-600' : 'text-erp-600'
                          : 'text-slate-600 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.isAi && !item.badge && (
                    <span className="text-[9px] font-bold bg-eka-100 text-eka-700 px-1.5 py-0.5 rounded uppercase">
                      AI
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Embedded Assistant Launcher Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <button
          onClick={() => setEkaFloatingOpen(true)}
          className="w-full bg-gradient-to-r from-eka-600 to-indigo-600 hover:from-eka-700 hover:to-indigo-700 text-white rounded-xl p-3 text-left transition-all shadow-sm hover:shadow-eka-glow group flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold leading-none">Ask EKA Assistant</div>
              <div className="text-[10px] text-white/80 mt-1">Instant policy & ERP help</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Current User Card */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
          />
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-600 truncate">{currentUser.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
