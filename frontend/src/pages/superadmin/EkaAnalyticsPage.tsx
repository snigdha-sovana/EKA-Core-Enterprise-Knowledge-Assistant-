import React from 'react';
import {
  BarChart3,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function EkaAnalyticsPage() {
  const { setEkaFloatingOpen, addToast } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            AI Guardrail & Telemetry Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-900">EKA Analytics & Retrieval Telemetry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query throughput, vector latency histograms, Redis caching hits, and departmental inquiry distribution
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEkaFloatingOpen(true);
              addToast({
                title: 'Telemetry Assistant Connected',
                message: 'Streaming real-time vector retrieval latencies and Prometheus metric collectors.',
                type: 'purple',
              });
            }}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Query Telemetry Assistant
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Live Metrics Stream Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white border-t-2 border-t-purple-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">24h Query Volume</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">1,420</span>
            <span className="text-xs text-emerald-600 font-bold">+14.2%</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">98.9% availability SLA</span>
        </div>

        <div className="enterprise-card p-4 bg-white border-t-2 border-t-erp-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Avg Retrieval Latency</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-erp-600">18.2</span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">ChromaDB HNSW + BM25</span>
        </div>

        <div className="enterprise-card p-4 bg-white border-t-2 border-t-emerald-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Redis Cache Hit Ratio</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">84.6%</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Sub-5ms cached responses</span>
        </div>

        <div className="enterprise-card p-4 bg-white border-t-2 border-t-amber-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Safe Abstention Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">4.1%</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Threshold: confidence &lt; 0.65</span>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Departmental Inquiry Distribution */}
        <div className="lg:col-span-2 enterprise-card p-6 bg-white space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Departmental Inquiry Distribution</h3>
              <p className="text-xs text-slate-500">RAG pipeline query volume segmented by organizational unit</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Last 30 Days</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-800">Engineering & Project Orion</span>
                <span className="text-erp-700">640 queries (45.1%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-erp-600 h-full rounded-full w-[45.1%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-800">Finance & Corporate Travel</span>
                <span className="text-purple-700">380 queries (26.8%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full w-[26.8%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-800">Human Resources & Attendance</span>
                <span className="text-emerald-700">290 queries (20.4%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[20.4%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-800">Executive & Governance</span>
                <span className="text-amber-700">110 queries (7.7%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-[7.7%]" />
              </div>
            </div>
          </div>

          {/* Infrastructure Health Checklist */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-0.5">Vector Store</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ChromaDB Local Port 8000
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-0.5">Generator Engine</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ollama Qwen 2.5:1.5b
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500 block mb-0.5">Reranker</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cross-Encoder (RRF Active)
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Top Inquired Topics */}
        <div className="enterprise-card p-6 bg-white space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Top Query Categories</h3>
            <p className="text-xs text-slate-500">Most frequent employee intent topics</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Travel Limits & Exceptions</span>
                <span className="text-[11px] text-slate-500">Policy v3.3 &bull; 412 queries</span>
              </div>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 text-purple-800">Finance</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Core Hours & WFH Swipes</span>
                <span className="text-[11px] text-slate-500">Policy v4.0 &bull; 298 queries</span>
              </div>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">HR</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Orion SSE Token Stream Specs</span>
                <span className="text-[11px] text-slate-500">Tech Specs &bull; 245 queries</span>
              </div>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">Engineering</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Bereavement Foreign Travel</span>
                <span className="text-[11px] text-slate-500">HR Inquiries &bull; 89 queries</span>
              </div>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">HR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
