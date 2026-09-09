import React, { useState } from 'react';
import {
  CreditCard,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  ExternalLink,
  Receipt,
  Building,
  Plane,
  Coffee,
  Wifi,
  X,
  Send,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ExpenseClaim {
  id: string;
  category: string;
  icon: any;
  description: string;
  amount: string;
  date: string;
  receiptName: string;
  status: 'Approved' | 'Pending Audit' | 'Policy Exception' | 'Reimbursed';
  policyNote?: string;
}

const INITIAL_CLAIMS: ExpenseClaim[] = [
  {
    id: 'EXP-2026-0142',
    category: 'Travel & Lodging',
    icon: Plane,
    description: 'Client Onboarding Accommodation — Zurich Tech Summit',
    amount: '$280.00',
    date: '02 Sep 2026',
    receiptName: 'hotel_zurich_invoice_0926.pdf',
    status: 'Approved',
    policyNote: 'Approved under Travel Policy v3.3 ($280/night high-cost metro exception)',
  },
  {
    id: 'EXP-2026-0098',
    category: 'Meals & Hospitality',
    icon: Coffee,
    description: 'Sprint 14 Architecture Review Team Dinner',
    amount: '$64.20',
    date: '28 Aug 2026',
    receiptName: 'bistro_receipt_aug28.pdf',
    status: 'Reimbursed',
    policyNote: 'Compliant with $35/head meal ceiling',
  },
  {
    id: 'EXP-2026-0085',
    category: 'WFH & Connectivity',
    icon: Wifi,
    description: 'Monthly High-Speed Fiber Internet Allowance (August)',
    amount: '$45.00',
    date: '15 Aug 2026',
    receiptName: 'broadband_bill_aug.pdf',
    status: 'Reimbursed',
    policyNote: 'Standard monthly WFH subsidy',
  },
  {
    id: 'EXP-2026-0041',
    category: 'Local Commute',
    icon: Building,
    description: 'Airport Transit to Bangalore Hub — Client Workshop',
    amount: '$32.50',
    date: '01 Aug 2026',
    receiptName: 'uber_receipt_blr_airport.pdf',
    status: 'Reimbursed',
    policyNote: 'Pre-authorized travel booking',
  },
];

export default function ExpenseClaimsPage() {
  const { setEkaFloatingOpen, addToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [claims, setClaims] = useState<ExpenseClaim[]>(INITIAL_CLAIMS);
  const [category, setCategory] = useState('Travel & Lodging');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const newClaim: ExpenseClaim = {
      id: `EXP-2026-0${claims.length + 150}`,
      category,
      icon: CreditCard,
      description: description || 'Business expense',
      amount: amount.startsWith('$') ? amount : `$${amount}`,
      date: 'Today',
      receiptName: 'receipt_upload_temp.pdf',
      status: 'Pending Audit',
      policyNote: 'Submitted to Finance Audit queue',
    };

    setClaims([newClaim, ...claims]);
    setModalOpen(false);
    setDescription('');
    setAmount('');
    addToast('Expense claim filed. Forwarded to Finance Admin Priya Sharma.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Finance & Corporate Claims
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Reimbursement Claims</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit business travel and operational claims governed by Company Travel & Expense Policy v3.3
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: Travel Policy Limits
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            File New Claim
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-erp-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Pending Audit</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">$0.00</span>
          </div>
          <span className="text-[10px] text-emerald-600 block mt-1.5 font-semibold">
            All submitted claims reviewed
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Approved This Month</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">$280.00</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5 font-medium">
            Zurich Hotel (EXP-2026-0142)
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-purple-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Reimbursed YTD</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">$3,840.00</span>
          </div>
          <span className="text-[10px] text-purple-600 block mt-1.5 font-semibold">
            Direct deposit to HDFC Bank
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Corporate Card Balance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">$180.00</span>
          </div>
          <span className="text-[10px] text-amber-600 block mt-1.5 font-semibold">
            Limit: $2,500.00
          </span>
        </div>
      </div>

      {/* Featured Policy Notice Linking to Ticket FIN-2026-0142 */}
      <div className="enterprise-card p-5 bg-gradient-to-r from-emerald-50/70 via-erp-50/50 to-white border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800">EKA Learning Loop Active &bull; Ticket FIN-2026-0142</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Policy v3.3</span>
            </div>
            <p className="text-xs text-slate-700 font-medium mt-0.5">
              Your accommodation claim for Zurich ($280.00/night) has been approved under the newly ratified <strong>Company Travel Policy v3.3</strong> high-cost European metro clause.
            </p>
          </div>
        </div>

        <button
          onClick={() => setEkaFloatingOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-center"
        >
          View Policy v3.3 In EKA <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expense Claims Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Expense Reports & Invoices</h3>
            <p className="text-xs text-slate-500">GST-compliant receipts and approved reimbursement ledger</p>
          </div>
          <button className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download Tax Statement
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Expense Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.map((claim) => {
                const CategoryIcon = claim.icon || CreditCard;
                return (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-erp-700">
                      {claim.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <CategoryIcon className="w-3.5 h-3.5 text-erp-600" />
                        {claim.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{claim.description}</span>
                      {claim.policyNote && (
                        <span className="text-[11px] text-slate-500">{claim.policyNote}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:text-erp-700 cursor-pointer">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        {claim.receiptName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm">
                      {claim.amount}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {claim.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        claim.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : claim.status === 'Reimbursed'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-erp-600" />
                <h3 className="text-base font-bold text-slate-900">File New Reimbursement Claim</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                >
                  <option>Travel & Lodging</option>
                  <option>Meals & Hospitality</option>
                  <option>WFH & Connectivity</option>
                  <option>Local Commute / Transit</option>
                  <option>Software & Hardware Subsidy</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Claim Amount (USD)</label>
                <input
                  type="text"
                  placeholder="$150.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Justification / Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Travel to client site for deployment integration..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Receipt Attachment</span>
                <input type="file" className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-erp-50 file:text-erp-700" />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to Finance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
