import React, { useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  RefreshCw,
  Plus,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Database
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  leadAdmin: string;
  headcount: number;
  docCount: number;
  ragNamespace: string;
  syncFreshness: string;
  status: 'Operational' | 'Reconciling';
}

const DEPARTMENTS: DepartmentData[] = [
  { id: '1', name: 'Finance & Corporate Treasury', code: 'FIN', leadAdmin: 'Priya Sharma', headcount: 42, docCount: 14, ragNamespace: 'company_finance', syncFreshness: '100% Zero Drift', status: 'Operational' },
  { id: '2', name: 'Human Resources & People Ops', code: 'HR', leadAdmin: 'Kavya Iyer', headcount: 28, docCount: 18, ragNamespace: 'company_hr', syncFreshness: '100% Zero Drift', status: 'Operational' },
  { id: '3', name: 'Project Orion & Core Engineering', code: 'ENG', leadAdmin: 'Rohan Kapoor', headcount: 146, docCount: 26, ragNamespace: 'company_engineering', syncFreshness: '100% Zero Drift', status: 'Operational' },
  { id: '4', name: 'Legal, Risk & Governance', code: 'LGL', leadAdmin: 'Alex Mercer', headcount: 16, docCount: 12, ragNamespace: 'company_legal', syncFreshness: '100% Zero Drift', status: 'Operational' },
  { id: '5', name: 'Global Sales & Client Success', code: 'SLS', leadAdmin: 'Devendra Joshi', headcount: 110, docCount: 8, ragNamespace: 'company_sales', syncFreshness: '100% Zero Drift', status: 'Operational' },
];

export default function DepartmentManagementPage() {
  const { setEkaFloatingOpen, addToast } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Enterprise Hierarchy & Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Department Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure enterprise departments, designated administrator leads, and RAG vector partition namespaces
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Audit Partition Isolation
          </button>
          <button
            onClick={() => addToast('Department creation wizard initialized with automated ChromaDB namespace.', 'info')}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Department
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Active Departments</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">5</span>
            <span className="text-xs text-slate-400">units</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">100% RAG Vector Partitioned</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Workforce</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-erp-700">342</span>
            <span className="text-xs text-slate-400">employees</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Engineering represents 42.6%</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Governed Knowledge Docs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">78</span>
            <span className="text-xs text-slate-400">policies</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-1">BM25 & Vector Hybrid Indexed</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">ERP Sync Freshness</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">100%</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Zero Drift Across All Units</span>
        </div>
      </div>

      {/* Departments Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configured Enterprise Departments</h3>
            <p className="text-xs text-slate-500">PostgreSQL 16 tenant relationships & metadata isolation</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Department & Code</th>
                <th className="py-3 px-4">Designated Admin</th>
                <th className="py-3 px-4">Headcount</th>
                <th className="py-3 px-4">Policy Docs</th>
                <th className="py-3 px-4">RAG Namespace</th>
                <th className="py-3 px-4">ERP Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEPARTMENTS.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-erp-50 text-erp-600 flex items-center justify-center font-bold text-xs">
                        {d.code}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{d.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">ID: dept-0{d.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {d.leadAdmin}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {d.headcount} staff
                  </td>
                  <td className="py-3.5 px-4 font-bold text-erp-700">
                    {d.docCount} docs
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {d.ragNamespace}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {d.syncFreshness}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
