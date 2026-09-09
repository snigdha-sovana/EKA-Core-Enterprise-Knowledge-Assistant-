import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';

const HR_QUERY_CATEGORIES = [
  { topic: 'Leave Entitlements', queries: 84 },
  { topic: 'WFH & Ergonomics', queries: 56 },
  { topic: 'Maternity/Paternity', queries: 32 },
  { topic: 'Health Insurance', queries: 28 },
  { topic: 'Conduct & POSH', queries: 14 },
];

export const HrDashboard: React.FC = () => {
  const { currentUser, requests } = useApp();
  const navigate = useNavigate();

  const hrRequests = requests.filter(r => r.department === 'HR');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
            People & Culture Leadership
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Human Resources Operations
          </h1>
          <p className="text-xs text-slate-500">
            Welcome, <strong className="text-slate-700">{currentUser.name}</strong> • Monitor employee queries, leave statistics, and policy governance.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/hr/requests')}
          className="btn-erp-primary text-xs py-2 px-4 shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>HR Inquiry Queue ({hrRequests.length})</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Headcount</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">342</span>
            <span className="text-xs font-semibold text-slate-500">Across 4 Hubs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Bengaluru, Mumbai, Pune, Hyd
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HR EKA Queries</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">214</span>
            <span className="text-xs font-semibold text-emerald-600">92% Autonomous</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Answered without human escalation
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Usage</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">18.4%</span>
            <span className="text-xs font-semibold text-slate-500">Average Burn</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            Privilege Leave health index optimal
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Response Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">2.8</span>
            <span className="text-xs font-semibold text-slate-500">Hours</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            98.2% within standard SLA
          </div>
        </div>
      </div>

      {/* Common Queries Chart & Recent Policies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart (2 cols) */}
        <div className="lg:col-span-2 enterprise-card p-5 bg-white">
          <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Common HR Query Topics
              </h3>
              <p className="text-[11px] text-slate-500">Most frequent topics asked to EKA in the last 30 days</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Total: 214 Queries
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HR_QUERY_CATEGORIES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="topic" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [val, 'Queries']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="queries" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active HR Policies (1 col) */}
        <div className="enterprise-card p-5 bg-white">
          <div className="pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Governed Policies
            </h3>
            <p className="text-[11px] text-slate-500">EKA Grounded Knowledge</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Leave & Attendance Policy</span>
                <span className="badge-success text-[10px]">v4.0</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">18 PL, 12 SL, 4 festival holidays</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Hybrid & Remote Policy</span>
                <span className="badge-success text-[10px]">v2.0</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">3/2 in-office split, ₹15,000 setup grant</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Employee Handbook</span>
                <span className="badge-success text-[10px]">v5.1</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Code of conduct & ethics hotline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrDashboard;
