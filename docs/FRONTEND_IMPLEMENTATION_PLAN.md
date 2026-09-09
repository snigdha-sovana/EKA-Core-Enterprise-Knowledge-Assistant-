# Frontend Implementation Plan: NexoraERP + EKA (Enterprise Knowledge Assistant)

This implementation plan serves as the definitive reference document for developing the complete frontend experience for **NexoraERP** with its embedded AI assistant, **EKA**.

---

## 1. Product Vision & Principles

### A. Context & Purpose
- **Company**: Nexora Technologies (Enterprise software / SaaS consulting)
- **ERP**: NexoraERP
- **Locations**: Bengaluru, Mumbai, Hyderabad, Pune
- **Core Concept**: EKA is an AI-powered assistant embedded inside a realistic enterprise ERP. Employees access EKA directly within their daily workflows (attendance, leave, expenses, project boards) rather than in an isolated chatbot interface.
- **Strict Behavioral Rule (Abstention)**: When the knowledge base lacks sufficient evidence, EKA must **visibly abstain** rather than hallucinate, offering an instant **"Request Review"** escalation button that routes the inquiry to the appropriate departmental administrator (e.g. generating `FIN-2026-0142`).
- **14-Day Reconciliation**: A visual simulation of automatic enterprise data synchronization occurring on a 14-day cycle.

---

## 2. Visual Design System & Color Tokens

The UI strictly follows the enterprise color tokens defined in the specification:

| Role / State | Color Token | Hex Code | Tailwind Equivalent | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Core ERP Identity** | Corporate Blue | `#1E40AF` / `#2563EB` | `bg-blue-600`, `text-blue-600`, `border-blue-500` | Sidebar navigation, primary ERP actions, links, system headers |
| **EKA / AI Identity** | Royal Purple | `#7C3AED` / `#8B5CF6` | `bg-purple-600`, `text-purple-600`, `border-purple-400` | Floating EKA launcher, chat panel, citations, AI response bubbles |
| **Success / Healthy** | Emerald Green | `#059669` / `#10B981` | `bg-emerald-500`, `text-emerald-700`, `bg-emerald-50` | Resolved requests, synchronized status, high-confidence badges |
| **Pending / Warning** | Amber / Orange | `#D97706` / `#F59E0B` | `bg-amber-500`, `text-amber-700`, `bg-amber-50` | In-review requests, pending sync changes, needs-review badges |
| **Critical / Failed** | Crimson Red | `#DC2626` / `#EF4444` | `bg-red-600`, `text-red-700`, `bg-red-50` | Urgent escalations, sync errors, access-restricted notices |
| **Enterprise Neutral** | Cool Slate | `#F8FAFC` / `#E2E8F0` / `#0F172A` | `bg-slate-50`, `bg-white`, `border-slate-200`, `text-slate-900` | Page canvas, white cards, subtle borders, high-density data tables |

---

## 3. Roles, User Profiles & Seed Data

### A. Demo Personas (1-Click Role Switcher on `/login` and TopBar)

| User ID | Full Name | Email | Role | Department | Default Project |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EMP001` | **Snigdha Patra** | `employee@nexora.com` | `employee` | Engineering | Project Orion |
| `FIN-ADMIN-01` | **Priya Sharma** | `finance.admin@nexora.com` | `finance_admin` | Finance | — |
| `HR-ADMIN-01` | **Kavya Iyer** | `hr.admin@nexora.com` | `hr_admin` | HR | — |
| `ORION-ADMIN-01` | **Rohan Kapoor** | `orion.admin@nexora.com` | `orion_admin` | Projects | Project Orion |
| `SUPER-ADMIN-01` | **David Wilson** | `superadmin@nexora.com` | `super_admin` | Executive | All Tenants |

### B. Enterprise Knowledge Base Documents

| Document Title | Department | Current Version | Access Level | Description & Key Trigger |
| :--- | :--- | :---: | :--- | :--- |
| **Travel & Reimbursement Policy** | Finance | `v3.2` | Company-wide | Per-diem limits: Domestic ₹3,500/day ($150/day), International Economy airfare allowed, Hotel cap $200/night. Special client visit exceptions require VP approval (not in policy).<br>*Supported Q: "What is the reimbursement policy for international travel?"*<br>*Unsupported Q: "Can I claim accommodation above the normal limit for a client visit next month?"* |
| **Expense & Corporate Card Policy** | Finance | `v2.1` | Company-wide | Receipts mandatory for >₹500. Monthly filing deadline is 25th. Corporate card usage rules. |
| **Leave & Attendance Policy** | HR | `v4.0` | Company-wide | 18 Paid Privilege Leaves, 12 Sick/Casual Leaves, 26 weeks Maternity, 2 weeks Paternity, 4 optional festival holidays.<br>*Supported Q: "How many leaves do I have?"* |
| **Work From Home & Hybrid Policy** | HR | `v2.0` | Company-wide | 2 days remote per week with manager consent. Ergonomic reimbursement ₹15,000 one-time. Core hours 10 AM – 4 PM. |
| **Employee Code of Conduct** | HR | `v5.1` | Company-wide | Workplace ethics, anti-harassment, social media guidelines, grievance escalation procedures. |
| **Confidential Executive Compensation** | HR (Restricted) | `v1.0` | **Restricted** (HR Admin & Super Admin only) | Band 7+ ESOP vesting schedules, executive retention bonuses. Displays lock badge for Employee/Finance Admin. |
| **Project Orion Architecture Spec** | Engineering | `v2.4` | **Project Orion Members** | Microservices overview, Kafka event schemas, Go payment gateway, PostgreSQL isolation. |
| **Project Orion Release Runbook** | Engineering | `v1.8` | **Project Orion Members** | Deployment window: Tuesdays 10 PM. Rollback trigger on 5xx error rate >1%. |
| **Project Orion UAT Plan** | Engineering | `v1.2` | **Project Orion Members** | Phase 1 UAT starts Oct 15, 2026. Testing sign-off criteria and load test parameters. |

---

## 4. Route Hierarchy

```text
/
├── /login                         # NexoraERP branded login + 1-click demo role switcher
│
├── /app                           # Employee Experience (Blue ERP + Purple EKA)
│   ├── /dashboard                 # Personal KPIs, My Tasks, Quick Access, EKA prompt card
│   ├── /profile                   # Employee profile & emergency contacts
│   ├── /attendance                # Daily clock-in/out records & timesheet
│   ├── /leave                     # Leave balance cards, apply leave form, approval history
│   ├── /expenses                  # Submit expense claim, receipt upload, status table
│   ├── /projects                  # Projects list & details (/orion, /atlas, /phoenix)
│   ├── /documents                 # Searchable company document library
│   └── /eka                       # EKA Assistant Workspace
│       ├── /chat                  # Conversational interface with citations & confidence
│       ├── /history               # Prior conversation threads
│       └── /requests              # Personal escalation queue with live timeline
│
├── /admin/hr                      # HR Admin Experience
│   ├── /dashboard                 # HR KPIs, leave query stats, average response times
│   ├── /requests                  # HR EKA escalation queue & resolution drawer
│   ├── /documents                 # HR policy management & document upload
│   ├── /policies                  # Policy editor & revision manager
│   └── /knowledge                 # HR knowledge analytics & queries
│
├── /admin/finance                 # Finance Admin Experience
│   ├── /dashboard                 # Finance KPIs, expense request trend chart, category donut
│   ├── /requests                  # Finance EKA Queue (contains FIN-2026-0142)
│   ├── /expenses                  # Expense review table with approval actions
│   ├── /documents                 # Finance travel & procurement policies
│   ├── /policies                  # Policy revision management
│   └── /knowledge                 # Finance knowledge repository & proposals
│
├── /admin/projects/orion          # Project Orion Admin Experience
│   ├── /dashboard                 # Sprint progress, open tasks, milestone burn-down
│   ├── /requests                  # Orion technical query escalations
│   ├── /documents                 # Architecture docs, runbooks, RFCs
│   ├── /team                      # Team member roster & role management
│   └── /knowledge                 # Project technical wiki & FAQs
│
└── /super-admin                   # Super Admin Experience
    ├── /dashboard                 # Global metrics: total users, docs, resolution rate
    ├── /users                     # Multi-tenant user directory & permission controls
    ├── /departments               # Department directory & admin assignment
    ├── /admins                    # System admin role assignments
    ├── /knowledge                 # Global Knowledge Hub with Version History Drawer
    ├── /documents                 # Master company document repository
    ├── /access-control            # Role/Group Access Matrix with visual lock indicators
    ├── /eka-analytics             # Usage trends, query volume, department breakdown
    ├── /knowledge-gaps            # Ranked unanswerable queries & content recommendations
    ├── /sync-monitor              # 14-Day Sync Monitor with animated full sync & history
    ├── /audit-logs                # Immutable security audit log table
    └── /settings                  # Global platform configuration & model preferences
```

---

## 5. Phase-by-Phase Implementation Plan

### Phase 1: Foundation, Tokens, Multi-Role State & App Shell
- [ ] **Dependencies**: Install `recharts` for enterprise data visualization.
- [ ] **Design Tokens (`src/index.css`, `tailwind.config.js`)**: Establish exact color variables for Corporate Blue (`#1E40AF`/`#2563EB`), EKA Purple (`#7C3AED`/`#8B5CF6`), Emerald Green, Amber, Red, and Neutral Slate.
- [ ] **Global State Store (`src/context/AppContext.tsx`)**:
  - Store current user and role (`employee`, `finance_admin`, `hr_admin`, `orion_admin`, `super_admin`).
  - Centralize mock ERP data, documents, escalations, conversation threads, and sync history.
  - Provide reactive action dispatchers (create escalation, resolve escalation, run sync, propose knowledge).
- [ ] **Branded Login Screen (`src/Login.tsx`)**:
  - NexoraERP corporate layout with email/password inputs.
  - Interactive **1-Click Demo Persona Switcher** (Snigdha, Priya, Kavya, Rohan, David).
- [ ] **App Shell & Layouts (`src/components/layout/*`)**:
  - `Sidebar.tsx`: Role-aware persistent navigation with Blue active indicators.
  - `TopBar.tsx`: Global search, notification badge, current role badge, and user avatar dropdown with quick role-switch capability.

---

### Phase 2: Employee Portal & Interactive EKA Assistant
- [ ] **Employee Dashboard (`src/pages/employee/EmployeeDashboard.tsx`)**:
  - Header with greeting and date.
  - KPI Cards: Leave Balance (14d), Pending Approvals (2), Active Projects (Project Orion), Unread Announcements.
  - My Tasks high-density table.
  - Quick Access shortcuts (Apply Leave, Submit Expense, Orion Docs).
  - **Inline EKA Prompt Card** with pre-populated clickable chips.
- [ ] **Persistent Floating EKA Widget & Chat Panel (`src/components/eka/*`)**:
  - Floating action button in bottom-right corner with purple glow.
  - Slide-out conversational drawer + dedicated full page (`/app/eka/chat`).
  - Message rendering with user bubbles and EKA purple AI response cards.
  - **Source Citation Cards**: Displays Document Name, Department, Version, and High-Confidence emerald badge.
- [ ] **Abstention & Escalation Engine (`src/components/eka/EscalationCard.tsx`)**:
  - Detects unsupported inquiries (*"Can I claim accommodation above the normal limit for a client visit next month?"*).
  - Renders **Insufficient Evidence** warning card instead of hallucinating.
  - Renders **"Request Finance Review"** button.
  - Clicking creates mock escalation **`FIN-2026-0142`** and displays submission timestamp with link to requests.
- [ ] **Employee Request History (`src/pages/employee/EmployeeRequests.tsx`)**:
  - Filter tabs: All, Pending, In Progress, Resolved.
  - Interactive **Timeline Drawer**: `Submitted → Assigned (Priya Sharma) → Reviewed → Resolved`.

---

### Phase 3: Departmental Admin Portals (Finance, HR, Project Orion)
- [ ] **Finance Admin Portal (`src/pages/finance/*`)**:
  - `FinanceDashboard.tsx`: KPI cards (EKA Requests: 18, Policy Queries: 142, Docs: 12, Avg Response: 4.2 hrs), Expense Request Trend bar chart, Expense Category donut chart.
  - `FinanceRequests.tsx`: High-density escalation table featuring `FIN-2026-0142`.
  - `RequestDetailModal.tsx`:
    - Displays employee inquiry, original context, and EKA confidence state.
    - Admin response editor with preset quick templates.
    - Checkbox: **"Propose this response as company knowledge"**.
    - Actions: `Save Draft`, `Resolve Request`, `Escalate`.
    - Resolving updates the request across the application and flags a new knowledge proposal.
- [ ] **HR Admin Portal (`src/pages/hr/*`)**:
  - `HrDashboard.tsx`: Leave query metrics, HR document repository, common HR query chart.
  - `HrRequests.tsx`: HR escalation queue.
- [ ] **Project Orion Admin Portal (`src/pages/projects/*`)**:
  - `OrionDashboard.tsx`: Milestone burn-down, sprint tasks, team roster, technical documentation list.
  - Technical inquiry escalation handler.

---

### Phase 4: Super Admin Suite, Knowledge Hub & 14-Day Sync Monitor
- [ ] **Super Admin Dashboard (`src/pages/superadmin/SuperAdminDashboard.tsx`)**:
  - Global metrics: Total Users (184), Departments (6), Total Documents (1,284), Resolution Rate (88.4%), Escalation Rate (11.6%).
  - Query volume trend line chart and Department-wise query distribution donut chart.
  - System health cards (PostgreSQL, Redis, Vector Engine, LLM Provider).
- [ ] **Company Knowledge Hub (`src/pages/superadmin/KnowledgeHub.tsx`)**:
  - Grid/list toggle with search and category tabs (HR, Finance, Projects, Company).
  - Document cards with status badges, version numbers, and lock icons for restricted files.
  - **Version History Drawer**: Displays version tree (`v3.2 Current`, `v3.1 Previous`, `v3.0 Archived`) with preview pane.
- [ ] **Access-Control Matrix (`src/pages/superadmin/AccessControlMatrix.tsx`)**:
  - Interactive matrix mapping Knowledge Areas to Roles with green checkmarks, dashes, and lock badges.
- [ ] **Knowledge Gap Analytics (`src/pages/superadmin/KnowledgeGaps.tsx`)**:
  - Ranked unanswerable questions (e.g. *International travel accommodation: 27 queries, 11 escalations*).
  - Actionable recommendations (*"Update Finance Travel Policy Section 4.2 with client exception limits"*).
- [ ] **14-Day Automatic Sync Monitor (`src/pages/superadmin/SyncMonitor.tsx`)**:
  - Freshness gauge (92% Up-to-Date).
  - Timestamps: *Last Full Sync: Sep 1, 2026* | *Next Full Sync: Sep 15, 2026*.
  - Department breakdown (HR: 98%, Finance: 100%, Engineering: 94%, Sales: 91%, IT: 100%).
  - **"Run Full Sync" Action**: Triggers an animated progress bar stepping through extraction, chunking, and embedding generation, updating timestamps and recording an event in **Sync History**.

---

### Phase 5: Hybrid Backend Integration, Real RAG Stream & Polish
- [ ] **API Service Adapter (`src/services/api.ts`)**:
  - Connects to the running FastAPI server at `http://localhost:8000`:
    - `POST /auth/login` for genuine JWT token authentication.
    - `POST /query` and `POST /query/stream` for real ChromaDB + LLM query responses.
    - `GET /healthz` for live infrastructure health status.
  - Seamless fallback to rich local state if backend is paused, guaranteeing complete demo reliability.
- [ ] **Micro-Interactions & Transitions**:
  - Toast notifications for request status changes and sync completion.
  - Loading skeletons, empty states for tables, and smooth modal overlays.
- [ ] **End-to-End Verification**: Execute the full 18-step interview demonstration flow.

---

## 6. The 18-Step Interview Demo Script

1. **Login**: Navigate to `/login` and click **Employee (Snigdha Patra)**.
2. **Dashboard**: View personal leave cards, tasks, and click EKA suggested chip: *"How many leaves do I have?"*.
3. **ERP Answer**: EKA provides exact leave breakdown (14 Privilege, 8 Sick).
4. **Policy Answer**: Ask *"What is the reimbursement policy for international travel?"* $\rightarrow$ EKA renders verified answer with citation card for **Finance Travel Policy v3.2**.
5. **Abstention Query**: Ask *"Can I claim accommodation above the normal limit for a client visit next month?"*.
6. **Abstention Rendered**: EKA displays **Insufficient Evidence** card with explanation.
7. **Escalate**: Click **"Request Finance Review"** $\rightarrow$ System generates request **`FIN-2026-0142`**.
8. **Switch Persona**: Use TopBar avatar menu to switch to **Finance Admin (Priya Sharma)**.
9. **Queue**: Navigate to `/admin/finance/requests` $\rightarrow$ View `FIN-2026-0142` at top of queue.
10. **Review Detail**: Open request detail modal $\rightarrow$ View missing policy context and employee question.
11. **Admin Response**: Type resolution: *"Accommodation up to $280/night approved for client visits with prior VP email approval."*.
12. **Propose Knowledge**: Toggle **"Propose this response as company knowledge"** and click **Resolve Request**.
13. **Switch Back**: Return to **Employee (Snigdha Patra)** $\rightarrow$ Open `/app/eka/requests`.
14. **Verify Timeline**: Observe `FIN-2026-0142` status marked **Resolved** with complete audit timeline.
15. **Super Admin**: Switch to **Super Admin (David Wilson)**.
16. **Knowledge Gaps**: Open `/super-admin/knowledge-gaps` to observe query clusters and AI recommendations.
17. **Access Matrix**: Open `/super-admin/access-control` to view role permissions and restricted badges.
18. **Sync Monitor**: Open `/super-admin/sync-monitor` and click **"Run Full Sync"** $\rightarrow$ Watch animated reconciliation progress bar update timestamps.
