import React, { useState } from 'react';
import {
  FileText,
  Search,
  History,
  Lock,
  Globe,
  Clock,
  ChevronRight,
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  Download,
  Share2,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { KnowledgeDocument, DocumentVersion } from '../../mock/mockData';

export const FinanceDocuments: React.FC = () => {
  const { documents, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState<KnowledgeDocument | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isCreatingAmendment, setIsCreatingAmendment] = useState(false);
  const [amendmentNotice, setAmendmentNotice] = useState<string | null>(null);

  // Filter for Finance documents
  const financeDocs = documents.filter(d => d.department === 'Finance');

  const filtered = financeDocs.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.version.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const openDrawer = (doc: KnowledgeDocument) => {
    setActiveDoc(doc);
    setSelectedVersion(doc.versionHistory[0] || null);
  };

  const closeDrawer = () => {
    setActiveDoc(null);
    setSelectedVersion(null);
  };

  const handleProposeAmendment = () => {
    setAmendmentNotice('New policy revision draft initialized: Travel & Reimbursement Policy v3.3-draft with client visit escalation clauses.');
    setIsCreatingAmendment(false);
    setTimeout(() => setAmendmentNotice(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
            Finance & Accounts Knowledge Base
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Finance Policies & Governance Documentation
          </h1>
          <p className="text-xs text-slate-500">
            Governed statutory policies, expense reimbursement guidelines, and audit runbooks indexed in EKA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingAmendment(true)}
            className="btn-erp-primary text-xs py-2 px-3.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Policy Amendment</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {amendmentNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {amendmentNotice}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 enterprise-card p-4 bg-white">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search finance policies, limits, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="enterprise-input pl-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{filtered.length} Governed Documents</span>
          <span>•</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 100% Vector Synced
          </span>
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(doc => (
          <div
            key={doc.id}
            onClick={() => openDrawer(doc)}
            className="enterprise-card p-5 bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {doc.category}
                </span>

                <div className="flex items-center gap-1.5">
                  {doc.isRestricted ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Restricted
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" /> Company
                    </span>
                  )}
                  <span className="font-mono text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {doc.version}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {doc.summary}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {doc.lastUpdated}
              </span>

              <div className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                <History className="w-3.5 h-3.5" />
                <span>Versions ({doc.versionHistory.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Version History Drawer */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                    {activeDoc.version}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {activeDoc.department} • {activeDoc.accessLevel}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{activeDoc.title}</h2>
                <p className="text-xs text-slate-500">Document Owner: {activeDoc.owner}</p>
              </div>

              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                  Policy Scope & Summary
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">{activeDoc.summary}</p>
              </div>

              {/* Version History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Version History Audit Trail
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeDoc.versionHistory.length} Releases
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeDoc.versionHistory.map(v => (
                    <div
                      key={v.version}
                      onClick={() => setSelectedVersion(v)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedVersion?.version === v.version
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{v.version}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.status === 'current'
                                ? 'bg-emerald-100 text-emerald-800'
                                : v.status === 'previous'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{v.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-2 font-medium">{v.changes}</p>
                      <div className="mt-1 text-[11px] text-slate-400">Author: {v.author}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indexed Markdown Content Preview */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Full Policy Document Preview ({selectedVersion?.version || activeDoc.version})
                </h3>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-slate-800">
                  {activeDoc.content}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Vector ID: <span className="font-mono text-slate-700">{activeDoc.id}</span>
              </div>
              <button
                onClick={closeDrawer}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose Amendment Modal */}
      {isCreatingAmendment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Propose Policy Revision</h3>
              </div>
              <button onClick={() => setIsCreatingAmendment(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Policy</label>
                <select className="enterprise-input w-full">
                  <option>Travel & Reimbursement Policy v3.2</option>
                  <option>Corporate Credit Card & Procurement Policy v2.1</option>
                  <option>Finance Operations & Statutory Audit Runbook v1.4</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Proposed Version</label>
                <input type="text" readOnly value="v3.3-draft" className="enterprise-input w-full bg-slate-50 font-mono" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Summary of Policy Changes</label>
                <textarea
                  rows={3}
                  defaultValue="Add provision for international client on-site visits allowing lodging up to $280/night with VP prior email authorization."
                  className="enterprise-input w-full resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setIsCreatingAmendment(false)} className="btn-secondary text-xs py-1.5 px-3">
                Cancel
              </button>
              <button onClick={handleProposeAmendment} className="btn-erp-primary text-xs py-1.5 px-4 bg-blue-600 hover:bg-blue-700">
                Submit Candidate Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDocuments;
