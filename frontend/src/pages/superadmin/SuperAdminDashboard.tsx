import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  FileText,
  Users,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

const QUERY_TREND_DATA = [
  { day: 'Mon', answered: 142, escalated: 18 },
  { day: 'Tue', answered: 185, escalated: 14 },
  { day: 'Wed', answered: 210, escalated: 22 },
  { day: 'Thu', answered: 195, escalated: 19 },
  { day: 'Fri', answered: 230, escalated: 25 },
  { day: 'Sat', answered: 84, escalated: 7 },
  { day: 'Sun', answered: 62, escalated: 4 },
];

const DEPT_DISTRIBUTION = [
  { name: 'Finance', value: 38, color: '#2563EB' },
  { name: 'HR & People', value: 32, color: '#7C3AED' },
  { name: 'Project Orion', value: 20, color: '#059669' },
  { name: 'General ERP', value: 10, color: '#D97706' },
];

export default function SuperAdminDashboard() {
  const { documents, requests, knowledgeGaps, syncStatus, runFullSync } = useApp();

  const totalDocs = documents.length;
  const pendingEscalations = requests.filter(r => r.status !== 'Resolved').length;
  const resolvedEscalations = requests.filter(r => r.status === 'Resolved').length;
  const totalEscalations = requests.length;
  const resolutionRate = totalEscalations > 0 ? Math.round((resolvedEscalations / totalEscalations) * 100) : 88;

  const handleQuickSync = () => {
    runFullSync();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Super Administrator Control Plane
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Governance & Telemetry</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Global monitoring of knowledge indexing, EKA automated query resolution, departmental access control, and 14-day ERP sync reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleQuickSync}
            disabled={syncStatus?.isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/60 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
            {syncStatus?.isSyncing ? 'Reconciling Vector Index...' : 'Run Full Sync'}
          </button>
          <Link
            to="/super-admin/knowledge"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-all border border-white/10"
          >
            <FileText className="w-4 h-4" />
            Knowledge Hub
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Documents */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Indexed Docs</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalDocs}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              +3 new v3.2
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>HR: 3 | Fin: 3 | Orion: 3</span>
            <Link to="/super-admin/knowledge" className="text-blue-600 hover:underline flex items-center">
              View <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Global Resolution Rate */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resolution Rate</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{resolutionRate}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              Target &gt;85%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {resolvedEscalations} resolved / {pendingEscalations} pending escalation
          </div>
        </div>

        {/* Sync Freshness */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">14-Day Sync Freshness</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{syncStatus?.freshness || 94}%</span>
            <span className="text-xs font-semibold text-emerald-600">
              Optimal
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Last run: {syncStatus?.lastSync || 'Sep 01, 2026'}
          </div>
        </div>

        {/* Knowledge Gaps */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unresolved Gaps</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{knowledgeGaps.length}</span>
            <span className="text-xs font-semibold text-amber-600">
              Action Required
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Ranked by frequency</span>
            <Link to="/super-admin/knowledge-gaps" className="text-amber-600 hover:underline flex items-center">
              Remediate <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Volume Trend */}
        <div className="enterprise-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">EKA Daily Query Volume & Resolution</h2>
              <p className="text-xs text-slate-500">Automated policy answers vs. departmental human escalations</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
              7-Day Telemetry
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={QUERY_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="answered" name="Answered Automatically" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="escalated" name="Human Escalations" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution Donut */}
        <div className="enterprise-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Inquiry Breakdown</h2>
              <p className="text-xs text-slate-500">Query traffic by department</p>
            </div>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEPT_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {DEPT_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {DEPT_DISTRIBUTION.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span className="text-slate-600 truncate">{d.name}</span>
                <span className="font-semibold text-slate-900 ml-auto">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Row: Top Knowledge Gaps & Access Control Quick Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Knowledge Gaps Preview */}
        <div className="enterprise-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">High-Priority Knowledge Gaps</h2>
              <p className="text-xs text-slate-500">Recurring questions requiring official documentation updates</p>
            </div>
            <Link
              to="/super-admin/knowledge-gaps"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All ({knowledgeGaps.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {knowledgeGaps.slice(0, 3).map(gap => (
              <div key={gap.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{gap.topic}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {gap.responsibleDept}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{gap.sampleQuery}"</p>
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                    Rec: {gap.recommendation}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-slate-900">{gap.queriesCount}</span>
                  <span className="text-[10px] block text-slate-400">queries</span>
                  <span className="text-xs font-semibold text-amber-600 block">{gap.escalationsCount} escalations</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Governance Links & Status */}
        <div className="enterprise-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Governance Quick Actions</h2>
          <div className="space-y-2.5">
            <Link
              to="/super-admin/access-control"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Access Control Matrix</div>
                  <div className="text-[11px] text-slate-500">Document permissions by role</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
            </Link>

            <Link
              to="/super-admin/sync-monitor"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">14-Day Sync Monitor</div>
                  <div className="text-[11px] text-slate-500">Reconciliation audit history</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </Link>

            <Link
              to="/super-admin/knowledge"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Knowledge Hub & Versions</div>
                  <div className="text-[11px] text-slate-500">All 9 active policy documents</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              EKA Health Status: Healthy
            </div>
            <p className="text-[11px] text-slate-500">
              Ollama Qwen2.5:1.5b running on 127.0.0.1:11434. PostgreSQL vector indices synced with 0 drift.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
