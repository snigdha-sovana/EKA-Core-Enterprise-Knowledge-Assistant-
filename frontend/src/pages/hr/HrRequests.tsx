import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EkaRequest } from '../../mock/mockData';
import { RequestDetailModal } from '../finance/RequestDetailModal';

export const HrRequests: React.FC = () => {
  const { requests, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Review' | 'In Progress' | 'Resolved'>('All');
  const [activeRequest, setActiveRequest] = useState<EkaRequest | null>(null);

  const hrRequests = requests.filter(r => r.department === 'HR');

  const filteredRequests = hrRequests.filter(req => {
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesSearch =
      req.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = hrRequests.filter(r => r.status === 'Pending Review').length;
  const inProgressCount = hrRequests.filter(r => r.status === 'In Progress').length;
  const resolvedCount = hrRequests.filter(r => r.status === 'Resolved').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-0.5">
            People & Culture Escalations
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            HR Inquiry & Escalation Queue
          </h1>
          <p className="text-xs text-slate-500">
            Review and resolve employee policy inquiries escalated by EKA due to insufficient evidence or special circumstances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-800 bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-600" />
            {hrRequests.length} Total Inquiries
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 enterprise-card p-4 bg-white">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Employee, ID, or Query..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="enterprise-input pl-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Pending Review', 'In Progress', 'Resolved'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
              {status === 'Pending Review' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Escalation Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Inquiry / Topic</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No HR escalations found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {req.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{req.requestedBy}</div>
                      <div className="text-[10px] text-slate-400">{req.requesterEmail}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <div className="font-medium text-slate-800 truncate" title={req.query}>
                        "{req.query}"
                      </div>
                      {req.response && (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 line-clamp-1">
                          Response: {req.response}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status === 'Resolved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {req.createdAt}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveRequest(req)}
                        className="btn-secondary text-xs py-1 px-3 text-purple-700 hover:bg-purple-50 hover:border-purple-200"
                      >
                        <span>{req.status === 'Resolved' ? 'View Details' : 'Review & Resolve'}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Resolve Modal */}
      {activeRequest && (
        <RequestDetailModal
          request={activeRequest}
          onClose={() => setActiveRequest(null)}
        />
      )}
    </div>
  );
};

export default HrRequests;
