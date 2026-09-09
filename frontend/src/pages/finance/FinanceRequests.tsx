import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EkaRequest } from '../../mock/mockData';
import { RequestDetailModal } from './RequestDetailModal';

export const FinanceRequests: React.FC = () => {
  const { requests } = useApp();
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'resolved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<EkaRequest | null>(null);

  // Filter finance requests
  const financeRequests = requests.filter(r => r.department === 'Finance');

  const filteredRequests = financeRequests.filter(r => {
    if (activeTab === 'pending' && r.status !== 'Pending Review') return false;
    if (activeTab === 'in_progress' && r.status !== 'In Progress') return false;
    if (activeTab === 'resolved' && r.status !== 'Resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.query.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
            Finance & Accounts Administration
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            EKA Requests & Escalations Queue
          </h1>
          <p className="text-xs text-slate-500">
            Review ambiguous policy queries escalated by employees, issue determinations, and propose company knowledge updates.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="badge-warning font-bold">
            {financeRequests.filter(r => r.status === 'Pending Review').length} Pending Audits
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="enterprise-card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              {
                id: 'pending',
                label: 'Pending Review',
                count: financeRequests.filter(r => r.status === 'Pending Review').length,
              },
              {
                id: 'in_progress',
                label: 'In Progress',
                count: financeRequests.filter(r => r.status === 'In Progress').length,
              },
              {
                id: 'resolved',
                label: 'Resolved',
                count: financeRequests.filter(r => r.status === 'Resolved').length,
              },
              { id: 'all', label: 'All Queries', count: financeRequests.length },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search query, employee or ID..."
            className="enterprise-input text-xs pl-8 py-1.5"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="enterprise-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Request ID</th>
                <th className="px-5 py-3.5">Employee & Inquiry</th>
                <th className="px-5 py-3.5">Topic</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filteredRequests.length > 0 ? (
                filteredRequests.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {req.id}
                    </td>

                    <td className="px-5 py-4 max-w-sm md:max-w-md">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{req.requestedBy}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({req.requesterEmail})</span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium line-clamp-2">
                        "{req.query}"
                      </div>
                      {req.response && (
                        <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Determination: {req.response}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                        Travel & Reimbursement
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {req.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {req.createdAt}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`badge-${
                          req.status === 'Resolved'
                            ? 'success'
                            : req.status === 'In Progress'
                            ? 'warning'
                            : 'danger'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                          req.status === 'Resolved'
                            ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                            : 'text-white bg-blue-600 hover:bg-blue-700 shadow-xs'
                        }`}
                      >
                        {req.status === 'Resolved' ? 'View Resolution' : 'Review & Resolve'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No requests found in this queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default FinanceRequests;
