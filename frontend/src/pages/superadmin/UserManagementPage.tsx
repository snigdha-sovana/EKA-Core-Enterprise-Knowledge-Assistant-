import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Mail,
  MoreVertical,
  Building2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  department: string;
  roleTitle: string;
  roleBadge: string;
  badgeColor: string;
  mfa: boolean;
  status: 'Active' | 'Pending Invite';
}

const ALL_USERS: EnterpriseUser[] = [
  { id: 'NX-1001', name: 'Alex Mercer', email: 'alex.mercer@nexora.internal', department: 'Executive Governance', roleTitle: 'Chief Technology Officer', roleBadge: 'SUPER_ADMIN', badgeColor: 'bg-red-100 text-red-800', mfa: true, status: 'Active' },
  { id: 'NX-6019', name: 'Priya Sharma', email: 'priya.sharma@nexora.internal', department: 'Finance & Treasury', roleTitle: 'Finance Administrator', roleBadge: 'FINANCE_ADMIN', badgeColor: 'bg-blue-100 text-blue-800', mfa: true, status: 'Active' },
  { id: 'NX-5120', name: 'Kavya Iyer', email: 'kavya.iyer@nexora.internal', department: 'Human Resources', roleTitle: 'HR Lead & People Partner', roleBadge: 'HR_ADMIN', badgeColor: 'bg-purple-100 text-purple-800', mfa: true, status: 'Active' },
  { id: 'NX-7102', name: 'Rohan Kapoor', email: 'rohan.kapoor@nexora.internal', department: 'Engineering (Orion)', roleTitle: 'Project Orion Lead', roleBadge: 'ORION_ADMIN', badgeColor: 'bg-amber-100 text-amber-800', mfa: true, status: 'Active' },
  { id: 'NX-8824', name: 'Snigdha Patra', email: 'snigdha.patra@nexora.internal', department: 'Engineering (Orion)', roleTitle: 'Senior Software Engineer', roleBadge: 'EMPLOYEE', badgeColor: 'bg-slate-100 text-slate-800', mfa: true, status: 'Active' },
  { id: 'NX-9012', name: 'Ananya Deshmukh', email: 'ananya.deshmukh@nexora.internal', department: 'Product Design', roleTitle: 'UX Systems Engineer', roleBadge: 'EMPLOYEE', badgeColor: 'bg-slate-100 text-slate-800', mfa: true, status: 'Active' },
  { id: 'NX-8451', name: 'Vikram Mehta', email: 'vikram.mehta@nexora.internal', department: 'Engineering (Platform)', roleTitle: 'Staff Backend Engineer', roleBadge: 'EMPLOYEE', badgeColor: 'bg-slate-100 text-slate-800', mfa: true, status: 'Active' },
  { id: 'NX-4109', name: 'Devendra Joshi', email: 'devendra.j@nexora.internal', department: 'Sales & Expansion', roleTitle: 'VP Enterprise Sales', roleBadge: 'EMPLOYEE', badgeColor: 'bg-slate-100 text-slate-800', mfa: true, status: 'Active' },
];

export default function UserManagementPage() {
  const { setEkaFloatingOpen, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const filteredUsers = ALL_USERS.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || u.department.includes(deptFilter);
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-erp-600 mb-1">
            Super Admin Control Plane
          </div>
          <h1 className="text-2xl font-bold text-slate-900">User Management & RBAC Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage global tenant users, departmental administrator assignments, and MFA access tokens
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEkaFloatingOpen(true)}
            className="btn-eka-primary text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Audit RBAC Matrix
          </button>
          <button
            onClick={() => addToast('User invitation email dispatched with temporary FIDO2 onboarding link.', 'success')}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Enterprise User
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Active Users</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">342</span>
            <span className="text-xs text-slate-400">across 4 hubs</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">100% Active Directory Synced</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Department Administrators</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-erp-700">4</span>
            <span className="text-xs text-slate-400">roles</span>
          </div>
          <span className="text-[10px] text-erp-700 font-bold block mt-1">Finance, HR, Orion, Executive</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">MFA Enforcement</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">100%</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Hardware & TOTP keys</span>
        </div>

        <div className="enterprise-card p-4 bg-white">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Tenant Organization</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900 font-mono">global-tech-corp</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">PostgreSQL Isolated Schema</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="enterprise-card bg-white overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Directory Accounts & Credentials</h3>
            <p className="text-xs text-slate-500">Live synchronization with FastAPI Auth & PostgreSQL</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-erp-500/20"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="Human Resources">HR</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">RBAC Role</th>
                <th className="py-3 px-4">MFA State</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-erp-100 text-erp-800 font-bold flex items-center justify-center text-xs">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-500">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {u.department}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {u.roleTitle}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.badgeColor}`}>
                      {u.roleBadge}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => addToast(`Managed permissions for ${u.name}.`, 'info')}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                    >
                      Manage Role
                    </button>
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
