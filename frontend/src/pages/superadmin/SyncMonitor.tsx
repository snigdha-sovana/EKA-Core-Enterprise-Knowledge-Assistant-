import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function SyncMonitor() {
  const { syncStatus, syncHistory, runFullSync, ragLearnedChunks, fastForwardSync, addToast } = useApp();
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleManualSync = () => {
    setSyncNotice('Starting 14-day full ERP data & vector index reconciliation...');
    addToast({
      title: '14-Day Sync Initiated',
      message: 'Reconciling 18,492 PostgreSQL ledger records with ChromaDB namespaces...',
      type: 'info',
    });
    runFullSync(() => {
      setSyncNotice('Sync complete! All PostgreSQL ledgers & ChromaDB namespaces reconciled (Freshness 100%).');
      addToast({
        title: '14-Day Reconciliation Complete',
        message: 'All vector collections are 100% fresh with zero drift.',
        type: 'success',
      });
      setTimeout(() => setSyncNotice(null), 4000);
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
            <RefreshCw className="w-4 h-4" />
            Reconciliation Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-900">14-Day Automated Sync Monitor</h1>
          <p className="text-sm text-slate-500">
            Continuous background synchronization between PostgreSQL business ledgers and EKA ChromaDB vector collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSync}
            disabled={syncStatus?.isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/60 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
            {syncStatus?.isSyncing ? `Reconciling Chunks (${syncStatus.syncProgress}%)...` : 'Run Full Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync in-progress banner */}
      {syncStatus?.isSyncing && (
        <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-4 animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="text-sm font-bold">
              14-Day Reconciliation in Progress ({syncStatus.syncProgress}%)
            </div>
            <div className="text-xs text-emerald-100">
              Scanning 9 policy documents and reconciling 18,492 PostgreSQL ledger rows into ChromaDB namespace...
            </div>
            <div className="w-full bg-emerald-700/60 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${syncStatus.syncProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {syncNotice && !syncStatus?.isSyncing && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {syncNotice}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="enterprise-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vector Freshness</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{syncStatus?.freshness || 94}%</span>
            <span className="text-xs font-bold text-emerald-600">Zero Drift</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Target: ≥90% freshness SLA</div>
        </div>

        <div className="enterprise-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Sync Completed</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">{syncStatus?.lastSync || 'Sep 01, 2026'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Automated 14-day schedule</div>
        </div>

        <div className="enterprise-card p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Status</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-lg font-bold text-slate-900">Active & Operational</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">PostgreSQL + Ollama Qwen2.5</div>
        </div>
      </div>

      {/* Real-Time Continuous Learning & Vector Ingestion Queue */}
      <div className="enterprise-card overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">ERP-Driven Continuous RAG Learning Queue</h2>
          </div>
          <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Autonomous Vector Synthesis
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {ragLearnedChunks.map((chunk) => {
            const isIngesting = chunk.status === 'ingesting';
            const isSynced = chunk.status === 'synced';
            const isPending = chunk.status === 'pending_admin';

            return (
              <div key={chunk.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        isSynced
                          ? 'bg-emerald-100 text-emerald-800'
                          : isIngesting
                          ? 'bg-purple-100 text-purple-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isSynced ? '✨ Vector Indexed' : isIngesting ? `⚡ Ingesting (${chunk.countdownSeconds}s)` : '⏳ Awaiting Admin'}
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {chunk.requestId}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{chunk.department} Exception</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isIngesting && (
                      <button
                        onClick={() => {
                          fastForwardSync(chunk.requestId);
                          addToast({
                            title: 'Vector Sync Accelerated',
                            message: `Hot-reloaded knowledge chunk for ${chunk.requestId} directly into ChromaDB.`,
                            type: 'purple',
                          });
                        }}
                        className="btn-secondary text-xs py-1 px-2.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Sync Now ⚡</span>
                      </button>
                    )}

                    <span className="text-xs text-slate-400 font-mono">Target: {chunk.version}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                  <span className="font-semibold text-slate-500">Employee Inquiry: </span>
                  <span className="font-medium italic">"{chunk.query}"</span>
                </div>

                {chunk.responseSnippet && (
                  <div className="text-xs text-emerald-900 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                    <span className="font-bold text-emerald-700">Synthesized Knowledge Chunk: </span>
                    <span>{chunk.responseSnippet}</span>
                  </div>
                )}

                {isIngesting && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-purple-700 font-semibold">
                      <span>Embedding into ChromaDB namespace 'company_finance_v3.3'...</span>
                      <span>{Math.round(((6 - chunk.countdownSeconds) / 6) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${Math.round(((6 - chunk.countdownSeconds) / 6) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync History Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Sync Execution Audit Trail</h2>
          <span className="text-xs text-slate-500">Immutable 14-Day History</span>
        </div>

        <div className="divide-y divide-slate-100">
          {syncHistory.map(record => (
            <div key={record.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                    {record.status}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{record.scope}</span>
                  <span className="text-xs text-slate-400">ID: {record.id}</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {record.timestamp}
                  </span>
                  <span className="font-semibold text-slate-700">Duration: {record.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  +{record.addedCount} Added
                </span>
                <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                  {record.changedCount} Modified
                </span>
                <span className="text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  -{record.removedCount} Pruned
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-1 pl-3 border-l-2 border-slate-200 text-xs text-slate-600">
                {record.details.map((detail, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
