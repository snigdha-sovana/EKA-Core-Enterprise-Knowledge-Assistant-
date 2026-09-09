import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  ShieldCheck,
  Award,
  Key,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ProfilePage() {
  const { currentUser, setEkaFloatingOpen } = useApp();
  const [showMaskedData, setShowMaskedData] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-erp-700 via-erp-800 to-slate-900 p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-48 h-48 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-white text-3xl font-black shadow-inner overflow-hidden">
                {currentUser.avatar?.startsWith('http') || currentUser.avatar?.startsWith('/') ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span>{currentUser.avatar || currentUser.name.charAt(0)}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center" title="Active on ERP" />
            </div>


            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">{currentUser.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white border border-white/20">
                  EMP ID: NX-8824
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Full-Time Permanent
                </span>
              </div>

              <p className="text-sm text-slate-300 font-medium mt-1">
                {currentUser.roleTitle} &bull; <span className="text-erp-300 font-semibold">{currentUser.department}</span> &bull; Squad Orion
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Bangalore Hub (Tower B, Floor 4)
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined 12 Oct 2023 (1 yr 5 mos)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button
              onClick={() => setEkaFloatingOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask EKA About Benefits
            </button>
            <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Core Enterprise Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="enterprise-card p-6 bg-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-erp-50 text-erp-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Employment & Squad Assignment</h2>
                  <p className="text-xs text-slate-500">Official organizational records synchronized via NexoraERP HRMS</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                Verified Record
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Corporate Email</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.email}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Direct Reporting Manager</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Rohan Kapoor (Lead Architect)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Department / Organization</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.department} &bull; Global Tech Corp
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Work Arrangement Policy</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Hybrid Tier 2 (3 Days In-Office / 2 Remote)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Official Contact Phone</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91 (080) 4920-8812 &bull; Ext: 442
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Active Sprint</span>
                <span className="font-semibold text-erp-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Project Orion Sprint 14 (Release v2.4-RC)
                </span>
              </div>
            </div>
          </div>

          {/* Technical Entitlements & Competencies Card */}
          <div className="enterprise-card p-6 bg-white">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Engineering Skills & Enterprise Certifications</h2>
                <p className="text-xs text-slate-500">Verified squad domain capabilities and system access scopes</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">Technical Competency Badges</span>
                <div className="flex flex-wrap gap-2">
                  {['React 18 & TypeScript', 'FastAPI Microservices', 'ChromaDB Vector Ingestion', 'PostgreSQL 16 Multi-Tenancy', 'Docker & Kubernetes', 'SSE Event Streaming', 'Enterprise RAG Architecture'].map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/70 text-slate-800 transition-colors border border-slate-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">Internal Project Roles & Clearances</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Orion Core Contributor</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Full commit and code review rights on `eka-core` and `production-grade-rag` repositories.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-erp-100 bg-erp-50/50 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-erp-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">Department Knowledge Contributor</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Authorized to submit candidate Q&A solutions to Knowledge Review board.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security, RBAC & Guardrail Credentials */}
        <div className="space-y-6">
          {/* Security & Access Clearance Card */}
          <div className="enterprise-card p-6 bg-white">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Security & RBAC Profile</h2>
                <p className="text-xs text-slate-500">FastAPI JWT Token Claims</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">RBAC Role</span>
                <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-100 text-blue-800 uppercase tracking-wide">
                  {currentUser.role}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Security Clearance</span>
                <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-emerald-100 text-emerald-800">
                  Level 2 (Confidential)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Tenant Organization</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">
                  global-tech-corp
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Two-Factor Authentication</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enforced (FIDO2)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Rate Limit Allowance</span>
                <span className="font-bold text-slate-800">
                  60 queries / min (Viewer)
                </span>
              </div>
            </div>
          </div>

          {/* Sensitive Payroll & Compensation Snapshot (Masked) */}
          <div className="enterprise-card p-6 bg-white">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Direct Deposit & Payroll</h2>
                  <p className="text-xs text-slate-500">Encrypted in NexoraERP Vault</p>
                </div>
              </div>
              <button
                onClick={() => setShowMaskedData(!showMaskedData)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title={showMaskedData ? 'Hide sensitive information' : 'Reveal sensitive information'}
              >
                {showMaskedData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block mb-0.5">Primary Salary Account</span>
                <span className="font-mono font-bold text-slate-800">
                  {showMaskedData ? 'HDFC Bank - 50100482910482' : 'HDFC Bank &bull;&bull;&bull;&bull; 0482'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block mb-0.5">Tax Identification Number</span>
                <span className="font-mono font-bold text-slate-800">
                  {showMaskedData ? 'AAACP9821R' : 'AAAC&bull;&bull;&bull;&bull;1R'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block mb-0.5">Provident Fund (UAN)</span>
                <span className="font-mono font-bold text-slate-800">
                  {showMaskedData ? '101482910842' : '1014&bull;&bull;&bull;&bull;0842'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
