import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from 'lucide-react';
import type { EkaCitation } from '../../mock/mockData';

interface SourceCitationCardProps {
  citation: EkaCitation;
  onOpenDocument?: (docId: string) => void;
}

export const SourceCitationCard: React.FC<SourceCitationCardProps> = ({
  citation,
  onOpenDocument,
}) => {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  const getConfidenceBadge = (conf: EkaCitation['confidence']) => {
    switch (conf) {
      case 'High':
        return (
          <span className="badge-success text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3" /> High Confidence
          </span>
        );
      case 'Needs Review':
        return (
          <span className="badge-warning text-[10px] font-bold">
            Needs Review
          </span>
        );
      case 'Insufficient Evidence':
        return (
          <span className="badge-danger text-[10px] font-bold">
            Insufficient Evidence
          </span>
        );
    }
  };

  return (
    <div className="mt-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-3 text-xs shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 rounded bg-erp-100 text-erp-700 shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-900 truncate">{citation.documentTitle}</span>
          <span className="text-[10px] font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
            {citation.version}
          </span>
        </div>
        <div>{getConfidenceBadge(citation.confidence)}</div>
      </div>

      {/* Excerpt */}
      <p className="mt-2 text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 leading-relaxed font-sans">
        "{citation.excerpt}"
      </p>

      {/* Footer Controls */}
      <div className="mt-2.5 flex items-center justify-between pt-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>Department:</span>
          <span className="font-semibold text-slate-700">{citation.department}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400">Was this answer helpful?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVoted(voted === 'up' ? null : 'up')}
              className={`p-1 rounded hover:bg-slate-200/70 transition-colors ${
                voted === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
              }`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVoted(voted === 'down' ? null : 'down')}
              className={`p-1 rounded hover:bg-slate-200/70 transition-colors ${
                voted === 'down' ? 'text-red-600 bg-red-50' : 'text-slate-400'
              }`}
              title="Not Helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {onOpenDocument && (
            <button
              onClick={() => onOpenDocument(citation.documentId)}
              className="text-erp-600 hover:text-erp-700 hover:underline inline-flex items-center gap-1 font-medium ml-1"
            >
              View Document <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
