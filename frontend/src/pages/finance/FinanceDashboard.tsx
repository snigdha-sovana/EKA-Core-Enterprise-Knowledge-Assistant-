import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { RequestDetailModal } from './RequestDetailModal';
import type { EkaRequest } from '../../mock/mockData';

const MONTHLY_EXPENSE_DATA = [
  { month: 'Apr', amount: 32000 },
  { month: 'May', amount: 41000 },
  { month: 'Jun', amount: 38000 },
  { month: 'Jul', amount: 52000 },
  { month: 'Aug', amount: 48230 },
  { month: 'Sep', amount: 24500 },
];

const CATEGORY_DATA = [
  { name: 'Travel & Lodging', value: 42, color: '#2563EB' },
  { name: 'SaaS & Tools', value: 28, color: '#7C3AED' },
  { name: 'Client Dinners', value: 18, color: '#10B981' },
  { name: 'Misc Hardware', value: 12, color: '#F59E0B' },
];

export const FinanceDashboard: React.FC = () => {
  const { currentUser, requests } = useApp();
  const navigate = useNavigate();

  const financeRequests = requests.filter(r => r.department === 'Finance');
  const pendingRequests = financeRequests.filter(r => r.status === 'Pending Review');
  const [activeRequestModal, setActiveRequestModal] = useState<EkaRequest | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
            Finance & Accounts Division
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Finance Department Operations
          </h1>
          <p className="text-xs text-slate-500">
            Welcome, <strong className="text-slate-700">{currentUser.name}</strong> • Audit expense claims, oversee policy inquiries, and resolve EKA escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/finance/requests')}
            className="btn-erp-primary text-xs py-2 px-4 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open EKA Queue ({pendingRequests.length} pending)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: EKA Requests */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EKA Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">18</span>
            <span className="text-xs font-semibold text-amber-600">({pendingRequests.length} Pending)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>Escalation Rate: 6.8%</span>
            <button
              onClick={() => navigate('/admin/finance/requests')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Audit Queue →
            </button>
          </div>
        </div>

        {/* Card 2: Policy Queries */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Policy Queries</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">142</span>
            <span className="text-xs font-semibold text-slate-500">This Month</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 88.2% Answered by EKA
            </span>
          </div>
        </div>

        {/* Card 3: Active Documents */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Finance Docs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">12</span>
            <span className="text-xs font-semibold text-slate-500">Active Policies</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>Travel v3.2, Expense v2.1</span>
            <span className="text-emerald-700 font-bold">100% Synced</span>
          </div>
        </div>

        {/* Card 4: Response Time */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Response Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">4.2</span>
            <span className="text-xs font-semibold text-slate-500">Hours</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>SLA Target: &lt; 24h</span>
            <span className="text-emerald-600 font-semibold">96% on-time</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Expense Trend (2 cols) */}
        <div className="lg:col-span-2 enterprise-card p-5 bg-white">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Monthly Expense Claim Volume ($)
              </h3>
              <p className="text-[11px] text-slate-500">Trailing 6 months cross-departmental spend</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
              YTD Total: $245,730
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_EXPENSE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={val => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Total Claimed']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Donut (1 col) */}
        <div className="enterprise-card p-5 bg-white">
          <div className="pb-3 mb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Expense Categories
            </h3>
            <p className="text-[11px] text-slate-500">Distribution by claim purpose</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            {CATEGORY_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending EKA Requests Action Table */}
      <div className="enterprise-card bg-white p-5">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Pending EKA Escalations</span>
              <span className="badge-danger text-[10px]">{pendingRequests.length} action required</span>
            </h3>
            <p className="text-[11px] text-slate-500">Unanswered policy queries awaiting Finance leadership determination</p>
          </div>
          <button
            onClick={() => navigate('/admin/finance/requests')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            View Full Queue →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingRequests.length > 0 ? (
            pendingRequests.map(req => (
              <div
                key={req.id}
                onClick={() => setActiveRequestModal(req)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                    {req.id}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                      "{req.query}"
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Requested by <strong className="text-slate-700">{req.requestedBy}</strong></span>
                      <span>•</span>
                      <span>Submitted {req.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="badge-danger text-[10px]">{req.status}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRequestModal(req);
                    }}
                    className="btn-erp-primary text-xs py-1 px-3 shadow-xs"
                  >
                    Resolve →
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All Finance inquiries have been reviewed and resolved!
            </div>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      {activeRequestModal && (
        <RequestDetailModal
          request={activeRequestModal}
          onClose={() => setActiveRequestModal(null)}
        />
      )}
    </div>
  );
};

export default FinanceDashboard;
