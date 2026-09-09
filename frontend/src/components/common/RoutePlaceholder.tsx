import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Layers,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RoutePlaceholderProps {
  title: string;
  category: string;
  description?: string;
}

export const RoutePlaceholder: React.FC<RoutePlaceholderProps> = ({
  title,
  category,
  description = 'Enterprise module operational within NexoraERP framework.',
}) => {
  const { currentUser, setEkaFloatingOpen } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            {category}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: {title} Policies
          </button>
        </div>
      </div>

      {/* Module KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Module State</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-base font-bold text-slate-900">Operational</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">99.9% Uptime SLA</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Authenticated Persona</span>
          <span className="text-sm font-bold text-slate-900 truncate block">
            {currentUser.name}
          </span>
          <span className="text-[10px] text-erp-700 font-bold block mt-1">{currentUser.roleTitle}</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Tenant Organization</span>
          <span className="text-sm font-mono font-bold text-slate-800 block">
            global-tech-corp
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">PostgreSQL Isolated Schema</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">EKA AI Guardrails</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-700">Enforced</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-1">RBAC Partition Filtered</span>
        </div>
      </div>

      {/* Main Operational Card */}
      <div className="enterprise-card p-6 bg-white space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-erp-50 text-erp-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title} &bull; Enterprise Summary</h2>
              <p className="text-xs text-slate-500">Live synchronization with NexoraERP database ledger</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Phase 8 Production Hardened
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-800 block">Department Authorization</span>
            <p className="text-slate-500 text-[11px]">
              Access restricted to authenticated members of <strong>{currentUser.department}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-800 block">Audit & Governance Trail</span>
            <p className="text-slate-500 text-[11px]">
              All read and write operations are logged to the immutable PostgreSQL audit table with client IP hashing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-800 block">AI Context Grounding</span>
            <p className="text-slate-500 text-[11px]">
              EKA retrieves relevant verified corporate policies and prevents hallucinations via confidence gating.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            Need policy assistance or clarification regarding this section?
          </span>
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="text-xs font-bold text-erp-700 hover:text-erp-900 flex items-center gap-1"
          >
            Open EKA Knowledge Assistant <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
