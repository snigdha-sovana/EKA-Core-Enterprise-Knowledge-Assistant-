import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  CreditCard,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EmployeeDashboard: React.FC = () => {
  const { currentUser, setEkaFloatingOpen, setActiveEkaQuery, requests } = useApp();
  const navigate = useNavigate();

  // Tasks state
  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      title: 'Orion Payment Gateway Integration & unit tests',
      dueDate: 'Sep 12, 2026',
      priority: 'High',
      project: 'Project Orion',
      completed: false,
    },
    {
      id: 'task-2',
      title: 'Review Kafka event schema draft v2.4 with lead',
      dueDate: 'Sep 15, 2026',
      priority: 'Normal',
      project: 'Project Orion',
      completed: false,
    },
    {
      id: 'task-3',
      title: 'Submit travel expense receipts for Bengaluru client summit',
      dueDate: 'Sep 25, 2026',
      priority: 'Normal',
      project: 'Finance',
      completed: false,
    },
    {
      id: 'task-4',
      title: 'Complete annual POSH and information security refresher',
      dueDate: 'Sep 30, 2026',
      priority: 'Low',
      project: 'HR',
      completed: true,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAskEka = (promptText: string) => {
    setActiveEkaQuery(promptText);
    setEkaFloatingOpen(true);
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'Pending Review').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Good morning, {currentUser.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Today is <strong className="text-slate-700">Sunday, September 06, 2026</strong> • Engineering Division • Nexora Bengaluru
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ERP Status: Online & Synced
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Leave Balance */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">14</span>
            <span className="text-xs font-semibold text-slate-500">Privilege Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>+ 8 Casual/Sick Days</span>
            <button
              onClick={() => navigate('/app/leave')}
              className="text-erp-600 hover:text-erp-700 font-semibold"
            >
              Apply Leave →
            </button>
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">2</span>
            <span className="text-xs font-semibold text-amber-600">Awaiting Action</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-100 pt-2 truncate">
            1 Expense Claim (₹4,200) • 1 Leave Request
          </div>
        </div>

        {/* Card 3: Active Projects */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-eka-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">Project Orion</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> 74% Sprint Target
            </span>
            <button
              onClick={() => navigate('/app/projects')}
              className="text-erp-600 hover:text-erp-700 font-semibold"
            >
              Board →
            </button>
          </div>
        </div>

        {/* Card 4: My Escalated Requests */}
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EKA Escalations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{requests.length}</span>
            <span className="text-xs font-semibold text-slate-500">Logged</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
            <span>{pendingRequestsCount} Pending Review</span>
            <button
              onClick={() => navigate('/app/eka/requests')}
              className="text-erp-600 hover:text-erp-700 font-semibold"
            >
              View Requests →
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Tasks & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Tasks List */}
          <div className="enterprise-card bg-white p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">My Priority Tasks</span>
                <span className="text-[10px] bg-slate-100 font-semibold text-slate-600 px-2 py-0.5 rounded-full">
                  {tasks.filter(t => !t.completed).length} open
                </span>
              </div>
              <button className="text-xs text-erp-600 hover:underline font-semibold">
                View All in Projects
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-erp-600 focus:ring-erp-500 cursor-pointer"
                    />
                    <div className="overflow-hidden">
                      <div
                        className={`text-xs font-semibold truncate ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {task.project}
                        </span>
                        <span>Due {task.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      task.priority === 'High'
                        ? 'bg-red-50 text-red-700'
                        : task.priority === 'Normal'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Access Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Quick ERP Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/app/leave')}
                className="enterprise-card p-3.5 bg-white text-left hover:border-erp-500 group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">Apply Leave</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Privilege or Sick</div>
              </button>

              <button
                onClick={() => navigate('/app/expenses')}
                className="enterprise-card p-3.5 bg-white text-left hover:border-erp-500 group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">Submit Expense</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Upload receipts</div>
              </button>

              <button
                onClick={() => navigate('/app/projects')}
                className="enterprise-card p-3.5 bg-white text-left hover:border-erp-500 group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">Project Orion</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Architecture & SOPs</div>
              </button>

              <button
                onClick={() => navigate('/app/documents')}
                className="enterprise-card p-3.5 bg-white text-left hover:border-erp-500 group transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">Company Policies</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Travel v3.2 & WFH</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Dedicated EKA Interactive Assistant Card */}
        <div className="space-y-4">
          <div className="enterprise-card bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/40 p-5 border-purple-200/80 relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-eka-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ask EKA Assistant</h3>
                <p className="text-[11px] text-slate-500">Enterprise AI for policies & SOPs</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-4">
              Ask questions directly from your dashboard. When knowledge is missing, EKA abstains and provides an instant escalation workflow.
            </p>

            {/* Clickable Prompt Chips */}
            <div className="space-y-2">
              <button
                onClick={() => handleAskEka('How many leaves do I have?')}
                className="w-full text-left p-2.5 bg-white hover:bg-purple-50/80 border border-slate-200/90 hover:border-eka-300 rounded-xl text-xs text-slate-700 transition-all flex items-center justify-between group shadow-2xs"
              >
                <span className="truncate">"How many leaves do I have?"</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-eka-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              <button
                onClick={() => handleAskEka('What is the reimbursement policy for international travel?')}
                className="w-full text-left p-2.5 bg-white hover:bg-purple-50/80 border border-slate-200/90 hover:border-eka-300 rounded-xl text-xs text-slate-700 transition-all flex items-center justify-between group shadow-2xs"
              >
                <span className="truncate">"What is the reimbursement policy for international travel?"</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-eka-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              <button
                onClick={() =>
                  handleAskEka(
                    'Can I claim accommodation above the normal limit for a client visit next month?'
                  )
                }
                className="w-full text-left p-2.5 bg-white hover:bg-red-50/80 border border-slate-200/90 hover:border-red-300 rounded-xl text-xs text-slate-700 transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="truncate">
                  <span className="text-red-700 font-semibold">[Demo Escalation]</span> "Can I claim accommodation above normal limit?"
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-100/80 flex items-center justify-between">
              <button
                onClick={() => setEkaFloatingOpen(true)}
                className="btn-eka-primary w-full text-xs py-2 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Launch EKA Floating Assistant
              </button>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="enterprise-card bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
              14-Day Reconciliation Cycle
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              All employee records and policy documentation automatically reconcile every 14 days. Next full sync: <strong className="text-slate-700 font-semibold">Sep 15, 2026</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
