import React, { useState } from 'react';
import {
  FileText,
  Search,
  BookOpen,
  Lock,
  Globe,
  Clock,
  ChevronRight,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { KnowledgeDocument } from '../../mock/mockData';

export const EmployeeDocuments: React.FC = () => {
  const { documents, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'HR' | 'Finance' | 'Projects' | 'Company'>('All');
  const [activeDoc, setActiveDoc] = useState<KnowledgeDocument | null>(null);

  // Filter documents accessible to employee
  const accessibleDocs = documents.filter(doc => {
    if (doc.accessLevel === 'Company') return true;
    if (doc.accessLevel === 'Project Orion Only' && currentUser.projects.includes('Project Orion')) return true;
    return false;
  });

  const filtered = accessibleDocs.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-0.5">
            Enterprise Knowledge Base
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Company Policies & Knowledge Library
          </h1>
          <p className="text-xs text-slate-500">
            Official company documentation, travel guidelines, and engineering handbooks verified by EKA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            {accessibleDocs.length} Verified Policies
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 enterprise-card p-4 bg-white">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search company policies, leave rules, travel..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="enterprise-input pl-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Finance', 'HR', 'Projects', 'Company'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(doc => (
          <div
            key={doc.id}
            onClick={() => setActiveDoc(doc)}
            className="enterprise-card p-5 bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {doc.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
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
                <Clock className="w-3.5 h-3.5" /> Effective: {doc.effectiveDate}
              </span>

              <div className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                <span>Read Policy</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Document Reader Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Header */}
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
                <p className="text-xs text-slate-500">Document Owner: {activeDoc.owner} • Last Updated: {activeDoc.lastUpdated}</p>
              </div>

              <button
                onClick={() => setActiveDoc(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
                  Summary
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">{activeDoc.summary}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Official Policy Content
                </h3>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto border border-slate-800">
                  {activeDoc.content}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Grounded in EKA Vector Index (<span className="font-mono text-slate-700">{activeDoc.id}</span>)
              </div>
              <button
                onClick={() => setActiveDoc(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDocuments;
