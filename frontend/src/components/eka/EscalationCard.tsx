import React from 'react';
import {
  FileText,
  AlertOctagon,
  ArrowRight,
  Clock,
  Building2,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EscalationCardProps {
  query: string;
  department: 'Finance' | 'HR' | 'Projects';
  message: string;
  onEscalated?: (requestId: string) => void;
  existingRequestId?: string;
}

export const EscalationCard: React.FC<EscalationCardProps> = ({
  query,
  department,
  message,
  onEscalated,
  existingRequestId,
}) => {
  const { addRequest, requests } = useApp();

  const handleEscalateClick = () => {
    const newId = addRequest({
      query,
      department,
      priority: 'Normal',
    });
    if (onEscalated) {
      onEscalated(newId);
    }
  };

  // Check if this request has already been escalated
  const matchedRequest = requests.find(r => 
    r.id === existingRequestId || 
    (r.query.toLowerCase().trim() === query.toLowerCase().trim() && r.department === department)
  );

  return (
    <div className="mt-3 bg-red-50/70 border border-red-200/80 rounded-xl p-4 shadow-xs">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-red-100">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-red-100 text-red-700">
            <AlertOctagon className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-red-900 uppercase tracking-wider">
            Insufficient Evidence Detected
          </span>
        </div>
        <span className="badge-danger text-[10px] uppercase font-bold">
          Abstained from hallucination
        </span>
      </div>

      {/* Explanation Text */}
      <p className="text-xs text-slate-700 leading-relaxed mb-3">
        {message}
      </p>

      {/* Relevant partial document reference */}
      <div className="bg-white/80 border border-red-100 rounded-lg p-2.5 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>Consulted: <strong className="text-slate-900 font-semibold">{department} Travel & Reimbursement Policy v3.2</strong></span>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
          Section 2.3
        </span>
      </div>

      {/* Action / State Button */}
      {matchedRequest ? (
        <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Escalation Created: <code className="text-erp-700 bg-erp-50 px-1.5 py-0.2 rounded font-mono">{matchedRequest.id}</code></span>
                <span className="badge-warning text-[10px] py-0">{matchedRequest.status}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" /> Routed to {department} Admin ({matchedRequest.assignedAdmin})
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" /> {matchedRequest.createdAt}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-600">
            Send this query to the departmental lead for official determination:
          </div>
          <button
            onClick={handleEscalateClick}
            className="btn-erp-primary text-xs py-1.5 px-3.5 bg-erp-700 hover:bg-erp-800"
          >
            <span>Request {department} Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
