import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Info,
  Key,
  Users,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface PermissionEntry {
  category: string;
  scope: string;
  employee: boolean;
  financeAdmin: boolean;
  hrAdmin: boolean;
  orionAdmin: boolean;
  superAdmin: boolean;
  securityLevel: 'Public' | 'Restricted' | 'Confidential' | 'Strict Isolation';
}

const PERMISSION_DATA: PermissionEntry[] = [
  {
    category: 'General Company Knowledge',
    scope: 'Attendance, Holiday Schedules, Standard Travel Limits v3.2',
    employee: true,
    financeAdmin: true,
    hrAdmin: true,
    orionAdmin: true,
    superAdmin: true,
    securityLevel: 'Public',
  },
  {
    category: 'Finance Policies & Exceptions',
    scope: 'Expense audit guidelines, vendor contracts, corporate card exceptions',
    employee: false,
    financeAdmin: true,
    hrAdmin: false,
    orionAdmin: false,
    superAdmin: true,
    securityLevel: 'Restricted',
  },
  {
    category: 'People & Culture (HR)',
    scope: 'POSH investigations, executive compensation slabs, internal grievance logs',
    employee: false,
    financeAdmin: false,
    hrAdmin: true,
    orionAdmin: false,
    superAdmin: true,
    securityLevel: 'Confidential',
  },
  {
    category: 'Project Orion Engineering Specs',
    scope: 'Microservices architecture v2.4, Kafka schema registry, deployment runbooks',
    employee: true, // employees on Orion project
    financeAdmin: false,
    hrAdmin: false,
    orionAdmin: true,
    superAdmin: true,
    securityLevel: 'Restricted',
  },
  {
    category: 'Project Orion Infrastructure Credentials',
    scope: 'AWS IAM STS roles, RDS root access SOPs, zero-trust token vaults',
    employee: false,
    financeAdmin: false,
    hrAdmin: false,
    orionAdmin: true,
    superAdmin: true,
    securityLevel: 'Strict Isolation',
  },
  {
    category: 'System Governance & Telemetry',
    scope: '14-Day reconciliation logs, vector drift counters, cross-tenant audit trails',
    employee: false,
    financeAdmin: false,
    hrAdmin: false,
    orionAdmin: false,
    superAdmin: true,
    securityLevel: 'Strict Isolation',
  },
];

export default function AccessControlMatrix() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Restricted' | 'Strict Isolation'>('All');

  const filteredPermissions = PERMISSION_DATA.filter(p => {
    if (activeFilter === 'All') return true;
    return p.securityLevel === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
            <Key className="w-4 h-4" />
            Security & Compliance
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Access Control Matrix (RBAC)</h1>
          <p className="text-sm text-slate-500">
            Enterprise boundary enforcement for EKA vector namespaces and document retrieval scopes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Zero-Trust Enforcement Active
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 space-y-1">
          <span className="font-bold">Automated Namespace Filtering:</span> When an employee queries EKA,
          embeddings are checked against the user's role and squad tags before vector retrieval. Documents marked
          as "Restricted" or "Confidential" are completely excluded from the candidate search space, preventing prompt
          injection or accidental leakage.
        </div>
      </div>

      {/* Matrix Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Departmental Scope & Role Permission Entitlements</h2>
          <div className="flex items-center gap-2">
            {(['All', 'Restricted', 'Strict Isolation'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  activeFilter === filter
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Knowledge Scope</th>
                <th className="py-3.5 px-3">Classification</th>
                <th className="py-3.5 px-3 text-center">Employee</th>
                <th className="py-3.5 px-3 text-center">Finance Admin</th>
                <th className="py-3.5 px-3 text-center">HR Admin</th>
                <th className="py-3.5 px-3 text-center">Orion Lead</th>
                <th className="py-3.5 px-3 text-center bg-purple-50/60 text-purple-900">Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPermissions.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{row.category}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{row.scope}</div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.securityLevel === 'Public'
                          ? 'bg-slate-100 text-slate-700'
                          : row.securityLevel === 'Restricted'
                          ? 'bg-blue-100 text-blue-800'
                          : row.securityLevel === 'Confidential'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {row.securityLevel}
                    </span>
                  </td>

                  {/* Employee */}
                  <td className="py-3.5 px-3 text-center">
                    {row.employee ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Finance Admin */}
                  <td className="py-3.5 px-3 text-center">
                    {row.financeAdmin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* HR Admin */}
                  <td className="py-3.5 px-3 text-center">
                    {row.hrAdmin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Orion Lead */}
                  <td className="py-3.5 px-3 text-center">
                    {row.orionAdmin ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>

                  {/* Super Admin */}
                  <td className="py-3.5 px-3 text-center bg-purple-50/40">
                    <CheckCircle2 className="w-4 h-4 text-purple-700 mx-auto font-bold" />
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
