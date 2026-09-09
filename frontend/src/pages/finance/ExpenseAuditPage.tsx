import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Filter,
  Download,
  Receipt,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldAlert,
  Building,
  User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuditClaim {
  id: string;
  employee: string;
  department: string;
  category: string;
  amount: string;
  date: string;
  receiptName: string;
  complianceStatus: 'Compliant' | 'Policy Exception' | 'Over Ceiling';
  policyReference: string;
  auditState: 'Approved' | 'Under Review' | 'Flagged';
}

const INITIAL_AUDIT_CLAIMS: AuditClaim[] = [
  {
    id: 'EXP-2026-0142',
    employee: 'Snigdha Patra',
    department: 'Engineering (Orion)',
    category: 'Travel & Lodging',
    amount: '$280.00 / night',
    date: '02 Sep 2026',
    receiptName: 'hotel_zurich_invoice_0926.pdf',
    complianceStatus: 'Policy Exception',
    policyReference: 'Exceeded Policy v3.2 ($250). Approved under ratified Policy v3.3 ($280 metro ceiling).',
    auditState: 'Approved',
  },
  {
    id: 'EXP-2026-0148',
    employee: 'Vikram Mehta',
    department: 'Sales & Growth',
    category: 'Client Hospitality',
    amount: '$420.00',
    date: '05 Sep 2026',
    receiptName: 'dinner_invoice_mumbai.pdf',
    complianceStatus: 'Compliant',
    policyReference: 'Within pre-authorized VP entertainment budget.',
    auditState: 'Under Review',
  },
  {
    id: 'EXP-2026-0151',
    employee: 'Ananya Deshmukh',
    department: 'Product Design',
    category: 'Software Subscription',
    amount: '$95.00',
    date: '06 Sep 2026',
    receiptName: 'figma_enterprise_seat.pdf',
    complianceStatus: 'Compliant',
    policyReference: 'Pre-approved annual SaaS license list.',
    auditState: 'Under Review',
  },
  {
    id: 'EXP-2026-0139',
    employee: 'Kavya Iyer',
    department: 'Human Resources',
    category: 'Offsite & Training',
    amount: '$180.00',
    date: '30 Aug 2026',
    receiptName: 'leadership_hall_booking.pdf',
    complianceStatus: 'Compliant',
    policyReference: 'Annual HR training allotment.',
    auditState: 'Approved',
  },
];

export default function ExpenseAuditPage() {
  const { setEkaFloatingOpen, addToast } = useApp();
  const [claims, setClaims] = useState<AuditClaim[]>(INITIAL_AUDIT_CLAIMS);
  const [search, setSearch] = useState('');

  const handleApprove = (id: string) => {
    setClaims(claims.map(c => c.id === id ? { ...c, auditState: 'Approved' } : c));
    addToast(`Claim ${id} verified and released for automated reimbursement deposit.`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Finance Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Audit & Approvals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit corporate expense claims, verify receipts against Travel Policy limits, and govern compliance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Audit with EKA Guardrails
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export Audit Ledger
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Pending Audit Queue</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">2</span>
            <span className="text-xs text-slate-400">claims</span>
          </div>
          <span className="text-[10px] text-amber-700 font-bold block mt-1">Requires reviewer verification</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Policy Exceptions (Sep)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">1</span>
            <span className="text-xs text-slate-400">ratified</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-1">EXP-2026-0142 (Zurich Summit)</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Disbursed This Month</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">$4,850</span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">100% On-Time SLA</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Policy Compliance Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">99.4%</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Against Policy v3.3</span>
        </div>
      </div>

      {/* Audit Claims Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Corporate Claims Verification Ledger</h3>
            <p className="text-xs text-slate-500">Cross-referenced with EKA Travel & Expense Policy Rules</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee or claim..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-erp-500/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Policy Compliance Check</th>
                <th className="py-3 px-4">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims
                .filter(c => !search || c.employee.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
                .map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-erp-700">
                      {c.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{c.employee}</span>
                      <span className="text-[11px] text-slate-500">{c.department}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {c.category}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {c.amount}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        {c.receiptName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.complianceStatus === 'Compliant'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {c.complianceStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{c.policyReference}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.auditState === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setEkaFloatingOpen(true)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Review with EKA"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          </button>
                        </div>
                      )}
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
