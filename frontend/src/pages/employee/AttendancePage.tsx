import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  Filter,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  shift: string;
  firstIn: string;
  lastOut: string;
  totalHours: string;
  mode: 'Office' | 'Remote' | 'Leave';
  status: 'On Time' | 'Grace Period' | 'Regularized' | 'Holiday';
}

const ATTENDANCE_LOGS: AttendanceRecord[] = [
  { id: '1', date: '07 Sep 2026', day: 'Today', shift: 'General (09:30 - 18:30)', firstIn: '09:54 AM', lastOut: 'Active Now', totalHours: '6h 32m', mode: 'Office', status: 'On Time' },
  { id: '2', date: '04 Sep 2026', day: 'Friday', shift: 'General (09:30 - 18:30)', firstIn: '09:42 AM', lastOut: '18:45 PM', totalHours: '9h 03m', mode: 'Office', status: 'On Time' },
  { id: '3', date: '03 Sep 2026', day: 'Thursday', shift: 'General (09:30 - 18:30)', firstIn: '09:30 AM', lastOut: '18:10 PM', totalHours: '8h 40m', mode: 'Remote', status: 'On Time' },
  { id: '4', date: '02 Sep 2026', day: 'Wednesday', shift: 'General (09:30 - 18:30)', firstIn: '09:58 AM', lastOut: '18:50 PM', totalHours: '8h 52m', mode: 'Office', status: 'Grace Period' },
  { id: '5', date: '01 Sep 2026', day: 'Tuesday', shift: 'General (09:30 - 18:30)', firstIn: '09:38 AM', lastOut: '18:30 PM', totalHours: '8h 52m', mode: 'Office', status: 'On Time' },
  { id: '6', date: '28 Aug 2026', day: 'Friday', shift: 'General (09:30 - 18:30)', firstIn: '09:40 AM', lastOut: '18:30 PM', totalHours: '8h 50m', mode: 'Remote', status: 'On Time' },
  { id: '7', date: '27 Aug 2026', day: 'Thursday', shift: 'General (09:30 - 18:30)', firstIn: '10:05 AM', lastOut: '19:15 PM', totalHours: '9h 10m', mode: 'Office', status: 'Regularized' },
  { id: '8', date: '26 Aug 2026', day: 'Wednesday', shift: 'General (09:30 - 18:30)', firstIn: '09:45 AM', lastOut: '18:35 PM', totalHours: '8h 50m', mode: 'Office', status: 'On Time' },
];

export default function AttendancePage() {
  const { setEkaFloatingOpen } = useApp();
  const [clockedIn, setClockedIn] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('September 2026');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Time & Attendance Management
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance & Timesheet Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clock-in logs, biometric entry timestamps, and core collaboration hours tracking per Policy v4.0
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask EKA: Core Hours Rules
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export Timesheet (CSV)
          </button>
        </div>
      </div>

      {/* Today's Punch & Realtime Status Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Real-time Punch Card */}
        <div className="md:col-span-2 enterprise-card p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200/90 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-erp-50 text-erp-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Today's Timesheet Status</h2>
                <p className="text-xs text-slate-500">Mon, 07 Sep 2026 &bull; Bangalore Hub</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {clockedIn ? 'Clocked In & Present' : 'Clocked Out'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-slate-200/70 mb-5">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">First In Timestamp</span>
              <span className="text-base font-bold text-slate-900">09:54 AM</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Floor 4 Access Gate</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Working Duration</span>
              <span className="text-base font-bold text-erp-600">6h 32m</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Req: 8h 30m</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Core Hours Window</span>
              <span className="text-base font-bold text-slate-900">10:00 - 16:00</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Compliant (Present)</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Work Mode</span>
              <span className="text-base font-bold text-slate-800 flex items-center gap-1">
                <Building2 className="w-4 h-4 text-erp-600" />
                Office
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Tower B, Desk 412</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setClockedIn(!clockedIn)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                clockedIn
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
              }`}
            >
              {clockedIn ? 'Punch Clock-Out' : 'Punch Clock-In'}
            </button>
            <button className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
              Log WFH Day
            </button>
            <button className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors">
              Regularize Swipe
            </button>
          </div>
        </div>

        {/* Policy Notice Card */}
        <div className="enterprise-card p-6 bg-gradient-to-br from-erp-50/50 to-purple-50/50 border-erp-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-erp-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Info className="w-4 h-4 text-erp-600" />
              Policy Guidance v4.0
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Core Collaborative Hours</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Per Section 2 of the Leave & Attendance Policy, core collaborative hours are mandatory from <strong>10:00 AM to 4:00 PM IST</strong> for all hybrid squad members.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-erp-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Grace time: 15 mins</span>
            <button
              onClick={() => setEkaFloatingOpen(true)}
              className="text-erp-700 font-bold hover:text-erp-900 flex items-center gap-1"
            >
              View in Policy <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-medium block mb-1">Present in Office</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">19</span>
            <span className="text-xs text-slate-400">/ 22 work days</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">98.2% Punctuality</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-medium block mb-1">Remote (WFH) Days</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">3</span>
            <span className="text-xs text-slate-400">approved days</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-1">Within 2/week policy</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-medium block mb-1">Average Work Hours</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">8.4</span>
            <span className="text-xs text-slate-400">hrs / day</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">+0.4 hrs above baseline</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-medium block mb-1">Leaves Taken</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">0</span>
            <span className="text-xs text-slate-400">days this month</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">14 days quota remaining</span>
        </div>
      </div>

      {/* Detailed Punch Log Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">September 2026 Timesheet Record</h3>
            <p className="text-xs text-slate-500">Biometric swipe entries and system logged times</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700"
            >
              <option>September 2026</option>
              <option>August 2026</option>
              <option>July 2026</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Shift Details</th>
                <th className="py-3 px-4">First In</th>
                <th className="py-3 px-4">Last Out</th>
                <th className="py-3 px-4">Total Hours</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Punctuality Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ATTENDANCE_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{log.date}</span>
                    <span className="text-[11px] text-slate-500">{log.day}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {log.shift}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {log.firstIn}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {log.lastOut}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-erp-700">
                    {log.totalHours}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      log.mode === 'Office'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {log.mode === 'Office' ? <Building2 className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                      {log.mode}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      log.status === 'On Time'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : log.status === 'Grace Period'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {log.status === 'On Time' && <Check className="w-3 h-3" />}
                      {log.status}
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
