import React, { useState } from 'react';
import {
  Briefcase,
  Layers,
  CheckCircle2,
  Clock,
  Code2,
  GitPullRequest,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  BookOpen,
  FileCode,
  Shield,
  Cpu
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SprintTask {
  id: string;
  title: string;
  points: number;
  priority: 'High' | 'Medium' | 'Critical';
  status: 'In Progress' | 'Code Review' | 'Completed';
  branch: string;
}

const MY_TASKS: SprintTask[] = [
  { id: 'ORION-458', title: 'Implement Multi-Tier Rate Limiting Middleware in FastAPI', points: 8, priority: 'Critical', status: 'In Progress', branch: 'feat/rate-limiting-slowapi' },
  { id: 'ORION-472', title: 'Cross-Encoder Reranker Normalization & Score Thresholding', points: 5, priority: 'High', status: 'Code Review', branch: 'fix/reranker-score-norm' },
  { id: 'ORION-441', title: 'Zero-Buffering SSE Token Stream Relay on Nginx Gateway', points: 5, priority: 'High', status: 'Completed', branch: 'infra/nginx-sse-stream' },
  { id: 'ORION-489', title: 'Automated Disaster Recovery Backup Script with SHA-256 Checksums', points: 3, priority: 'Medium', status: 'Completed', branch: 'feat/dr-backup-suite' },
];

export default function EmployeeProjectsPage() {
  const { setEkaFloatingOpen } = useApp();
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Completed'>('All');

  const filteredTasks = MY_TASKS.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'In Progress') return t.status === 'In Progress' || t.status === 'Code Review';
    return t.status === 'Completed';
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Engineering Projects & Sprints
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Project Orion Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active engineering sprint commitments, assigned technical backlog, and architecture documentation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: Orion Architecture
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-erp-50 text-erp-700 border border-erp-200 text-xs font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Sprint 14 Active (v2.4-RC)
          </span>
        </div>
      </div>

      {/* Sprint 14 Burn-down & Velocity Banner */}
      <div className="enterprise-card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-erp-950 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-60 h-60 rounded-full bg-erp-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-erp-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              Active Sprint 14: Hardening & Hybrid RAG
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Core Platform Delivery & Gateways</h2>
            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              Sprint 14 targets production hardening, unbuffered SSE token streaming, and Redis rate limit isolation for enterprise multi-tenancy.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Squad Lead: Rohan Kapoor</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs font-semibold text-emerald-400">Target Release: 18 Sep 2026</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-xs text-slate-400 block mb-1">Sprint Burn-Down Progress</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-white">68%</span>
              <span className="text-xs text-slate-400">42 / 62 Story Points</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-erp-400 to-emerald-400 h-full rounded-full w-[68%]" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-xs text-slate-400 block mb-1">My Sprint Allocation</span>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-purple-300">21</span>
              <span className="text-xs text-slate-400">Points (4 tasks)</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 8 Points Delivered
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: My Assigned Sprint Tasks & Quick Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Sprint Backlog */}
        <div className="lg:col-span-2 enterprise-card bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Assigned Sprint Backlog</h3>
              <p className="text-xs text-slate-500">Tasks assigned to Snigdha Patra (Senior Software Engineer)</p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/60 text-xs">
              {(['All', 'In Progress', 'Completed'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    filter === tab
                      ? 'bg-white text-erp-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTasks.map(task => (
              <div key={task.id} className="p-4.5 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-erp-700 bg-erp-50 px-2 py-0.5 rounded border border-erp-100">
                      {task.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.priority === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : task.priority === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority} Priority
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">&bull; {task.points} Story Pts</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      <GitPullRequest className="w-3 h-3 text-slate-400" />
                      {task.branch}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    task.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : task.status === 'Code Review'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {task.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Technical Documentation Shortcuts */}
        <div className="space-y-6">
          <div className="enterprise-card p-5 bg-white">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <BookOpen className="w-4 h-4 text-erp-600" />
              <h3 className="text-sm font-bold text-slate-900">Sprint Technical Docs</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-erp-200 hover:bg-erp-50/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Architecture Whitepaper</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-bold">v1.4</span>
                </div>
                <p className="text-[11px] text-slate-500">ChromaDB hybrid indexing, BM25 tokenizer and reciprocal rank fusion.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-erp-200 hover:bg-erp-50/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">Nginx Reverse Proxy Specs</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Ratified</span>
                </div>
                <p className="text-[11px] text-slate-500">Edge rate limiting zones, 429 JSON handling, and unbuffered SSE stream.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-erp-200 hover:bg-erp-50/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">PostgreSQL Multi-Tenancy</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Schema</span>
                </div>
                <p className="text-[11px] text-slate-500">Tenant-isolated schemas, RLS guardrails, and audit log indexing.</p>
              </div>
            </div>
          </div>

          <div className="enterprise-card p-5 bg-gradient-to-br from-erp-50/50 to-purple-50/50 border-erp-200/60">
            <div className="flex items-center gap-2 text-erp-700 text-xs font-bold mb-1.5">
              <Shield className="w-4 h-4 text-erp-600" />
              Sprint Review Date
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sprint 14 Demo & Governance Retrospective scheduled for <strong>Friday, 18 Sep 2026 at 3:00 PM IST</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
