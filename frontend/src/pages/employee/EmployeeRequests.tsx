import React, { useState } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ChevronRight,
  X,
  Sparkles,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EkaRequest } from '../../mock/mockData';

export const EmployeeRequests: React.FC = () => {
  const { requests, setEkaFloatingOpen } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<EkaRequest | null>(null);

  const filteredRequests = requests.filter((r) => {
    // Tab filter
    if (activeTab === 'pending' && r.status !== 'Pending Review') return false;
    if (activeTab === 'in_progress' && r.status !== 'In Progress') return false;
    if (activeTab === 'resolved' && r.status !== 'Resolved') return false;

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.query.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: EkaRequest['status']) => {
    switch (status) {
      case 'Resolved':
        return (
          <span className="badge-success">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'In Progress':
        return (
          <span className="badge-warning">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'Pending Review':
        return (
          <span className="badge-danger">
            <AlertCircle className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  const getPriorityBadge = (p: EkaRequest['priority']) => {
    switch (p) {
      case 'Urgent':
        return <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Urgent</span>;
      case 'High':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">High</span>;
      case 'Normal':
        return <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Normal</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-0.5">
            EKA Assistant Governance
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            My Escalation Requests
          </h1>
          <p className="text-xs text-slate-500">
            Track unanswerable inquiries routed to departmental administrators with real-time audit timelines.
          </p>
        </div>

        <button
          onClick={() => setEkaFloatingOpen(true)}
          className="btn-eka-primary text-xs shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" /> Ask EKA Another Query
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="enterprise-card p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Requests', count: requests.length },
              {
                id: 'pending',
                label: 'Pending Review',
                count: requests.filter((r) => r.status === 'Pending Review').length,
              },
              {
                id: 'in_progress',
                label: 'In Progress',
                count: requests.filter((r) => r.status === 'In Progress').length,
              },
              {
                id: 'resolved',
                label: 'Resolved',
                count: requests.filter((r) => r.status === 'Resolved').length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-erp-600 text-white shadow-xs'
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
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by ID, topic or department..."
            className="enterprise-input text-xs pl-8 py-1.5"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="enterprise-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Request ID</th>
                <th className="px-5 py-3">Inquiry / Query</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-erp-700 whitespace-nowrap">
                      {req.id}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                      <div className="font-semibold text-slate-900 truncate">{req.query}</div>
                      {req.response && (
                        <div className="text-[11px] text-emerald-700 truncate mt-0.5 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Resolved: {req.response}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {req.department}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getPriorityBadge(req.priority)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {req.createdAt}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className="text-erp-600 hover:text-erp-700 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        Timeline <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <ListTodo className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No requests found matching current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Timeline Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-erp-700 bg-erp-50 border border-erp-200 px-2 py-0.5 rounded">
                  {selectedRequest.id}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Escalation Determination Timeline
                </span>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Question overview */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Original Employee Inquiry
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  "{selectedRequest.query}"
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-4">
                  <span>Department: <strong className="text-slate-700 font-semibold">{selectedRequest.department}</strong></span>
                  <span>Assigned Admin: <strong className="text-slate-700 font-semibold">{selectedRequest.assignedAdmin}</strong></span>
                </div>
              </div>

              {/* Resolved Response Card if resolved */}
              {selectedRequest.response && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Official Administrator Resolution
                    </span>
                    {selectedRequest.proposedAsKnowledge && (
                      <span className="badge-eka text-[10px]">
                        <Sparkles className="w-3 h-3" /> Proposed as Company Knowledge
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {selectedRequest.response}
                  </p>
                </div>
              )}

              {/* Timeline Steps */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Lifecycle Progress
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {(selectedRequest.timeline || []).map((step, idx) => {
                    const isLast = idx === (selectedRequest.timeline || []).length - 1;
                    return (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full ring-4 ring-white flex items-center justify-center ${
                            step.stage === 'Resolved'
                              ? 'bg-emerald-500 text-white'
                              : isLast
                              ? 'bg-erp-600 text-white'
                              : 'bg-slate-300 text-white'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>

                        {/* Step Details */}
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              {step.stage}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {step.timestamp}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Handled by <strong className="text-slate-800">{step.actor}</strong>
                          </div>
                          {step.notes && (
                            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-1.5 border border-slate-100">
                              {step.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged under tenant isolation compliance.
              </span>
              <button
                onClick={() => setSelectedRequest(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeRequests;
