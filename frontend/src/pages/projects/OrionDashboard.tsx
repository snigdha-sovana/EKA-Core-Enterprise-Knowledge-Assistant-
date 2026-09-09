import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  TrendingUp,
  GitBranch,
  CheckSquare,
  ChevronRight,
  Shield,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SEED_PROJECTS } from '../../mock/mockData';

const ORION_TASKS = [
  { id: 'TASK-401', title: 'Implement Kafka partition key hashing for ledger events', assignee: 'Snigdha Patra', status: 'In Review', priority: 'High' },
  { id: 'TASK-402', title: 'Configure AWS IAM STS role for read-replica debugging', assignee: 'Rahul Sharma', status: 'In Progress', priority: 'Urgent' },
  { id: 'TASK-403', title: 'Runbook validation for zero-downtime database failover', assignee: 'Rohan Kapoor', status: 'Completed', priority: 'Normal' },
  { id: 'TASK-404', title: 'Orion Gateway rate limiting & token bucket filter', assignee: 'Ananya Roy', status: 'In Progress', priority: 'Normal' },
];

const ORION_ROSTER = [
  { name: 'Rohan Kapoor', role: 'Principal Lead & Admin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', squad: 'Core Architecture' },
  { name: 'Snigdha Patra', role: 'Backend Engineer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', squad: 'Ledger Engine' },
  { name: 'Rahul Sharma', role: 'DevOps & SRE', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', squad: 'Infra & Cloud' },
  { name: 'Ananya Roy', role: 'API Gateway Engineer', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', squad: 'Security & Access' },
];

export const OrionDashboard: React.FC = () => {
  const { currentUser, requests } = useApp();
  const navigate = useNavigate();

  const orion = SEED_PROJECTS[0]; // Project Orion
  const orionRequests = requests.filter(r => r.project === 'Project Orion' || r.department === 'Projects');
  const pendingRequests = orionRequests.filter(r => r.status !== 'Resolved');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-0.5">
            Engineering Project Management
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Project Orion — System Hub
          </h1>
          <p className="text-xs text-slate-500">
            Lead: <strong className="text-slate-700">{currentUser.name}</strong> • Fintech settlement microservices, event streaming architecture, and UAT delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/projects/orion/requests')}
            className="btn-erp-primary text-xs py-2 px-4 shadow-xs"
          >
            <Terminal className="w-4 h-4" />
            <span>Technical Queue ({pendingRequests.length} Pending)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sprint Progress</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{orion.progress}%</span>
            <span className="text-xs font-semibold text-emerald-600">On Track</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${orion.progress}%` }}></div>
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engineers Assigned</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{orion.membersCount}</span>
            <span className="text-xs font-semibold text-slate-500">Engineers & QA</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            4 Core Squads across 2 Hubs
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Milestone</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-extrabold text-slate-900">Oct 15, 2026</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Phase 1 UAT Customer Sign-Off
          </div>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{orionRequests.length}</span>
            <span className="text-xs font-semibold text-amber-600">({pendingRequests.length} Pending)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2 truncate">
            ORION-2026-0045 (Read-replica IAM)
          </div>
        </div>
      </div>

      {/* Row 2: Milestones & Sprint Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones Burn-Down */}
        <div className="enterprise-card p-5 bg-white space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Release Milestones & Delivery Schedule
              </h3>
              <p className="text-[11px] text-slate-500">Deliverables tracked under Project Orion SLA</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
              3 Milestones
            </span>
          </div>

          <div className="space-y-3">
            {orion.milestones.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      m.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : m.status === 'in_progress'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{m.title}</div>
                    <div className="text-[11px] text-slate-500">Target: {m.dueDate}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    m.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : m.status === 'in_progress'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sprint Active Tasks */}
        <div className="enterprise-card p-5 bg-white space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sprint 14 Active Engineering Tasks
              </h3>
              <p className="text-[11px] text-slate-500">Core engineering sprint backlog</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
              Sprint 14
            </span>
          </div>

          <div className="space-y-2.5">
            {ORION_TASKS.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      {task.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{task.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Assignee: {task.assignee}</div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'In Review'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Team Roster & Governed Technical Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Roster */}
        <div className="enterprise-card p-5 bg-white space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Orion Engineering Team Roster
              </h3>
              <p className="text-[11px] text-slate-500">Assigned engineers and architectural domain owners</p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
              {ORION_ROSTER.length} Leads
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ORION_ROSTER.map(member => (
              <div
                key={member.name}
                className="p-3 rounded-xl border border-slate-200/80 flex items-center gap-3 bg-slate-50/40"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{member.name}</div>
                  <div className="text-[10px] text-purple-700 font-medium">{member.role}</div>
                  <div className="text-[10px] text-slate-400">{member.squad}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governed Technical Documentation */}
        <div className="enterprise-card p-5 bg-white space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Orion Technical Documentation
              </h3>
              <p className="text-[11px] text-slate-500">Indexed in ChromaDB Orion Namespace</p>
            </div>
            <span className="badge-eka text-[10px] font-bold">Vectorized</span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Architecture Spec</span>
                <span className="badge-eka text-[10px]">v2.4</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Go gateway & tenant database isolation</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Release Runbook</span>
                <span className="badge-eka text-[10px]">v1.8</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Tuesday 10 PM IST canary deployment SOPs</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">UAT Milestone Plan</span>
                <span className="badge-eka text-[10px]">v1.2</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Phase 1 test scenarios starting Oct 15</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrionDashboard;
