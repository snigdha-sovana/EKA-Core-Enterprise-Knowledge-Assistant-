// ============================================================================
// NexoraERP & EKA — Central Enterprise Mock Data Fixtures & Types
// ============================================================================

export type UserRole = 'employee' | 'finance_admin' | 'hr_admin' | 'orion_admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  location: string;
  avatar: string;
  projects: string[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  adminName: string;
  adminEmail: string;
  employeeCount: number;
  openRequests: number;
  syncFreshness: number; // percentage
  accentColor: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'planning' | 'completed';
  progress: number;
  leadName: string;
  membersCount: number;
  milestones: { title: string; dueDate: string; status: 'completed' | 'in_progress' | 'upcoming' }[];
  openTasks: number;
}

export interface DocumentVersion {
  version: string;
  date: string;
  author: string;
  changes: string;
  status: 'current' | 'previous' | 'archived';
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  department: string;
  category: 'HR' | 'Finance' | 'Projects' | 'Company';
  project?: string;
  owner: string;
  version: string;
  status: 'Active' | 'Draft' | 'Archived';
  accessLevel: 'Company' | 'HR Restricted' | 'Project Orion Only';
  isRestricted: boolean;
  lastUpdated: string;
  lastSynced: string;
  effectiveDate: string;
  summary: string;
  content: string;
  versionHistory: DocumentVersion[];
}

export interface EkaCitation {
  documentId: string;
  documentTitle: string;
  department: string;
  version: string;
  confidence: 'High' | 'Needs Review' | 'Insufficient Evidence';
  excerpt: string;
}

export interface EkaMessage {
  id: string;
  sender: 'user' | 'eka';
  text: string;
  timestamp: string;
  confidence?: 'High' | 'Needs Review' | 'Insufficient Evidence';
  sources?: EkaCitation[];
  isAbstention?: boolean;
  escalationDept?: 'Finance' | 'HR' | 'Projects';
  escalationQuery?: string;
  associatedRequestId?: string;
  isLearnedFromResolution?: boolean;
  resolvedRequestId?: string;
}

export interface EkaRequest {
  id: string;
  query: string;
  requestedBy: string;
  requesterEmail: string;
  department: 'Finance' | 'HR' | 'Projects';
  project?: string;
  priority: 'Urgent' | 'High' | 'Normal';
  status: 'Pending Review' | 'In Progress' | 'Resolved';
  createdAt: string;
  assignedAdmin: string;
  response?: string;
  proposedAsKnowledge?: boolean;
  timeline: {
    stage: 'Submitted' | 'Assigned' | 'Under Review' | 'Resolved';
    timestamp: string;
    actor: string;
    notes?: string;
  }[];
}

export interface KnowledgeGap {
  id: string;
  topic: string;
  sampleQuery: string;
  queriesCount: number;
  escalationsCount: number;
  responsibleDept: string;
  coverageScore: number; // 0-100
  recommendation: string;
}

export interface RagLearnedChunk {
  id: string;
  requestId: string;
  query: string;
  department: 'Finance' | 'HR' | 'Projects';
  policyDocId: string;
  policyDocTitle: string;
  version: string;
  responseSnippet: string;
  status: 'pending_admin' | 'ingesting' | 'synced';
  countdownSeconds: number;
  createdAt: string;
  syncedAt?: string;
}

export interface SyncRecord {
  id: string;
  timestamp: string;
  scope: 'Full Sync' | 'Finance' | 'HR' | 'Projects' | 'ERP Core';
  changedCount: number;
  addedCount: number;
  removedCount: number;
  status: 'Synchronized' | 'Syncing' | 'Failed';
  duration: string;
  details: string[];
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

export const SEED_USERS: Record<UserRole, User> = {
  employee: {
    id: 'EMP001',
    name: 'Snigdha Patra',
    email: 'employee@nexora.com',
    role: 'employee',
    roleTitle: 'Software Engineer',
    department: 'Engineering',
    location: 'Bengaluru, India',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    projects: ['Project Orion'],
  },
  finance_admin: {
    id: 'FIN-ADMIN-01',
    name: 'Priya Sharma',
    email: 'finance.admin@nexora.com',
    role: 'finance_admin',
    roleTitle: 'Finance Administrator',
    department: 'Finance',
    location: 'Mumbai, India',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    projects: [],
  },
  hr_admin: {
    id: 'HR-ADMIN-01',
    name: 'Kavya Iyer',
    email: 'hr.admin@nexora.com',
    role: 'hr_admin',
    roleTitle: 'Head of People & Culture',
    department: 'HR',
    location: 'Bengaluru, India',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    projects: [],
  },
  orion_admin: {
    id: 'ORION-ADMIN-01',
    name: 'Rohan Kapoor',
    email: 'orion.admin@nexora.com',
    role: 'orion_admin',
    roleTitle: 'Principal Lead & Orion Admin',
    department: 'Projects',
    location: 'Pune, India',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    projects: ['Project Orion'],
  },
  super_admin: {
    id: 'SUPER-ADMIN-01',
    name: 'David Wilson',
    email: 'superadmin@nexora.com',
    role: 'super_admin',
    roleTitle: 'Executive Director & Super Admin',
    department: 'Executive/Admin',
    location: 'Bengaluru, India',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    projects: ['Project Orion', 'Project Atlas', 'Project Phoenix'],
  },
};

export const SEED_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Human Resources', code: 'HR', adminName: 'Kavya Iyer', adminEmail: 'hr.admin@nexora.com', employeeCount: 38, openRequests: 3, syncFreshness: 98, accentColor: '#3B82F6' },
  { id: 'dept-2', name: 'Finance & Accounts', code: 'FIN', adminName: 'Priya Sharma', adminEmail: 'finance.admin@nexora.com', employeeCount: 24, openRequests: 5, syncFreshness: 100, accentColor: '#10B981' },
  { id: 'dept-3', name: 'Engineering & Technology', code: 'ENG', adminName: 'Rohan Kapoor', adminEmail: 'orion.admin@nexora.com', employeeCount: 142, openRequests: 2, syncFreshness: 94, accentColor: '#7C3AED' },
  { id: 'dept-4', name: 'Sales & Marketing', code: 'SALES', adminName: 'Arjun Sen', adminEmail: 'arjun.sen@nexora.com', employeeCount: 46, openRequests: 1, syncFreshness: 91, accentColor: '#F59E0B' },
  { id: 'dept-5', name: 'Project Delivery', code: 'PROJ', adminName: 'Rohan Kapoor', adminEmail: 'orion.admin@nexora.com', employeeCount: 65, openRequests: 4, syncFreshness: 96, accentColor: '#EC4899' },
  { id: 'dept-6', name: 'Executive & Admin', code: 'EXEC', adminName: 'David Wilson', adminEmail: 'superadmin@nexora.com', employeeCount: 12, openRequests: 0, syncFreshness: 100, accentColor: '#6366F1' },
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-orion',
    name: 'Project Orion',
    code: 'ORION',
    status: 'active',
    progress: 74,
    leadName: 'Rohan Kapoor',
    membersCount: 18,
    openTasks: 14,
    milestones: [
      { title: 'Payment Gateway Integration', dueDate: 'Sep 12, 2026', status: 'in_progress' },
      { title: 'Kafka Event Bus Schema Migration', dueDate: 'Sep 25, 2026', status: 'upcoming' },
      { title: 'Orion Phase 1 UAT Sign-off', dueDate: 'Oct 15, 2026', status: 'upcoming' },
    ],
  },
  {
    id: 'proj-atlas',
    name: 'Project Atlas',
    code: 'ATLAS',
    status: 'planning',
    progress: 28,
    leadName: 'Neha Verma',
    membersCount: 11,
    openTasks: 22,
    milestones: [
      { title: 'Requirements Baseline', dueDate: 'Oct 02, 2026', status: 'in_progress' },
    ],
  },
  {
    id: 'proj-phoenix',
    name: 'Project Phoenix',
    code: 'PHOENIX',
    status: 'active',
    progress: 89,
    leadName: 'Vikram Bose',
    membersCount: 15,
    openTasks: 5,
    milestones: [
      { title: 'Security Audit & Pen-testing', dueDate: 'Sep 18, 2026', status: 'in_progress' },
    ],
  },
];

export const SEED_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-travel-32',
    title: 'Travel & Reimbursement Policy',
    department: 'Finance',
    category: 'Finance',
    owner: 'Priya Sharma',
    version: 'v3.2',
    status: 'Active',
    accessLevel: 'Company',
    isRestricted: false,
    lastUpdated: 'Aug 28, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Jan 01, 2026',
    summary: 'Comprehensive per-diem allowances, hotel lodging ceilings, international flight tiers, and expense filing guidelines.',
    content: `
# Nexora Technologies — Travel & Reimbursement Policy v3.2

### 1. Scope & Applicability
This policy applies to all full-time and contractual employees traveling for approved client business or internal summits across domestic and overseas locations.

### 2. Daily Per-Diem Allowances
* **Domestic Travel**: Flat allowance of ₹3,500/day ($150/day equivalent outside India) covering meals, local cab transit, and incidentals.
* **International Travel**: Economy class flights are approved for flights under 8 hours. Flights over 8 hours permit Premium Economy.
* **Hotel Lodging Ceilings**:
  - Tier-1 Metro Cities (London, NY, SF, Tokyo): Up to **$200/night**.
  - All Other Overseas Locations: Up to **$150/night**.
  - Domestic Metro (Bengaluru, Mumbai, Delhi): Up to **₹6,000/night**.

### 3. Submission & Auditing
All expense receipts above ₹500 ($10) must be uploaded to NexoraERP within 15 days of journey completion. Monthly expense reports close on the 25th of each calendar month.

*(Note: Policy does not specify exceptions for exceeding international accommodation limits for specialized client on-sites without prior VP authorization).*
    `,
    versionHistory: [
      { version: 'v3.2', date: 'Aug 28, 2026', author: 'Priya Sharma', changes: 'Standardized London & SF hotel caps to $200/night.', status: 'current' },
      { version: 'v3.1', date: 'Mar 15, 2026', author: 'Arjun Mehta', changes: 'Added per-diem rules for Pune and Hyderabad delivery hubs.', status: 'previous' },
      { version: 'v3.0', date: 'Jan 02, 2025', author: 'Priya Sharma', changes: 'Initial consolidated corporate travel handbook.', status: 'archived' },
    ],
  },
  {
    id: 'doc-leave-40',
    title: 'Leave & Attendance Policy',
    department: 'HR',
    category: 'HR',
    owner: 'Kavya Iyer',
    version: 'v4.0',
    status: 'Active',
    accessLevel: 'Company',
    isRestricted: false,
    lastUpdated: 'Jul 10, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Jan 01, 2026',
    summary: 'Annual privilege leave allocations, sick leave accrual, maternity/paternity benefits, and mandatory core working hours.',
    content: `
# Nexora Technologies — Leave & Attendance Policy v4.0

### 1. Annual Leave Entitlement
Full-time employees receive:
* **Privilege / Earned Leave (PL)**: 18 days per calendar year, accrued at 1.5 days/month. Maximum 30 days can carry over into the subsequent year.
* **Casual / Sick Leave (SL)**: 12 days per year. Unused SL lapses at year-end.
* **Maternity Leave**: 26 fully paid weeks for eligible female employees.
* **Paternity Leave**: 2 fully paid weeks within 6 months of childbirth.
* **Optional Festival Holidays**: 4 flexible days chosen from the published list.

### 2. Attendance & Core Collaboration Hours
Our hybrid workspace requires attendance clock-in through NexoraERP. Core collaborative hours where all teams are reachable are **10:00 AM to 4:00 PM IST**.
    `,
    versionHistory: [
      { version: 'v4.0', date: 'Jul 10, 2026', author: 'Kavya Iyer', changes: 'Introduced 4 flexible optional festival holidays.', status: 'current' },
      { version: 'v3.5', date: 'Dec 12, 2025', author: 'Ananya Rao', changes: 'Updated paternity leave from 10 days to 14 days.', status: 'previous' },
    ],
  },
  {
    id: 'doc-wfh-20',
    title: 'Work From Home (WFH) & Hybrid Policy',
    department: 'HR',
    category: 'HR',
    owner: 'Kavya Iyer',
    version: 'v2.0',
    status: 'Active',
    accessLevel: 'Company',
    isRestricted: false,
    lastUpdated: 'Feb 14, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Mar 01, 2026',
    summary: 'Hybrid 3/2 split working guidelines, home office ergonomic allowance, and data security while working remotely.',
    content: `
# Nexora Technologies — Hybrid Workplace Policy v2.0

### 1. Hybrid In-Office Expectation
Engineers and staff are expected to work 3 days in-office and may work up to **2 days remotely per week**, aligned with sprint schedules and squad manager consent.

### 2. Ergonomic Home-Office Setup Allowance
Every employee after probation may claim a one-time reimbursement of up to **₹15,000 ($180)** for monitors, ergonomic chairs, and broadband setup.
    `,
    versionHistory: [
      { version: 'v2.0', date: 'Feb 14, 2026', author: 'Kavya Iyer', changes: 'Raised ergonomic setup grant to ₹15,000.', status: 'current' },
    ],
  },
  {
    id: 'doc-expense-21',
    title: 'Expense & Corporate Card Policy',
    department: 'Finance',
    category: 'Finance',
    owner: 'Priya Sharma',
    version: 'v2.1',
    status: 'Active',
    accessLevel: 'Company',
    isRestricted: false,
    lastUpdated: 'May 04, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Jan 01, 2026',
    summary: 'Rules for software subscriptions, team celebration allowances, corporate credit cards, and GST invoice requirements.',
    content: `
# Nexora Technologies — Expense & Corporate Card Policy v2.1

* Team engagement dinners are capped at ₹1,200 per attendee.
* Individual software tools or SaaS purchases must obtain prior IT approval if recurring.
* Monthly submission cutoff is strictly the **25th of the month**.
    `,
    versionHistory: [
      { version: 'v2.1', date: 'May 04, 2026', author: 'Priya Sharma', changes: 'Added automated GSTN reconciliation steps.', status: 'current' },
    ],
  },
  {
    id: 'doc-code-conduct',
    title: 'Employee Handbook & Code of Conduct',
    department: 'HR',
    category: 'Company',
    owner: 'David Wilson',
    version: 'v5.1',
    status: 'Active',
    accessLevel: 'Company',
    isRestricted: false,
    lastUpdated: 'Jan 15, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Jan 01, 2026',
    summary: 'Core organizational values, anti-harassment POSH procedures, intellectual property protections, and ethics hotline.',
    content: `
# Nexora Technologies — Employee Handbook v5.1

Nexora Technologies is committed to an open, inclusive, meritocratic culture. External consulting or secondary commercial employment without explicit board permission is strictly prohibited.
    `,
    versionHistory: [
      { version: 'v5.1', date: 'Jan 15, 2026', author: 'David Wilson', changes: 'Annual revision with revised whistleblower committee.', status: 'current' },
    ],
  },
  {
    id: 'doc-exec-comp',
    title: 'Confidential Executive Compensation & Equity Framework',
    department: 'HR',
    category: 'HR',
    owner: 'David Wilson',
    version: 'v1.0',
    status: 'Active',
    accessLevel: 'HR Restricted',
    isRestricted: true,
    lastUpdated: 'Jun 20, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Jul 01, 2026',
    summary: 'Executive Band 7+ stock option vesting cliffs, retention incentives, and board governance agreements.',
    content: `
# RESTRICTED ACCESS — Executive Compensation Framework v1.0
*Authorized Access Only: HR Leadership & Super Administrators*

Contains sensitive equity allocation formulas, cliff schedules, and executive incentive structures.
    `,
    versionHistory: [
      { version: 'v1.0', date: 'Jun 20, 2026', author: 'David Wilson', changes: 'Approved by board of directors.', status: 'current' },
    ],
  },
  {
    id: 'doc-orion-arch',
    title: 'Project Orion Architecture & System Specification',
    department: 'Projects',
    category: 'Projects',
    project: 'Project Orion',
    owner: 'Rohan Kapoor',
    version: 'v2.4',
    status: 'Active',
    accessLevel: 'Project Orion Only',
    isRestricted: true,
    lastUpdated: 'Aug 19, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Sep 01, 2025',
    summary: 'Technical architecture for next-gen fintech engine, event schemas, isolated database schemas, and microservice topologies.',
    content: `
# Project Orion — System Architecture Specification v2.4

### 1. Technology Topology
* **Ingestion Layer**: High-throughput Go gateway exposing gRPC + REST endpoints.
* **Message Broker**: Apache Kafka partitioned by tenant and account routing keys.
* **Storage Layer**: PostgreSQL 16 with row-level security and read-replicas.
* **Vector Store**: ChromaDB with tenant collection namespaces.
    `,
    versionHistory: [
      { version: 'v2.4', date: 'Aug 19, 2026', author: 'Snigdha Patra', changes: 'Added tenant row isolation diagrams and Kafka consumer groups.', status: 'current' },
      { version: 'v2.3', date: 'May 10, 2026', author: 'Rohan Kapoor', changes: 'Initial microservices topology breakdown.', status: 'previous' },
    ],
  },
  {
    id: 'doc-orion-runbook',
    title: 'Project Orion Release & Incident Runbook',
    department: 'Projects',
    category: 'Projects',
    project: 'Project Orion',
    owner: 'Rohan Kapoor',
    version: 'v1.8',
    status: 'Active',
    accessLevel: 'Project Orion Only',
    isRestricted: true,
    lastUpdated: 'Jul 22, 2026',
    lastSynced: 'Sep 01, 2026',
    effectiveDate: 'Oct 01, 2025',
    summary: 'Standard operating procedures for Orion deployments, canary release gates, rollback triggers, and on-call rotations.',
    content: `
# Project Orion — Release & Runbook v1.8

* Production deployments are scheduled on **Tuesdays at 10:00 PM IST**.
* Automated canary verifies 1% traffic for 30 minutes before progressive rollout.
* Rollback automatically initiates if 5xx HTTP error rate exceeds 0.8% over 3 minutes.
    `,
    versionHistory: [
      { version: 'v1.8', date: 'Jul 22, 2026', author: 'Rahul Sharma', changes: 'Decreased rollback threshold to 0.8% error rate.', status: 'current' },
    ],
  },
  {
    id: 'doc-orion-uat',
    title: 'Project Orion UAT Plan & Testing Sign-Off',
    department: 'Projects',
    category: 'Projects',
    project: 'Project Orion',
    owner: 'Rohan Kapoor',
    version: 'v1.2',
    status: 'Active',
    accessLevel: 'Project Orion Only',
    isRestricted: true,
    lastUpdated: 'Sep 02, 2026',
    lastSynced: 'Sep 02, 2026',
    effectiveDate: 'Oct 15, 2026',
    summary: 'End-user acceptance test scripts, synthetic test accounts, performance criteria, and sign-off stakeholders.',
    content: `
# Project Orion — UAT Milestone Plan v1.2

* Phase 1 User Acceptance Testing begins on **October 15, 2026**.
* Target performance: 99th percentile response time below 180ms under 2,500 RPS load.
    `,
    versionHistory: [
      { version: 'v1.2', date: 'Sep 02, 2026', author: 'Rohan Kapoor', changes: 'Finalized test scenarios with customer stakeholders.', status: 'current' },
    ],
  },
];

export const INITIAL_ESCALATIONS: EkaRequest[] = [
  {
    id: 'FIN-2026-0142',
    query: 'Can I claim accommodation above the normal limit for a client visit next month?',
    requestedBy: 'Snigdha Patra',
    requesterEmail: 'snigdha.patra@nexora.com',
    department: 'Finance',
    priority: 'High',
    status: 'Pending Review',
    createdAt: 'Today, 09:45 AM',
    assignedAdmin: 'Priya Sharma',
    timeline: [
      {
        stage: 'Submitted',
        timestamp: 'Today, 09:45 AM',
        actor: 'Snigdha Patra',
        notes: 'Automatic escalation created from EKA Insufficient-Evidence response.',
      },
      {
        stage: 'Assigned',
        timestamp: 'Today, 09:50 AM',
        actor: 'Priya Sharma',
        notes: 'Assigned to departmental lead queue for policy exception review.',
      },
    ],
  },
  {
    id: 'HR-2026-0089',
    query: 'Is there paid bereavement leave available for immediate family members residing abroad?',
    requestedBy: 'Arjun Mehta',
    requesterEmail: 'arjun.mehta@nexora.com',
    department: 'HR',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-09-03 11:20 AM',
    assignedAdmin: 'Kavya Iyer',
    response: 'Yes. Nexora provides 5 consecutive paid bereavement days for immediate family, with up to 3 additional days allowed for foreign travel upon manager consent.',
    proposedAsKnowledge: true,
    timeline: [
      { stage: 'Submitted', timestamp: 'Sep 03, 11:20 AM', actor: 'Arjun Mehta' },
      { stage: 'Assigned', timestamp: 'Sep 03, 11:45 AM', actor: 'Kavya Iyer' },
      { stage: 'Under Review', timestamp: 'Sep 03, 02:15 PM', actor: 'Kavya Iyer' },
      { stage: 'Resolved', timestamp: 'Sep 03, 04:30 PM', actor: 'Kavya Iyer', notes: 'Answer verified with global policy.' },
    ],
  },
  {
    id: 'ORION-2026-0045',
    query: 'How do I request temporary elevated read-replica credentials for debugging production latency?',
    requestedBy: 'Rahul Sharma',
    requesterEmail: 'rahul.sharma@nexora.com',
    department: 'Projects',
    project: 'Project Orion',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2026-09-05 09:10 AM',
    assignedAdmin: 'Rohan Kapoor',
    timeline: [
      { stage: 'Submitted', timestamp: 'Sep 05, 09:10 AM', actor: 'Rahul Sharma' },
      { stage: 'Assigned', timestamp: 'Sep 05, 09:30 AM', actor: 'Rohan Kapoor' },
      { stage: 'Under Review', timestamp: 'Sep 05, 10:15 AM', actor: 'Rohan Kapoor', notes: 'Validating AWS IAM temporary STS token role.' },
    ],
  },
];

export const INITIAL_RAG_CHUNKS: RagLearnedChunk[] = [
  {
    id: 'rag-chunk-fin-0142',
    requestId: 'FIN-2026-0142',
    query: 'Can I claim accommodation above the normal limit for a client visit next month?',
    department: 'Finance',
    policyDocId: 'doc-travel-32',
    policyDocTitle: 'Travel & Reimbursement Policy',
    version: 'v3.3',
    responseSnippet: 'Approved exception: Hotel accommodation up to $280/night is permitted for verified Tier-1 client visits exceeding 3 days with VP prior email signoff.',
    status: 'pending_admin',
    countdownSeconds: 6,
    createdAt: 'Today, 09:45 AM',
  },
];

export const INITIAL_KNOWLEDGE_GAPS: KnowledgeGap[] = [
  {
    id: 'gap-1',
    topic: 'International Travel Accommodation Exception',
    sampleQuery: 'Can I claim accommodation above the normal limit for a client visit next month?',
    queriesCount: 27,
    escalationsCount: 11,
    responsibleDept: 'Finance',
    coverageScore: 32,
    recommendation: 'Update Travel & Reimbursement Policy v3.2 Section 2.3 to specify client visit escalation limits up to $280/night with VP email authorization.',
  },
  {
    id: 'gap-2',
    topic: 'Home Ergonomic Equipment Expansion',
    sampleQuery: 'Can I replace my home dual monitor setup after 2 years under the WFH subsidy?',
    queriesCount: 19,
    escalationsCount: 8,
    responsibleDept: 'HR',
    coverageScore: 48,
    recommendation: 'Amend Hybrid Policy v2.0 with a 24-month hardware refresh lifecycle.',
  },
  {
    id: 'gap-3',
    topic: 'Orion Staging Database Read-Only Access',
    sampleQuery: 'Who grants read replica credentials for Orion performance benchmarking?',
    queriesCount: 14,
    escalationsCount: 6,
    responsibleDept: 'Projects (Orion)',
    coverageScore: 55,
    recommendation: 'Document self-service AWS IAM AssumeRole runbook in Orion Architecture Wiki.',
  },
  {
    id: 'gap-4',
    topic: 'Client Entertainment Dining Limits',
    sampleQuery: 'What is the per-person ceiling for a prospective partner executive lunch?',
    queriesCount: 12,
    escalationsCount: 5,
    responsibleDept: 'Finance',
    coverageScore: 61,
    recommendation: 'Clarify Business Development meal thresholds in Expense Policy Section 4.',
  },
];

export const INITIAL_SYNC_HISTORY: SyncRecord[] = [
  {
    id: 'sync-108',
    timestamp: 'Sep 01, 2026, 02:00 AM',
    scope: 'Full Sync',
    changedCount: 14,
    addedCount: 3,
    removedCount: 1,
    status: 'Synchronized',
    duration: '4m 18s',
    details: [
      'Travel Policy v3.2 indexed with 18 chunks updated',
      'Orion Architecture Spec v2.4 added to Orion Vector namespace',
      'Employee Leave Ledger 18,492 rows reconciled with PostgreSQL',
    ],
  },
  {
    id: 'sync-107',
    timestamp: 'Aug 18, 2026, 02:00 AM',
    scope: 'Full Sync',
    changedCount: 9,
    addedCount: 2,
    removedCount: 0,
    status: 'Synchronized',
    duration: '3m 52s',
    details: [
      'HR Leave Policy v4.0 festival holiday table updated',
      'Expense Policy v2.1 corporate card limits updated',
    ],
  },
];
