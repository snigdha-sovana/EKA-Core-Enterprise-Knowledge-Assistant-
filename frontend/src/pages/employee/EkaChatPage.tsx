import React from 'react';
import { EkaChatPanel } from '../../components/eka/EkaChatPanel';

export const EkaChatPage: React.FC = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-eka-600 mb-0.5">
            AI Colleague Workspace
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            EKA Assistant
          </h1>
          <p className="text-xs text-slate-500">
            Enterprise Knowledge Assistant grounded in NexoraERP documentation and policy handbooks.
          </p>
        </div>
      </div>

      <EkaChatPanel isFullPage={true} />
    </div>
  );
};

export default EkaChatPage;
