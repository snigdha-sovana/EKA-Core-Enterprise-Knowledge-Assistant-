import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Save,
  ChevronRight,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EkaRequest } from '../../mock/mockData';

interface RequestDetailModalProps {
  request: EkaRequest;
  onClose: () => void;
}

const RESPONSE_TEMPLATES = [
  {
    label: 'Approve Exception (Tier-1 Client)',
    text: 'Approved exception: Hotel accommodation up to $280/night is permitted for verified Tier-1 client visits exceeding 3 days with VP prior email signoff.',
    proposeKnowledge: true,
  },
  {
    label: 'Enforce Standard Policy Cap',
    text: 'Standard policy enforced: Maximum reimbursement is strictly capped at the Tier-1 limit ($200/night). Special overage was not authorized.',
    proposeKnowledge: false,
  },
  {
    label: 'Request Client Agenda / Quotes',
    text: 'Clarification requested: Please attach the confirmed client meeting agenda and comparative booking quotes to substantiate overage.',
    proposeKnowledge: false,
  },
];

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  onClose,
}) => {
  const { resolveRequest, setEkaFloatingOpen, setActiveEkaQuery, fastForwardSync } = useApp();

  const [responseText, setResponseText] = useState(
    request.response ||
      'Approved exception: Hotel accommodation up to $280/night is permitted for verified Tier-1 client visits exceeding 3 days with VP prior email signoff.'
  );
  const [proposeAsKnowledge, setProposeAsKnowledge] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isResolvedSuccess, setIsResolvedSuccess] = useState(request.status === 'Resolved');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleApplyTemplate = (template: typeof RESPONSE_TEMPLATES[0]) => {
    setResponseText(template.text);
    setProposeAsKnowledge(template.proposeKnowledge);
  };

  const handleResolve = () => {
    if (!responseText.trim()) return;
    setIsResolving(true);

    setTimeout(() => {
      resolveRequest(request.id, responseText, proposeAsKnowledge);
      setIsResolving(false);
      setIsResolvedSuccess(true);
      setActionNotice(
        proposeAsKnowledge
          ? 'Ticket resolved! RAG continuous learning pipeline started (6s vector indexing countdown active).'
          : 'Request resolved and official determination communicated to employee.'
      );
    }, 400);
  };

  const handleSaveDraft = () => {
    setActionNotice('Draft response saved to local queue.');
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleEscalate = () => {
    setIsResolving(true);
    setTimeout(() => {
      resolveRequest(
        request.id,
        'Escalated to Executive Finance VP & Legal Review for high-value corporate exception consideration.',
        false
      );
      setIsResolving(false);
      setIsResolvedSuccess(true);
      setActionNotice('Request escalated to Executive VP level.');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {request.id}
            </span>
            <span className="text-sm font-bold text-slate-900">
              Departmental Request Resolution
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                request.status === 'Resolved' || isResolvedSuccess
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isResolvedSuccess ? 'Resolved' : request.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Employee Request Information */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {request.requestedBy.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{request.requestedBy}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{request.requesterEmail}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400">Department:</span>
                <span className="text-xs font-bold text-slate-700 ml-1">{request.department}</span>
              </div>
            </div>

            <div className="mt-3 text-xs font-semibold text-slate-900 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
              "{request.query}"
            </div>
          </div>

          {/* EKA Confidence State & Original Context */}
          <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                EKA Evaluation: Insufficient Evidence in Policy
              </span>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                Confidence: Abstained
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              The employee asked to exceed normal accommodation limits ($200/night). The current active <strong>Travel & Reimbursement Policy v3.2</strong> sets ceilings but omits explicit client exception workflows, requiring administrator determination.
            </p>
          </div>

          {/* Preset Quick Templates */}
          {!isResolvedSuccess && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                Preset Quick Templates:
              </label>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 transition-all text-slate-700"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Response Editor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Administrator Determination / Response</span>
              <span className="text-[10px] font-normal text-slate-400">This answer will be delivered to employee</span>
            </label>

            <textarea
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              disabled={isResolvedSuccess}
              placeholder="Enter official departmental response..."
              className="w-full enterprise-input text-xs font-medium leading-relaxed resize-none p-3"
            />
          </div>

          {/* Propose as Company Knowledge Toggle */}
          <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <input
              type="checkbox"
              id="proposeKnowledge"
              checked={proposeAsKnowledge}
              onChange={(e) => setProposeAsKnowledge(e.target.checked)}
              disabled={isResolvedSuccess}
              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5 cursor-pointer"
            />
            <label htmlFor="proposeKnowledge" className="cursor-pointer select-none">
              <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Propose this response as Company Knowledge update
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Automatically submits this determination to the Knowledge Hub as a candidate update for <strong>Travel & Reimbursement Policy v3.3-draft</strong> to prevent future escalations.
              </div>
            </label>
          </div>

          {/* Action Notification Alert */}
          {actionNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900 font-bold">
                  {actionNotice}
                </div>
              </div>
              {proposeAsKnowledge && (
                <div className="text-[11px] text-emerald-800 pl-7 leading-relaxed">
                  The continuous learning pipeline is embedding this resolution into ChromaDB. Once indexed, employee inquiries regarding client accommodation will be answered automatically with zero ticket creation.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-3.5"
          >
            {isResolvedSuccess ? 'Done' : 'Cancel'}
          </button>

          {isResolvedSuccess ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fastForwardSync(request.id);
                  setActionNotice('Vector store instantly synchronized! Active in ChromaDB.');
                }}
                className="btn-secondary text-xs py-1.5 px-3 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Fast-Forward Sync ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveEkaQuery('Can I claim accommodation above the normal limit for a client visit next month?');
                  setEkaFloatingOpen(true);
                }}
                className="btn-eka-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test in EKA Assistant →</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-secondary text-xs py-1.5 px-3 text-slate-700 hover:bg-slate-200"
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>

              <button
                type="button"
                onClick={handleEscalate}
                disabled={isResolving}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-amber-600" /> Escalate
              </button>

              <button
                type="button"
                onClick={handleResolve}
                disabled={isResolving || !responseText.trim()}
                className="btn-erp-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 shadow-xs"
              >
                {isResolving ? (
                  <span>Resolving Request...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolve Request</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RequestDetailModal;
