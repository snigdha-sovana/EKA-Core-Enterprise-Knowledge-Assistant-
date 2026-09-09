import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { KnowledgeDocument, DocumentVersion } from '../../mock/mockData';
import {
  Search,
  Filter,
  FileText,
  Lock,
  Globe,
  Clock,
  CheckCircle,
  History,
  X,
  Eye,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function KnowledgeHub() {
  const { documents } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'HR' | 'Finance' | 'Projects' | 'Company'>('All');
  const [activeDoc, setActiveDoc] = useState<KnowledgeDocument | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openDrawer = (doc: KnowledgeDocument) => {
    setActiveDoc(doc);
    setSelectedVersion(doc.versionHistory[0] || null);
  };

  const closeDrawer = () => {
    setActiveDoc(null);
    setSelectedVersion(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600">
            <Layers className="w-4 h-4" />
            Central Knowledge Repository
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Hub & Version Governance</h1>
          <p className="text-sm text-slate-500">
            Master repository of enterprise policies, engineering runbooks, and audit-ready document versions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {documents.length} Indexed in Vector DB
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search policies, specs, or summaries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Finance', 'HR', 'Projects', 'Company'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map(doc => (
          <div
            key={doc.id}
            className="enterprise-card p-5 flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => openDrawer(doc)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    doc.category === 'Finance'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : doc.category === 'HR'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : doc.category === 'Projects'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {doc.category}
                </span>

                <div className="flex items-center gap-1.5">
                  {doc.isRestricted ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Lock className="w-2.5 h-2.5" />
                      Restricted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Globe className="w-2.5 h-2.5" />
                      Company
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                    {doc.version}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {doc.summary}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{doc.lastUpdated}</span>
              </div>

              <div className="flex items-center gap-1 font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
                <History className="w-3.5 h-3.5" />
                <span>Versions ({doc.versionHistory.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Version History & Document Drawer */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                    {activeDoc.version}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {activeDoc.category} • {activeDoc.department}
                  </span>
                  {activeDoc.isRestricted && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Restricted
                    </span>
                  )}
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

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                  Executive Summary
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">{activeDoc.summary}</p>
              </div>

              {/* Version History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Version History Audit Trail
                  </h3>
                  <span className="text-xs text-slate-500">
                    {activeDoc.versionHistory.length} Recorded Releases
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeDoc.versionHistory.map(v => (
                    <div
                      key={v.version}
                      onClick={() => setSelectedVersion(v)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedVersion?.version === v.version
                          ? 'border-purple-600 bg-purple-50/60 shadow-sm'
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

              {/* Document Excerpt / Content Preview */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Indexed Document Preview ({selectedVersion?.version || activeDoc.version})
                </h3>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto border border-slate-800">
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
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
