import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  User,
  X,
  Send,
  CalendarDays,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LeaveApplication {
  id: string;
  type: string;
  dates: string;
  days: number;
  reason: string;
  appliedOn: string;
  approver: string;
  status: 'Approved' | 'Pending Review' | 'Rejected';
}

const LEAVE_HISTORY: LeaveApplication[] = [
  { id: 'LV-2026-0038', type: 'Privilege Leave', dates: '14 Aug 2026 - 15 Aug 2026', days: 2, reason: 'Family engagement & travel', appliedOn: '04 Aug 2026', approver: 'Rohan Kapoor', status: 'Approved' },
  { id: 'LV-2026-0021', type: 'Sick Leave', dates: '12 Jun 2026', days: 1, reason: 'Viral fever & medical rest', appliedOn: '12 Jun 2026', approver: 'Rohan Kapoor', status: 'Approved' },
  { id: 'LV-2026-0014', type: 'Floating Holiday', dates: '25 Mar 2026', days: 1, reason: 'Holi festival celebration', appliedOn: '18 Mar 2026', approver: 'Rohan Kapoor', status: 'Approved' },
  { id: 'LV-2026-0005', type: 'Privilege Leave', dates: '02 Jan 2026 - 03 Jan 2026', days: 2, reason: 'New year extended weekend', appliedOn: '20 Dec 2025', approver: 'Rohan Kapoor', status: 'Approved' },
];

export default function LeaveManagementPage() {
  const { setEkaFloatingOpen, addToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Privilege Leave');
  const [startDate, setStartDate] = useState('2026-10-15');
  const [endDate, setEndDate] = useState('2026-10-16');
  const [reason, setReason] = useState('');
  const [applications, setApplications] = useState<LeaveApplication[]>(LEAVE_HISTORY);

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const newApp: LeaveApplication = {
      id: `LV-2026-00${applications.length + 40}`,
      type: leaveType,
      dates: `${startDate} to ${endDate}`,
      days: 2,
      reason: reason || 'Personal reasons',
      appliedOn: 'Today',
      approver: 'Rohan Kapoor',
      status: 'Pending Review',
    };

    setApplications([newApp, ...applications]);
    setModalOpen(false);
    setReason('');
    addToast('Leave application submitted to Rohan Kapoor for approval.', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Time Off & Holiday Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Apply for privilege or sick time-off, review available balances, and track manager authorizations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: Bereavement / Leave Rules
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Apply for Leave
          </button>
        </div>
      </div>

      {/* Quota KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-5 bg-white border-l-4 border-l-erp-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Privilege Leave (PL)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">14</span>
            <span className="text-xs text-slate-400">/ 18 days allocated</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1.5 font-medium">
            Max 8 days carry-over to 2027
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Sick & Casual Leave</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">5</span>
            <span className="text-xs text-slate-400">/ 7 days allocated</span>
          </div>
          <span className="text-[10px] text-emerald-600 block mt-1.5 font-semibold">
            No medical cert required for &le;2 days
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-purple-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Floating Holidays</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">2</span>
            <span className="text-xs text-slate-400">/ 2 remaining</span>
          </div>
          <span className="text-[10px] text-purple-600 block mt-1.5 font-semibold">
            Diwali or Eid selectable
          </span>
        </div>

        <div className="enterprise-card p-5 bg-white border-l-4 border-l-amber-500">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Compensatory Off</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">1</span>
            <span className="text-xs text-slate-400">day earned</span>
          </div>
          <span className="text-[10px] text-amber-600 block mt-1.5 font-semibold">
            From Weekend Deployment (23 Aug)
          </span>
        </div>
      </div>

      {/* Main Content Layout: History Table + Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Applications Table */}
        <div className="lg:col-span-2 enterprise-card bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leave Applications & Approval History</h3>
              <p className="text-xs text-slate-500">Processed by reporting manager Rohan Kapoor</p>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
              FY 2026 - 2027
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates & Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Approver</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-erp-700">
                      {app.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {app.type}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{app.dates}</span>
                      <span className="text-[11px] text-slate-500">{app.days} work day(s)</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={app.reason}>
                      {app.reason}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {app.approver}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        app.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.status === 'Pending Review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {app.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Official Holidays & Policy Guide */}
        <div className="space-y-6">
          <div className="enterprise-card p-5 bg-white">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <CalendarDays className="w-4 h-4 text-erp-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Public Holidays (Q3/Q4)</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Gandhi Jayanti</span>
                  <span className="text-[11px] text-slate-500">Friday, 02 Oct 2026</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Long Weekend</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Dussehra / Vijayadashami</span>
                  <span className="text-[11px] text-slate-500">Tuesday, 20 Oct 2026</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">Mandatory</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Diwali (Deepavali)</span>
                  <span className="text-[11px] text-slate-500">Sunday, 08 Nov 2026</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">Festival</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Christmas Day</span>
                  <span className="text-[11px] text-slate-500">Friday, 25 Dec 2026</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Long Weekend</span>
              </div>
            </div>
          </div>

          <div className="enterprise-card p-5 bg-purple-50/50 border-purple-200/60">
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold mb-2">
              <Info className="w-4 h-4 text-purple-600" />
              Notice Period Requirements
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Per <strong>Leave & Attendance Policy v4.0</strong>, planned leaves exceeding 2 days must be lodged at least 2 working days prior to the start date for team sprint continuity.
            </p>
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-erp-600" />
                <h3 className="text-base font-bold text-slate-900">Apply for Leave / Time-Off</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-erp-500/20"
                >
                  <option>Privilege Leave (PL)</option>
                  <option>Sick Leave (SL)</option>
                  <option>Floating Holiday</option>
                  <option>Compensatory Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Absence</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context for sprint handoff..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-erp-500/20"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-500">Designated Approver:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Rohan Kapoor (Engineering Lead)
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
