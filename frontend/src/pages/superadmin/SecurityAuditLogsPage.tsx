import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ShieldCheck,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Sparkles,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  ipAddress: string;
  resource: string;
  severity: 'INFO' | 'NOTICE' | 'SUCCESS' | 'WARN';
}

const AUDIT_TRAIL: AuditLogEntry[] = [
  { id: 'LOG-99214', timestamp: 'Today, 12:05:17 PM', eventType: 'DISASTER_RECOVERY_BACKUP_COMPLETED', actor: 'Celery DR Worker', ipAddress: '127.0.0.1', resource: 'eka_dr_bundle_20260907.tar.gz (SHA-256 verified)', severity: 'SUCCESS' },
  { id: 'LOG-99208', timestamp: 'Today, 11:50:42 AM', eventType: 'CONTINUOUS_LEARNING_INGESTION', actor: 'EKA Sync Pipeline', ipAddress: '127.0.0.1', resource: 'Travel Policy v3.3 (Chunk ID: fin-travel-v3.3-01)', severity: 'SUCCESS' },
  { id: 'LOG-99195', timestamp: 'Today, 11:45:10 AM', eventType: 'ESCALATION_RESOLVED_KNOWLEDGE_PROPOSED', actor: 'Priya Sharma (Finance Admin)', ipAddress: '127.0.0.1', resource: 'Case FIN-2026-0142 ($280/night Zurich approval)', severity: 'NOTICE' },
  { id: 'LOG-99182', timestamp: 'Today, 10:30:15 AM', eventType: 'RATE_LIMIT_429_ENFORCED', actor: '198.51.100.99', ipAddress: '198.51.100.99', resource: '/auth/login (Exceeded 5 req/min threshold)', severity: 'WARN' },
  { id: 'LOG-99170', timestamp: 'Today, 09:54:02 AM', eventType: 'USER_AUTHENTICATED_JWT', actor: 'Snigdha Patra', ipAddress: '127.0.0.1', resource: 'Token role: [viewer] org: global-tech-corp', severity: 'INFO' },
  { id: 'LOG-99158', timestamp: 'Yesterday, 18:22:04 PM', eventType: '14_DAY_ERP_RECONCILIATION', actor: 'Celery Beat Service', ipAddress: '127.0.0.1', resource: 'All tenants reconciled (Zero drift verified)', severity: 'SUCCESS' },
  { id: 'LOG-99142', timestamp: 'Yesterday, 16:15:30 PM', eventType: 'DOCUMENT_ACL_UPDATED', actor: 'Kavya Iyer (HR Admin)', ipAddress: '127.0.0.1', resource: 'Leave Policy v4.0 (Visibility: Public Employee)', severity: 'INFO' },
];

export default function SecurityAuditLogsPage() {
  const { setEkaFloatingOpen, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = AUDIT_TRAIL.filter(l =>
    !searchTerm ||
    l.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Super Admin Governance & Compliance
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Security & Governance Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit trail of authentication events, RAG policy amendments, and disaster recovery checksums
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEkaFloatingOpen(true);
              addToast({
                title: 'Audit Cryptography Verified',
                message: 'All 18,420 log entries cryptographically verified against SHA-256 backup bundle.',
                type: 'purple',
              });
            }}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Verify Audit Cryptography
          </button>
          <button
            onClick={() => addToast({
              title: 'Export Audit Ledger',
              message: 'Signed JSON audit trail generated with tamper-evident hashes.',
              type: 'success',
            })}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Ledger
          </button>
        </div>

      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Audit Records</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">18,420</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">PostgreSQL 16 Append-Only</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Security Breaches</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">0</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Zero unauthorized access</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Rate Limit Blocks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">14</span>
            <span className="text-xs text-slate-400">429s</span>
          </div>
          <span className="text-[10px] text-amber-600 font-bold block mt-1">Nginx edge + SlowAPI</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">DR Cryptographic Hash</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono font-bold text-slate-800 truncate">SHA-256 Valid</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Automated backup dry-run verified</span>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chronological Event Stream</h3>
            <p className="text-xs text-slate-500">Tamper-evident logs across edge gateway and backend services</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event, actor, or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-erp-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Event ID & Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Resource & Scope</th>
                <th className="py-3 px-4">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-erp-700 block">{l.id}</span>
                    <span className="text-[11px] text-slate-500">{l.timestamp}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    {l.eventType}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {l.actor}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {l.ipAddress}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-sm truncate" title={l.resource}>
                    {l.resource}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      l.severity === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.severity === 'NOTICE'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : l.severity === 'WARN'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {l.severity}
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
