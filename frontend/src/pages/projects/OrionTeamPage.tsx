import React from 'react';
import {
  Users,
  Shield,
  Layers,
  Sparkles,
  UserCheck,
  Award,
  GitPullRequest,
  CheckCircle2,
  Mail,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  roleInSquad: string;
  avatar: string;
  email: string;
  assignedPoints: number;
  prsReviewed: number;
  clearance: string;
  status: 'Active Sprint 14' | 'Available' | 'On Leave';
}

const ROSTER: TeamMember[] = [
  { id: 'NX-7102', name: 'Rohan Kapoor', title: 'Lead Architect', roleInSquad: 'Squad Lead / Scrum Master', avatar: 'RK', email: 'rohan.kapoor@nexora.internal', assignedPoints: 12, prsReviewed: 18, clearance: 'Level 3 (Admin)', status: 'Active Sprint 14' },
  { id: 'NX-8824', name: 'Snigdha Patra', title: 'Senior Software Engineer', roleInSquad: 'Core RAG & Retrieval Pipelines', avatar: 'SP', email: 'snigdha.patra@nexora.internal', assignedPoints: 21, prsReviewed: 14, clearance: 'Level 2 (Confidential)', status: 'Active Sprint 14' },
  { id: 'NX-9012', name: 'Ananya Deshmukh', title: 'Frontend Systems Engineer', roleInSquad: 'Nexora UI & Micro-interactions', avatar: 'AD', email: 'ananya.deshmukh@nexora.internal', assignedPoints: 15, prsReviewed: 9, clearance: 'Level 2 (Confidential)', status: 'Active Sprint 14' },
  { id: 'NX-8451', name: 'Vikram Mehta', title: 'Senior Backend Engineer', roleInSquad: 'PostgreSQL 16 Multi-Tenancy', avatar: 'VM', email: 'vikram.mehta@nexora.internal', assignedPoints: 14, prsReviewed: 11, clearance: 'Level 2 (Confidential)', status: 'Active Sprint 14' },
  { id: 'NX-6019', name: 'Priya Sharma', title: 'Finance Administrator', roleInSquad: 'Finance Department Liaison', avatar: 'PS', email: 'priya.sharma@nexora.internal', assignedPoints: 0, prsReviewed: 4, clearance: 'Level 3 (Finance Admin)', status: 'Active Sprint 14' },
  { id: 'NX-5120', name: 'Kavya Iyer', title: 'HR Lead & People Partner', roleInSquad: 'People & Policy Liaison', avatar: 'KI', email: 'kavya.iyer@nexora.internal', assignedPoints: 0, prsReviewed: 2, clearance: 'Level 3 (HR Admin)', status: 'Active Sprint 14' },
];

export default function OrionTeamPage() {
  const { setEkaFloatingOpen } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Project Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Project Orion Team Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Engineering team squad structure, sprint point allocations, and RBAC authorization scopes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: Squad Clearances
          </button>
          <button className="btn-primary text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Assign Engineer
          </button>
        </div>
      </div>

      {/* Squad KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Active Squad Size</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">6</span>
            <span className="text-xs text-slate-400">members</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">4 Devs &bull; 2 Liaisons</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Sprint 14 Capacity</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-erp-600">62</span>
            <span className="text-xs text-slate-400">/ 75 Story Points</span>
          </div>
          <span className="text-[10px] text-erp-700 font-bold block mt-1">82.6% Utilization</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">PRs Reviewed</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">58</span>
            <span className="text-xs text-slate-400">merged</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-1">100% CI Check Passed</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Security Audit</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">Level 2+</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">All members MFA verified</span>
        </div>
      </div>

      {/* Team Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Squad Orion Members & Entitlements</h3>
            <p className="text-xs text-slate-500">Cross-functional team assigned to EKA Enterprise Assistant</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role in Orion</th>
                <th className="py-3 px-4">Sprint 14 Allocation</th>
                <th className="py-3 px-4">PRs Reviewed</th>
                <th className="py-3 px-4">Security Scope</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROSTER.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-erp-100 text-erp-800 font-bold flex items-center justify-center text-xs">
                        {m.avatar}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{m.name}</span>
                        <span className="text-[11px] text-slate-500">{m.title} &bull; {m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {m.roleInSquad}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {m.assignedPoints > 0 ? `${m.assignedPoints} pts` : 'Governance'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {m.prsReviewed} reviews
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {m.clearance}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
