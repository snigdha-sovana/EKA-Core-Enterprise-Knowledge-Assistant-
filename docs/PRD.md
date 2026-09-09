# Enterprise Knowledge Assistant — Product Requirements Document

> **Version:** 1.1  
> **Status:** Draft for Review  
> **Date:** September 2026  
> **Owner:** Engineering / Product  
> **Base Codebase:** [`production-grade-rag`](https://github.com/Ashok007-cmd/production-grade-rag)

### Decision Log

| Decision | Value | Impact | Closed |
|---|---|---|---|
| **OQ-6 — Max corpus size (v1)** | 100 documents per tenant | ChromaDB embedded mode is sufficient; no distributed vector DB needed at launch | 2026-09-04 |
| **OQ-7 — Multi-tenancy required** | Yes — v1 must isolate multiple organizations on one deployment | Adds `tenant_id` as a first-class key across all schema tables, ChromaDB collections, Redis namespaces, and RBAC scopes. See Feature Group 13. | 2026-09-04 |

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Target Users](#2-target-users)
3. [Product Vision & Strategy](#3-product-vision--strategy)
4. [Core Features](#4-core-features) *(Feature Groups 1–12 + **13 — Multi-Tenancy**)*
5. [Non-Goals — What We Are NOT Building](#5-non-goals--what-we-are-not-building)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Technical Stack](#7-technical-stack)
8. [Success Criteria & KPIs](#8-success-criteria--kpis)
9. [Milestones & Phased Roadmap](#9-milestones--phased-roadmap)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Open Questions](#11-open-questions)

---

## 1. Problem Statement

### The Organizational Knowledge Crisis

Modern enterprises generate enormous volumes of internal knowledge — technical documentation, policy manuals, compliance guidelines, SOPs, support tickets, research reports, and runbooks — distributed across SharePoint sites, Confluence wikis, Google Drive folders, Slack threads, and S3 buckets. This knowledge is **theoretically accessible but practically unreachable**.

The consequences are severe and measurable:

| Pain Point | Organizational Impact |
|---|---|
| **Knowledge siloing** | Teams duplicate work because they cannot find what colleagues already built |
| **Expert bottleneck** | 20% of employees field 80% of repetitive internal questions, creating burnout and scaling failure |
| **Compliance risk** | Employees act on outdated policy versions because locating the current one takes too long |
| **Onboarding drag** | New hires take 3–6 months to reach productivity, largely from knowledge discovery delays |
| **Unstructured data blindspot** | Keyword search returns documents, not answers — users must read entire docs to extract a single fact |
| **Access control chaos** | Sharing the wrong document is a data breach; restricting too broadly kills utility |

### Why Existing Solutions Fall Short

| Existing Approach | Why It Fails |
|---|---|
| **SharePoint / Confluence search** | Returns document titles, not answers. Keyword-only, no semantic understanding |
| **Off-the-shelf LLM chatbots (e.g., ChatGPT)** | No access to private knowledge; hallucinate when asked about internal content |
| **Generic RAG prototypes** | No auth, no access control, no audit trail — not safe for enterprise deployment |
| **Vendor SaaS (e.g., Glean, Guru)** | Expensive, data sovereignty concerns, no customization, vendor lock-in |
| **Internal wikis + document search** | High maintenance burden, becomes stale, still does not answer — only points |

### The Core Gap

There is no production-ready, self-hosted system that combines:

1. **Semantic question answering** over private, multi-format knowledge bases
2. **Document-level access control** that mirrors organizational permissions
3. **Trustworthy answers** with verifiable citations, confidence scores, and honest abstention when the system does not know
4. **Enterprise-grade infrastructure** — auth, caching, persistence, observability, CI/CD — without shipping organizational data to a third-party SaaS provider

This PRD specifies the **Enterprise Knowledge Assistant (EKA)** — the system that closes this gap, built as a production-grade evolution of the existing `production-grade-rag` codebase.

---

## 2. Target Users

### Primary Personas

#### Persona 1 — The Knowledge Seeker (Daily Active User)
> *"I need a specific answer from our internal docs in under 30 seconds, not a list of links to read through."*

- **Who:** Individual contributors, analysts, support engineers, sales engineers, onboarding employees
- **Frequency:** 5–20 queries per day
- **Core need:** Fast, accurate, cited answers to questions like *"What is our refund policy for enterprise contracts?"* or *"Which authentication flow does the payments service use?"*
- **Pain today:** Opens 4–7 documents, reads through them, still not sure if the answer is current
- **Success:** Gets a direct answer with a source citation and a confidence indicator in < 5 seconds

#### Persona 2 — The Knowledge Curator (Weekly Active User)
> *"I need to control which teams can see which documents, and know when someone is accessing sensitive materials."*

- **Who:** Knowledge managers, IT admins, department heads, compliance officers
- **Frequency:** 1–5 sessions per week
- **Core need:** Upload documents, assign access scopes (team, role, department), review usage, retire outdated content
- **Pain today:** Access control is binary (share/don't share); no usage visibility; no way to know if content is being used or ignored
- **Success:** Granular permission management, upload queue, content audit trail, usage metrics per document

#### Persona 3 — The Platform Engineer (Operational Owner)
> *"I need to deploy this reliably, observe what's happening, and iterate without breaking production."*

- **Who:** MLOps engineers, platform engineers, DevOps
- **Frequency:** Daily during development; weekly in steady state
- **Core need:** Docker-compose up, CI/CD green, dashboards for latency/errors/cache hit rates, quality gate on every merge
- **Pain today:** RAG systems are black boxes — when answers degrade, there is no signal
- **Success:** Full observability stack, evaluation CI gate, one-command local dev environment, < 5 min deploy time

#### Persona 4 — The Executive Sponsor (Monthly Stakeholder)
> *"I need to see that this system is being used, that it's accurate, and that it's not creating compliance exposure."*

- **Who:** VP Engineering, CTO, Head of IT, Chief Compliance Officer
- **Frequency:** Monthly review
- **Core need:** Usage adoption, answer quality trends, access control audit, ROI indicators (hours saved)
- **Pain today:** No visibility into knowledge system effectiveness
- **Success:** A dashboard showing query volume, quality scores over time, top question categories, and failed/abstained queries

---

## 3. Product Vision & Strategy

### Vision Statement

> **The Enterprise Knowledge Assistant is the single source of truth interface for an organization's private knowledge — delivering instant, cited, access-controlled answers with the trustworthiness standards of a compliance department and the speed of a search engine.**

### Strategic Positioning

This system is **not** an AI copilot, **not** a document management system, and **not** a general-purpose chatbot. It is a **precision knowledge retrieval layer** designed to be:

- **Auditable** — every answer traceable to source chunks
- **Trustworthy** — says "I don't know" rather than hallucinating
- **Permissioned** — answers only what the asking user is allowed to see
- **Observable** — every query logged, scored, and available for continuous improvement

### Differentiators vs. Alternatives

| Dimension | EKA | Generic RAG | SaaS (Glean/Guru) |
|---|---|---|---|
| Data sovereignty | ✅ Self-hosted | ✅ Self-hosted | ❌ Vendor cloud |
| Document-level ACL | ✅ | ❌ Usually absent | ✅ Partial |
| Confidence scoring + abstention | ✅ | ❌ | ❌ |
| Hybrid search (BM25 + vector) | ✅ | ⚠️ Varies | ⚠️ Varies |
| Cross-encoder reranking | ✅ | ❌ Rarely | ❌ |
| Evaluation CI gate | ✅ | ❌ | ❌ |
| Redis caching layer | ✅ | ❌ | ❌ Opaque |
| PostgreSQL audit + analytics | ✅ | ❌ | ⚠️ Limited |
| Open source / customizable | ✅ | ✅ | ❌ |

---

## 4. Core Features

### Feature Group 1 — Authentication & Identity

#### F1.1 — JWT-Based User Authentication
- **What:** Every API request requires a valid JWT issued by the EKA auth service or delegated to an external IdP (OAuth2 / OIDC)
- **Why:** The current codebase supports a single static Bearer token (`RAG_API_KEY`). Enterprise use requires per-user identity for access control, audit trails, and personalized analytics
- **Acceptance Criteria:**
  - `POST /auth/login` issues a signed JWT with user ID, roles, and department claims
  - `POST /auth/refresh` rotates tokens with a 7-day refresh window
  - All `/query`, `/ingest`, and `/admin` routes reject requests without a valid JWT (401)
  - JWT secrets rotate via environment variable without service restart
  - Passwords stored as bcrypt hashes in PostgreSQL; plaintext never logged

#### F1.2 — Role-Based Access Control (RBAC)
- **What:** Three built-in roles — `viewer` (query only), `curator` (ingest + manage documents), `admin` (full access including user management and analytics)
- **Acceptance Criteria:**
  - Role assignments stored in PostgreSQL `user_roles` table
  - Middleware rejects privilege-escalating requests with 403
  - Role changes take effect on next token refresh (no hot-reload needed)
  - Admin UI tab for role assignment (see Feature Group 7)

#### F1.3 — OAuth2 / OIDC Federation (Optional)
- **What:** Delegate authentication to corporate IdPs (Google Workspace, Azure AD, Okta) via OIDC
- **Why:** Enterprises will not maintain a separate user database — they require SSO
- **Acceptance Criteria:**
  - Configurable `OIDC_PROVIDER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` env vars
  - Claims mapping from IdP groups to EKA roles via configurable JSON map
  - Graceful fallback to local auth when OIDC is unconfigured

---

### Feature Group 2 — Document-Level Access Control

#### F2.1 — Document Permissions Model
- **What:** Each ingested document carries an `access_policy` — a set of allowed user IDs, roles, or department tags. Retrieval filters results to only chunks whose parent document is accessible to the requesting user
- **Why:** Without this, a `viewer` in Marketing can retrieve chunks from an HR compensation document indexed in the same vector space
- **Acceptance Criteria:**
  - `POST /ingest` accepts an `access_policy` field: `{"roles": ["hr", "finance"], "user_ids": [], "public": false}`
  - ChromaDB metadata includes `allowed_roles`, `allowed_users`, and `is_public` fields per chunk
  - Retrieval layer applies a pre-filter: only chunks the requesting user can access enter the candidate pool
  - Document permission updates propagate to all its chunks within 60 seconds
  - Attempting to query a document you cannot access returns no result (not a 403 — information about the document's existence is not leaked)

#### F2.2 — Access Audit Log
- **What:** Every document access (ingestion, retrieval hit, permission change) is written to a PostgreSQL `audit_log` table
- **Acceptance Criteria:**
  - Schema: `(event_id, timestamp, user_id, action, document_id, chunk_ids[], query_text_hash, ip_address)`
  - Query text stored as SHA-256 hash only (never plaintext) for privacy
  - Audit log is append-only (no UPDATE/DELETE permissions on the table for the app service account)
  - Admin can export audit log as CSV from the dashboard

#### F2.3 — Document Ownership & Lifecycle
- **What:** Every document has an `owner_user_id`. Owners can update permissions and mark documents as `archived`
- **Acceptance Criteria:**
  - Archived documents are excluded from retrieval but retained in storage
  - `curator` role can transfer ownership; `admin` can force-retire any document
  - `GET /documents/{doc_id}/metadata` returns owner, upload date, access policy, and last-accessed timestamp

---

### Feature Group 3 — Hybrid Search (Evolved from Existing)

The existing codebase already implements BM25 + ChromaDB + RRF. This feature group formalizes, hardens, and extends it for enterprise scale.

#### F3.1 — Permissioned Hybrid Retrieval
- **What:** The existing `HybridRetriever` (BM25 + RRF) is extended to accept a `user_context` parameter that pre-filters both BM25 candidates and ChromaDB results to the user's accessible corpus
- **Acceptance Criteria:**
  - `HybridRetriever.retrieve(query, user_context)` — returns only chunks from documents the user can access
  - BM25 index is partitioned or filtered by `access_scope` key
  - No access-control bypass possible via direct BM25 path

#### F3.2 — Configurable RRF Alpha Per Query
- **What:** `use_hybrid=true` with query-time `hybrid_alpha` override in the API request body
- **Acceptance Criteria:**
  - API accepts `hybrid_alpha` (0.0–1.0); defaults to `RAG_HYBRID_ALPHA` from config
  - Query analytics record the `hybrid_alpha` used per query

#### F3.3 — Multi-Collection Routing
- **What:** Queries routed to domain-specific ChromaDB collections (e.g., `hr_policies`, `engineering_docs`, `legal`) rather than a single global collection, reducing noise and improving precision
- **Acceptance Criteria:**
  - Documents tagged with a `collection` field at ingest time
  - Query API accepts an optional `collections: ["hr_policies"]` filter
  - Default behavior queries all collections the user has access to

---

### Feature Group 4 — Cross-Encoder Reranking (Evolved from Existing)

#### F4.1 — Reranking with Score Exposure
- **What:** The existing `CrossEncoderReranker` (`BAAI/bge-reranker-large`) is retained; reranking scores are now surfaced in the API response alongside citations
- **Acceptance Criteria:**
  - Each citation in the response includes `reranker_score` (0.0–1.0) in addition to the existing `score`
  - Reranking can be toggled per-request via `use_reranker: true/false`
  - Reranker model is configurable via `RAG_RERANKER_MODEL` (existing env var, unchanged)

#### F4.2 — Reranker Latency SLA
- **What:** Reranking adds latency; it must not exceed 800 ms P95 for `top_k_retrieval <= 20` candidates
- **Acceptance Criteria:**
  - OTel histogram `rag.rerank.latency` tracked separately from retrieval and generation
  - Alert threshold configurable; default 800 ms P95 triggers a log warning

---

### Feature Group 5 — Citations (Evolved from Existing)

#### F5.1 — Chunk-Level Citations with Source Navigation
- **What:** The existing citation system is extended to include page number (for PDFs), section heading, document title, and a direct permalink to the source document
- **Why:** "See doc.pdf" is not useful; "See Section 3.2, page 14 of HR Policy Manual 2026.pdf" is actionable
- **Acceptance Criteria:**
  - Citation object schema:
    ```json
    {
      "chunk_id": "abc123",
      "document_id": "doc_uuid",
      "document_title": "HR Policy Manual 2026",
      "filename": "hr_policy_2026.pdf",
      "page_number": 14,
      "section_heading": "3.2 Termination Procedures",
      "text_snippet": "...employees must give 30 days notice...",
      "reranker_score": 0.91,
      "retrieval_score": 0.84
    }
    ```
  - PDF loader extracts page metadata; Markdown loader extracts heading hierarchy
  - Citations ordered by `reranker_score` descending in the response

#### F5.2 — Inline Citation Markers
- **What:** The generated answer text includes inline markers (`[1]`, `[2]`) linking to citations at the end of the response
- **Acceptance Criteria:**
  - Generator prompt instructs the LLM to use `[N]` inline citation markers
  - Response includes both the `answer` text (with markers) and a `citations` array indexed by N
  - Markers are present only for claims directly supported by retrieved chunks

---

### Feature Group 6 — Confidence Scoring & Abstention

#### F6.1 — Query Confidence Score
- **What:** Every response includes a `confidence_score` (0.0–1.0) derived from a weighted combination of retrieval quality signals
- **Why:** Users need to know when to trust the answer and when to escalate to a human expert
- **Confidence Signal Components:**
  - `top_reranker_score` — quality of the best retrieved chunk (weight: 0.40)
  - `score_gap` — margin between #1 and #2 ranked chunk (high gap = high confidence) (weight: 0.20)
  - `faithfulness_proxy` — average cosine similarity between answer embedding and top-chunk embeddings (weight: 0.25)
  - `retrieval_coverage` — fraction of `top_k_final` slots filled vs. requested (weight: 0.15)
- **Acceptance Criteria:**
  - `confidence_score` in every API response
  - Three confidence tiers surfaced in the UI: `HIGH` (>= 0.75), `MEDIUM` (0.50–0.74), `LOW` (< 0.50)
  - Confidence tier stored in PostgreSQL `query_log` for trend analysis

#### F6.2 — Principled Abstention
- **What:** When confidence falls below a configurable threshold (`RAG_ABSTENTION_THRESHOLD`, default 0.40), the system returns a structured "I don't know" response rather than generating a low-quality answer
- **Why:** A confident wrong answer causes more damage than an honest "I don't have reliable information on this"
- **Acceptance Criteria:**
  - Abstention response:
    ```json
    {
      "answer": null,
      "abstained": true,
      "abstention_reason": "insufficient_retrieval_coverage",
      "confidence_score": 0.28,
      "suggestion": "Try rephrasing, or contact [knowledge-team@company.com]."
    }
    ```
  - `abstention_reason` enum: `insufficient_retrieval_coverage`, `low_reranker_scores`, `out_of_scope`, `access_restricted`
  - Abstention rate tracked in analytics dashboard
  - Curator-facing queue of abstained queries to identify knowledge gaps

#### F6.3 — Out-of-Scope Detection
- **What:** Queries that are clearly outside the indexed knowledge base (e.g., "write me a poem") return an `out_of_scope` abstention immediately without incurring LLM costs
- **Acceptance Criteria:**
  - Configurable list of topic-scope embeddings (`RAG_SCOPE_EMBEDDINGS_PATH`)
  - Cosine distance from query to scope centroid > threshold triggers `out_of_scope` abstention
  - Scope detection adds < 20 ms latency

---

### Feature Group 7 — Evaluation Dashboard (Evolved from Existing)

The existing codebase has CLI-based LLM-as-Judge evaluation. This evolves it into a live operational dashboard.

#### F7.1 — Real-Time Evaluation Metrics UI
- **What:** A web dashboard showing current and trending RAG quality metrics
- **Metrics Displayed:**
  - Faithfulness score (moving average, P5/P50/P95 over last 7 days)
  - Answer relevance score
  - Context precision @ k
  - Context recall
  - Abstention rate
  - Confidence score distribution histogram
- **Acceptance Criteria:**
  - Dashboard refreshes every 60 seconds
  - Metrics time-series stored in PostgreSQL `evaluation_results` table
  - Date range selector: 24h / 7d / 30d / custom
  - Export as CSV or JSON

#### F7.2 — Golden Dataset CI Gate (Evolved)
- **What:** The existing `evaluate.yml` GitHub Actions workflow is retained and extended:
  - Quality gate now checks all four RAGAS dimensions (not faithfulness only)
  - Gate thresholds configurable via `.github/eval_thresholds.yaml`
  - PR comment includes a quality comparison table: `main` baseline vs. PR branch
- **Acceptance Criteria:**
  - CI gate blocks merge if any dimension falls below threshold
  - Baseline stored as a JSON artifact per release tag
  - Alert on >10% regression vs. baseline on any dimension

#### F7.3 — Failure Analysis Queue
- **What:** Queries that scored below `faithfulness_threshold` or that resulted in abstention are surfaced in a "Review Queue" in the admin dashboard
- **Acceptance Criteria:**
  - Queue shows: query, answer, citations used, confidence score, fail reason
  - Curator can mark a queue item as "acknowledged" or "needs new document"
  - Queue items link to the Langfuse trace for full span-level debugging

---

### Feature Group 8 — Query Analytics

#### F8.1 — Per-Query Logging
- **What:** Every query is logged to PostgreSQL with full context (no PII stored beyond user_id and hashed query)
- **Schema (`query_log` table):**
  ```sql
  query_id         UUID PRIMARY KEY,
  timestamp        TIMESTAMPTZ NOT NULL,
  user_id          UUID NOT NULL,
  query_hash       CHAR(64) NOT NULL,
  query_text       TEXT,
  collections      TEXT[],
  hybrid_alpha     FLOAT,
  use_reranker     BOOLEAN,
  top_k_final      INTEGER,
  confidence_score FLOAT,
  abstained        BOOLEAN,
  abstention_reason VARCHAR(64),
  latency_ms       INTEGER,
  tokens_used      INTEGER,
  cost_usd         FLOAT,
  llm_provider     VARCHAR(32),
  llm_model        VARCHAR(64),
  faithfulness     FLOAT,
  answer_relevance FLOAT
  ```
- **Acceptance Criteria:**
  - Insert latency < 5 ms (async, non-blocking)
  - `query_text` stored in plaintext only when `RAG_LOG_QUERY_TEXT=true` (off by default)

#### F8.2 — Analytics Dashboard
- **What:** A dedicated "Analytics" tab in the admin UI with:
  - Query volume over time (hourly/daily/weekly)
  - Top questions by frequency (cluster similar queries)
  - Latency breakdown: retrieval / reranking / generation (P50/P95)
  - Cost per query (USD) trend
  - Cache hit rate (Redis)
  - Abstention rate trend
  - User activity heatmap (queries per user per day)
- **Acceptance Criteria:**
  - All charts rendered from PostgreSQL aggregation queries, not pre-computed
  - Filters: date range, user, collection, LLM model

#### F8.3 — Top Unanswered Questions Report
- **What:** Weekly automated report identifying the top 20 most-asked questions that resulted in abstention or low confidence — surfaced to Knowledge Curators as a knowledge gap report
- **Acceptance Criteria:**
  - Report generated via a scheduled job (cron via Celery Beat or GitHub Actions schedule)
  - Delivered as an in-app notification and optionally via email webhook
  - Report clusters semantically similar abstained queries

---

### Feature Group 9 — Redis Caching

#### F9.1 — Query Result Cache
- **What:** Full query results (answer + citations + confidence) cached in Redis by a cache key derived from `(query_embedding_hash, user_access_scope_hash, config_hash)`
- **Why:** The existing codebase has an in-process LRU cache for embeddings only. Redis enables cache sharing across replicas and caches the full expensive pipeline
- **Acceptance Criteria:**
  - Cache key includes user access scope hash so a `viewer` never gets a `admin`-scope cached result
  - Default TTL: 1 hour (configurable `RAG_CACHE_TTL_SECONDS`)
  - Cache invalidation on document ingestion: all cache keys for affected collections are purged
  - Cache hit/miss rate exposed in `/metrics` and analytics dashboard
  - Redis connection failure degrades gracefully — falls back to uncached execution with a log warning

#### F9.2 — Embedding Cache (Evolved)
- **What:** The existing in-process LRU embedding cache is replaced by a Redis-backed cache shared across replicas
- **Acceptance Criteria:**
  - `RAG_EMBEDDING_CACHE_BACKEND=redis` switches from in-process LRU to Redis
  - Backward-compatible: `RAG_EMBEDDING_CACHE_BACKEND=lru` retains existing behavior
  - Cache key: `sha256(model_name + query_text)`

#### F9.3 — Session Context Cache
- **What:** Multi-turn conversation context (last N query-answer pairs) cached per user session in Redis
- **Acceptance Criteria:**
  - Session TTL: 30 minutes of inactivity (configurable)
  - Conversation history included in generation prompt when `session_id` is provided
  - Session context never bleeds across users

---

### Feature Group 10 — PostgreSQL Persistence Layer

#### F10.1 — PostgreSQL as Primary Metadata Store
- **What:** Replace all JSON file-based persistence with PostgreSQL. ChromaDB remains as the vector store.
- **Tables:**
  - `users` — id, email, password_hash, role, department, created_at, last_login
  - `documents` — id, title, filename, collection, owner_id, access_policy (JSONB), upload_at, archived_at, chunk_count
  - `chunks` — id, document_id, text, page_number, section_heading, embedding_id (chromadb ref)
  - `query_log` — (see F8.1)
  - `audit_log` — (see F2.2)
  - `evaluation_results` — query_id, faithfulness, answer_relevance, context_precision, context_recall, evaluated_at
  - `ingestion_jobs` — job_id, status, document_count, error_message, started_at, completed_at
  - `abstention_queue` — id, query_id, reviewed, reviewer_id, note
- **Acceptance Criteria:**
  - Alembic migrations for all schema changes
  - Read-only service account for analytics queries
  - Connection pooling via `asyncpg` + SQLAlchemy async engine
  - Automated daily backup with 30-day retention

#### F10.2 — Async Ingestion Jobs (Evolved)
- **What:** The existing async ingestion is evolved to use PostgreSQL `ingestion_jobs` table as durable state, replacing the in-memory job dict
- **Why:** In-memory job state is lost on restart; a durable store enables resume and cross-replica status polling
- **Acceptance Criteria:**
  - Job status (`pending`, `running`, `completed`, `failed`) persisted in PostgreSQL
  - `GET /ingest/jobs/{job_id}` reads from PostgreSQL — works across replicas
  - Job records retained for 30 days

---

### Feature Group 11 — Docker & Infrastructure

#### F11.1 — Multi-Service Docker Compose
- **What:** Extend the existing single-service `docker-compose.yml` to orchestrate all EKA services
- **Services:**
  ```
  api       FastAPI — existing, extended
  chromadb  Vector store — existing
  postgres  Primary metadata store — NEW
  redis     Cache layer — NEW
  worker    Celery async worker — NEW
  beat      Celery Beat scheduler — NEW
  nginx     Reverse proxy + TLS termination — NEW
  ```
- **Acceptance Criteria:**
  - `docker-compose up` starts all services with one command
  - Health checks defined for all services
  - Postgres and Redis data in named volumes (survives restart)
  - Non-root users in all containers

#### F11.2 — Production Docker Compose
- **What:** A `docker-compose.prod.yml` with hardened settings
- **Includes:**
  - `restart: always` on all services
  - Resource limits (CPU/memory) per service
  - Nginx with configurable TLS cert paths
  - PostgreSQL with `max_connections` and `shared_buffers` tuned
  - Redis with `maxmemory` and `maxmemory-policy allkeys-lru`

#### F11.3 — Environment Tiers
- **What:** Explicit `APP_ENV` enum: `development`, `staging`, `production`
- **Acceptance Criteria:**
  - `development`: No auth required, SQLite optional, verbose logging
  - `staging`: Full auth, PostgreSQL, Redis, reduced logging
  - `production`: Full auth, read-only BM25 index, rate limiting, audit logging mandatory

---

### Feature Group 12 — CI/CD (Evolved from Existing)

#### F12.1 — Extended CI Pipeline
- **Workflow:** `.github/workflows/ci.yml`
- **Stages:**
  1. `lint` — ruff + mypy (existing)
  2. `test-unit` — pytest unit tests, coverage >= 85% gate
  3. `test-integration` — pytest against live Postgres + Redis via service containers
  4. `security-scan` — `pip-audit` CVEs + `bandit` code-level security issues
  5. `evaluate` — LLM-as-Judge quality gate (extended per F7.2)
- **Acceptance Criteria:**
  - Stages run in parallel where possible
  - Security scan blocks merge on CRITICAL or HIGH CVEs

#### F12.2 — Docker Build & Publish (Evolved)
- **Workflow:** `.github/workflows/docker-publish.yml`
- **Extended to:**
  - Build and push both `api` and `worker` images to GHCR
  - Tag strategy: `latest` on `main` push, `v{semver}` on release tag
  - `docker scout` vulnerability scan on pushed images
  - SBOM attached to each published image

#### F12.3 — Deployment Pipeline
- **Workflow:** `.github/workflows/deploy.yml` (NEW)
- **Stages:**
  1. Build images
  2. Deploy to staging via SSH + `docker-compose pull && up -d`
  3. Smoke tests against staging (`/healthz`, `/readyz`, one golden query)
  4. Manual approval gate (GitHub Environment protection rule)
  5. Deploy to production
- **Acceptance Criteria:**
  - Zero-downtime rolling update via Nginx upstream swap
  - Automatic rollback if smoke tests fail on staging

---

## 5. Non-Goals — What We Are NOT Building

This section is as important as the feature list. Being explicit about exclusions prevents scope creep.

| What We Are NOT Building | Why / Alternative |
|---|---|
| **A general-purpose chatbot** | EKA is grounded strictly in indexed organizational documents. It does not answer general knowledge questions, write code, or act as a creative assistant. |
| **A document editor or CMS** | EKA indexes documents; it does not create or edit them. Confluence/SharePoint remain the editors. |
| **A source connector for live data** | v1 indexes static uploaded documents. Live sync from SharePoint/Google Drive/Slack is a future milestone. |
| **Multi-modal answers (images, charts)** | v1 is text-in, text-out. The answer is always text. |
| **Fine-tuning or training LLMs** | EKA uses commercial LLM APIs via RAG. No model training in v1. |
| **A customer-facing chatbot** | EKA is an internal enterprise tool. It does not answer general knowledge questions or serve end-customers. |
| **Natural language to SQL** | EKA retrieves from unstructured document corpora only. Structured data querying is a separate product surface. |
| **Real-time voice interface** | v1 is API + web UI only. STT/TTS integration is not in scope. |
| **LLM fine-tuning pipelines or model hosting** | No CUDA workloads, no model training. Reranker models loaded locally via `sentence-transformers` only. |
| **HIPAA / SOC 2 certification** | The system is designed with security in mind, but formal compliance certification is a post-v1 milestone. |
| **A recommendation engine** | EKA answers explicit questions; it does not proactively surface content the user did not ask for. |
| **GraphQL API** | v1 exposes REST only. GraphQL deferred to future API version. |
| **Slack / Teams chatbot interface** | Web UI and REST API are v1 surfaces. Bot integrations planned as v2 connectors. |
| **Unlimited corpus per tenant at launch** | v1 enforces a hard cap of **100 documents per tenant**. Storage and vector index scaling beyond this cap is explicitly deferred. A soft warning fires at 80 docs; ingestion returns `HTTP 429` at the limit. |
| **Tenant self-service signup** | Tenants are provisioned by a system admin only. No self-service registration portal in v1. |
| **Cross-tenant federated search** | Each tenant is a completely isolated silo. Answers never draw from another tenant's corpus, even with admin privileges. |

> [!NOTE]
> Multi-tenancy **is** in scope for v1 (OQ-7 closed). The non-goals above clarify what aspects of multi-tenancy are **not** in scope — unlimited scale, self-signup, and cross-tenant queries.

---

## 6. System Architecture Overview

> [!IMPORTANT]
> **Multi-tenancy is a v1 requirement (OQ-7 closed).** `tenant_id` is a first-class dimension at every layer — JWT claims, middleware, PostgreSQL row isolation, ChromaDB collection naming, and Redis key namespacing. No cross-tenant data bleed is architecturally possible.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│   Web UI (Next.js, tenant-scoped subdomain or path prefix)          │
│   REST API Clients  (X-Tenant-ID header or JWT claim)               │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │    Nginx    │  TLS termination, per-tenant rate limiting
                    └──────┬──────┘
                           │
          ┌────────────────▼─────────────────────────┐
          │              FastAPI (EKA API)             │
          │  Auth Middleware (JWT/OIDC)                │
          │  Tenant Resolution Middleware ◄── NEW      │
          │    (extracts tenant_id from JWT claim      │
          │     or X-Tenant-ID header; validates       │
          │     tenant is active in PostgreSQL)        │
          │  RBAC Middleware  (role scoped to tenant)  │
          │  X-Request-ID Correlation                  │
          │  Per-Tenant Rate Limiting                  │
          └────────┬────────────────┬─────────────────┘
                   │                │
      ┌────────────▼──┐    ┌────────▼────────────────────────────┐
      │  Auth Service  │    │   RAG Pipeline (tenant-scoped)      │
      │  (JWT issue,   │    │  ┌────────────────────────────────┐ │
      │   OIDC bridge, │    │  │ Tenant Context Injector        │ │
      │   tenant claim)│    │  │ Access Filter (ACL + tenant_id)│ │
      └────────────────┘    │  │ Hybrid Search                  │ │
                            │  │ Reranker                       │ │
      ┌─────────────────┐   │  │ Generator                      │ │
      │   Redis Cache   │◄──┤  │ Citations                      │ │
      │  Namespaced by  │   │  │ Confidence + Abstention        │ │
      │  tenant_id:     │   │  └────────────────────────────────┘ │
      │  ek:{tid}:*     │   └─────────────────────────────────────┘
      └─────────────────┘
                                       │
             ┌─────────────────────────▼──────────────────────────┐
             │                 Storage Layer                        │
             │  ChromaDB Collections: ek_{tenant_id}_{collection}  │
             │    (100-doc cap enforced at ingest; all chunks       │
             │     carry tenant_id + ACL metadata)                  │
             │                                                      │
             │  PostgreSQL (all tables have tenant_id column,       │
             │    Row-Level Security policies enforce isolation)     │
             │    tenants, users, documents, chunks,                │
             │    query_log, audit_log, evaluation_results,         │
             │    ingestion_jobs, abstention_queue                  │
             └────────────────────────────────────────────────────┘
                                       │
             ┌─────────────────────────▼──────────────────────────┐
             │               Async Worker Layer                    │
             │  Celery Worker: ingestion jobs, eval scoring        │
             │    (task payload includes tenant_id; worker never   │
             │     processes cross-tenant batches)                 │
             │  Celery Beat: weekly abstention report, cleanup     │
             └────────────────────────────────────────────────────┘
                                       │
             ┌─────────────────────────▼──────────────────────────┐
             │               Observability Stack                   │
             │  OTel spans tagged with tenant_id attribute         │
             │  Langfuse traces namespaced per tenant              │
             │  PostgreSQL query_log filtered by tenant_id         │
             └────────────────────────────────────────────────────┘
```

---

## 7. Technical Stack

| Layer | Technology | Rationale |
|---|---|---|
| **API Framework** | FastAPI (Python 3.11+) | Existing; async-native, strong typing, OpenAPI auto-docs |
| **Vector Store** | ChromaDB (embedded / standalone) | Existing; per-collection partitioning maps to ACL scopes |
| **Sparse Retrieval** | rank-bm25 | Existing; lightweight, no external service dependency |
| **Reranker** | `sentence-transformers` (`BAAI/bge-reranker-large`) | Existing; state-of-the-art cross-encoder, configurable |
| **LLM Providers** | OpenAI (GPT-4o / GPT-4o-mini) + Anthropic (Claude 3.5) | Existing; dual-provider, runtime-switchable |
| **Primary DB** | PostgreSQL 15+ | ACID compliance, JSONB for access policies |
| **Cache** | Redis 7+ | Shared cache across replicas, pub/sub for invalidation |
| **Async Tasks** | Celery + Redis broker | Ingestion jobs, evaluation workers, scheduled reports |
| **Auth** | `python-jose` (JWT) + `passlib` (bcrypt) | Lightweight, no external auth service dependency in v1 |
| **ORM** | SQLAlchemy 2.0 (async) + asyncpg | Async queries, type-safe models, Alembic migrations |
| **Observability** | OpenTelemetry + Langfuse | Existing; circuit-breaker already implemented |
| **Containerization** | Docker + Docker Compose | Existing multi-stage Dockerfile; extended for multi-service |
| **CI/CD** | GitHub Actions | Existing 3 workflows; extended to 4 |
| **Web UI** | Next.js 14 (App Router) + Tailwind CSS | Server components for analytics, SSR auth sessions |
| **Reverse Proxy** | Nginx | TLS termination, rate limiting, upstream management |
| **Migrations** | Alembic | Version-controlled schema migrations |

---

## 8. Success Criteria & KPIs

### Launch Criteria (Must-Have Before v1 Release)

| Criterion | Target | Measurement |
|---|---|---|
| **Answer Faithfulness** | >= 0.80 on golden dataset | CI `evaluate.yml` quality gate |
| **Answer Relevance** | >= 0.75 on golden dataset | CI `evaluate.yml` quality gate |
| **End-to-End Latency (P95)** | < 3 seconds (hybrid + reranker enabled) | OTel `rag.query.latency` histogram |
| **Ingestion Throughput** | >= 100 PDF pages/minute | Load test in CI integration suite |
| **Cache Hit Rate** | >= 30% after 24h warmup | Redis `keyspace_hits` metric |
| **Uptime (staging)** | 99.5% over 2-week pre-launch soak | `/healthz` synthetic monitor |
| **Test Coverage** | >= 85% line coverage | `pytest --cov` in CI |
| **Zero Critical CVEs** | 0 CRITICAL/HIGH findings | `pip-audit` + `docker scout` in CI |
| **Auth bypass** | 0 unauthenticated accesses to `/query` or `/ingest` | Penetration test |
| **ACL correctness** | User A cannot retrieve chunks from documents they cannot access | Integration test suite |

### Business KPIs (Post-Launch, 90 Days)

| KPI | Target |
|---|---|
| **Daily Active Queriers** | >= 50 (pilot team) |
| **Queries per User per Day** | >= 3 |
| **User-Reported Answer Helpfulness** | >= 4.0 / 5.0 (thumbs rating) |
| **Abstention Rate** | < 15% (indicates corpus coverage) |
| **Knowledge Gap Items Resolved** | >= 10 new documents added from abstention queue |
| **Documents Indexed** | >= 500 |
| **Mean Time to Answer** | < 30 seconds (vs. baseline survey in minutes) |

### Quality Regression Guard

- No regression > **5%** on any RAGAS dimension vs. prior release baseline
- Monitored automatically by `evaluate.yml` on every PR to `main`

---

## 9. Milestones & Phased Roadmap

### Phase 0 — Foundation (Weeks 1–2)
> _Infrastructure prerequisites. No user-visible features._

- [ ] PostgreSQL service added to `docker-compose.yml`
- [ ] Redis service added to `docker-compose.yml`
- [ ] Alembic initialized; baseline schema migrations written and tested
- [ ] SQLAlchemy async engine + connection pool wired into FastAPI lifespan
- [ ] Redis client initialized with graceful-degradation on connection failure
- [ ] `APP_ENV` environment tier system implemented
- [ ] Celery worker + Beat added to Docker Compose

### Phase 1 — Authentication & RBAC (Weeks 3–4)
> _Depends on Phase 0._

- [ ] `POST /auth/login` + `POST /auth/refresh` JWT endpoints
- [ ] JWT middleware on all routes
- [ ] `users` + `user_roles` tables with Alembic migration
- [ ] RBAC enforcement middleware (viewer / curator / admin)
- [ ] OIDC federation configuration (optional, off by default)
- [ ] Auth integration tests (happy path + rejection scenarios)

### Phase 2 — Document-Level ACL (Weeks 5–6)
> _Depends on Phase 1._

- [ ] `access_policy` field on `/ingest` endpoint
- [ ] ChromaDB chunk metadata extended with ACL fields
- [ ] `HybridRetriever` extended with `user_context` pre-filter
- [ ] `audit_log` table + async insert on every retrieval hit
- [ ] Document lifecycle endpoints (GET, PATCH permissions, DELETE/archive)
- [ ] ACL integration tests (cross-user access isolation)

### Phase 3 — Confidence Scoring & Abstention (Weeks 7–8)
> _Depends on Phase 2._

- [ ] `confidence_score` computation module
- [ ] `RAG_ABSTENTION_THRESHOLD` config + abstention response path
- [ ] Out-of-scope detection module
- [ ] `abstention_queue` table + curator review endpoints
- [ ] `query_log` async insert on every query
- [ ] Abstention unit tests + integration tests

### Phase 4 — Redis Caching (Weeks 9–10)
> _Depends on Phase 2 (cache key includes access scope hash)._

- [ ] Full query result cache in Redis
- [ ] Redis-backed embedding cache (replacing in-process LRU)
- [ ] Cache invalidation on document ingestion
- [ ] Session context cache for multi-turn
- [ ] Cache hit/miss metrics in `/metrics` and OTel

### Phase 5 — Analytics & Evaluation Dashboard (Weeks 11–13)
> _Depends on Phases 3 + 4._

- [ ] Next.js admin UI scaffolded, routes protected by JWT
- [ ] Analytics dashboard (query volume, latency, cost, cache hit rate)
- [ ] Evaluation dashboard (RAGAS metrics time-series, confidence distribution)
- [ ] Failure analysis / abstention review queue UI
- [ ] Weekly abstention report Celery Beat job
- [ ] CI `evaluate.yml` extended with all four RAGAS dimensions + comparison table

### Phase 6 — CI/CD Hardening & Production Readiness (Weeks 14–15)
> _Final hardening before pilot launch._

- [ ] `deploy.yml` workflow with staging deploy + smoke tests + manual prod gate
- [ ] `docker-compose.prod.yml` with resource limits and hardened config
- [ ] `bandit` + `docker scout` added to CI
- [ ] SBOM generation on Docker image publish
- [ ] Load test: 50 concurrent users, P95 latency vs. SLA
- [ ] Penetration test: auth bypass, ACL bypass, injection
- [ ] Documentation: deployment guide, API reference, admin runbook

### Phase 7 — Pilot Launch (Week 16)
> _Onboard pilot team (10–20 users), monitor KPIs for 30 days._

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Tenant data bleed via ChromaDB query** | Low | Critical | All ChromaDB queries include `where: {"tenant_id": "{tid}"}` metadata filter; enforced in middleware, not caller code; integration test asserts cross-tenant query returns empty result |
| **Tenant data bleed via Redis cache** | Low | Critical | Redis keys namespaced `ek:{tenant_id}:{hash}`; HMAC of `(tenant_id, user_id, scope)` in cache key; cross-tenant cache hit is architecturally impossible |
| **Tenant data bleed via PostgreSQL** | Low | Critical | Row-Level Security (RLS) enabled on all tenant-scoped tables; app service account uses `SET app.current_tenant_id` before every query; verified by integration test suite |
| **100-doc cap circumvented via race condition** | Low | Medium | Ingest endpoint uses `SELECT COUNT ... FOR UPDATE` inside a transaction before inserting; concurrent ingestion requests are serialized per tenant |
| **ChromaDB ACL + tenant filter performance at 100 docs** | Low | Low | At 100 docs × ~50 chunks/doc = 5,000 vectors per tenant, ChromaDB embedded mode handles this trivially. Benchmark will confirm; no scaling work expected in v1. |
| **Redis cache key collision across users** | Low | Critical | Cache key includes HMAC of `(tenant_id, user_id, access_scope_hash)`; tested with cross-tenant and cross-user scenarios in CI |
| **LLM API outage blocks all query responses** | Medium | High | Circuit breaker on LLM calls (pattern already exists for Langfuse); surfaced as `503` with retry-after header |
| **Confidence scoring signals high confidence on a wrong answer** | Medium | High | Confidence is a retrieval-quality signal, not factual accuracy guarantee; UI copy clarifies this; faithfulness CI gate is the accuracy backstop |
| **PostgreSQL migration fails on rolling deploy** | Low | High | Alembic migrations must be backward-compatible (additive only in v1); old API version must tolerate new schema columns |
| **Celery worker processes wrong tenant's job** | Low | Critical | Task payload always includes `tenant_id`; worker sets `SET app.current_tenant_id` before DB access; no global state shared across tenant tasks |
| **OIDC misconfiguration locks out admins** | Low | Critical | Local auth always available as fallback; break-glass admin account seeded per tenant at provisioning |
| **Abstention threshold miscalibrated — too aggressive** | High | Medium | `RAG_ABSTENTION_THRESHOLD` tunable at runtime per tenant; default 0.40 calibrated against golden dataset; abstention rate KPI monitored |

---

## 11. Open Questions

| # | Question | Status | Owner | Decision |
|---|---|---|---|---|
| OQ-1 | Should the web UI be Next.js (SSR) or a pure SPA (Vite/React)? | Open | Engineering Lead | Decide by Phase 5 start |
| OQ-2 | What is the target deployment platform? Docker Compose on VM or Kubernetes? | Open | Platform Engineering | Decide by Phase 6 start |
| OQ-3 | Use `gpt-4o-mini` as eval judge or switch to self-hosted Llama 3? | Open | ML Lead | Decide by Phase 5 start |
| OQ-4 | Does OIDC need Azure AD group-to-role mapping in v1, or is manual role assignment acceptable for pilot? | Open | IT / Product | Decide by Phase 1 start |
| OQ-5 | Should `query_text` be stored in plaintext in `query_log`, or is hash-only a hard compliance requirement? | Open | Compliance / Legal | Decide by Phase 3 start |
| OQ-6 | Max corpus size at v1 launch? | **CLOSED** ✅ | Product | **100 documents per tenant.** ChromaDB embedded mode is sufficient; no distributed vector DB needed. Hard cap enforced at ingest. |
| OQ-7 | Is multi-tenancy a v1 requirement? | **CLOSED** ✅ | Product | **Yes — required.** `tenant_id` is a first-class key across all layers. See Feature Group 13. |

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| **RAG** | Retrieval-Augmented Generation — combining document retrieval with LLM text generation |
| **Hybrid Search** | Combining BM25 (keyword) and dense vector (semantic) retrieval, fused via RRF |
| **RRF** | Reciprocal Rank Fusion — a rank combination formula merging multiple ranked lists without score normalization |
| **Reranking** | A second-pass relevance model (cross-encoder) reordering retrieved candidates before generation |
| **Abstention** | The system's deliberate refusal to answer when retrieval confidence is below threshold |
| **Faithfulness** | RAGAS metric: fraction of claims in the generated answer supported by retrieved context |
| **ACL** | Access Control List — a policy defining which users or roles can access a resource |
| **RBAC** | Role-Based Access Control — permissions assigned by role, not individual user |
| **JWT** | JSON Web Token — a signed, compact token encoding user identity and claims |
| **OIDC** | OpenID Connect — an authentication layer on top of OAuth2 for federated identity |
| **Golden Dataset** | A curated set of question-answer pairs with known correct answers, used for automated evaluation |
| **Confidence Score** | A system-computed signal (0.0–1.0) representing the estimated reliability of a given answer |
| **BM25** | Best Match 25 — a probabilistic keyword retrieval algorithm; industry standard for sparse retrieval |
| **OTLP** | OpenTelemetry Protocol — a vendor-neutral observability data transfer format |
| **SBOM** | Software Bill of Materials — an inventory of all software components in a build artifact |

---

## Appendix B — Key Configuration Variables (Extended)

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | Environment tier: `development`, `staging`, `production` |
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `JWT_SECRET_KEY` | *(required)* | HS256 signing secret for JWT tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRY_MINUTES` | `60` | Access token expiry |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` | Refresh token expiry |
| `OIDC_PROVIDER_URL` | *(unset)* | OIDC discovery URL; enables federation when set |
| `RAG_ABSTENTION_THRESHOLD` | `0.40` | Confidence below which the system abstains |
| `RAG_CACHE_TTL_SECONDS` | `3600` | Redis query result cache TTL |
| `RAG_EMBEDDING_CACHE_BACKEND` | `lru` | `lru` (existing in-process) or `redis` |
| `RAG_LOG_QUERY_TEXT` | `false` | Store query plaintext in `query_log` (off by default) |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` | Celery task broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` | Celery result backend |
| `EKA_MAX_DOCS_PER_TENANT` | `100` | Hard document cap per tenant; ingest returns HTTP 429 when reached |
| `EKA_DOC_CAP_WARN_THRESHOLD` | `80` | Soft warning logged + surfaced in admin UI when tenant reaches this count |
| `EKA_REDIS_KEY_PREFIX` | `ek` | Prefix for all Redis keys; namespaced as `{prefix}:{tenant_id}:*` |
| `EKA_CHROMA_COLLECTION_PREFIX` | `ek` | Prefix for ChromaDB collection names: `{prefix}_{tenant_id}_{collection}` |

---

## Appendix C — Multi-Tenancy Design (Feature Group 13)

This appendix fully specifies Feature Group 13 — the architectural layer added as a result of closing OQ-7.

### F13.1 — Tenant Model & Provisioning

- **What:** A `tenant` is a single isolated organization on the EKA deployment. Each tenant has its own corpus, users, documents, analytics, and evaluation data. No data crosses tenant boundaries under any circumstance.
- **Provisioning:** Tenants are created only by a system-level `superadmin` role (not a per-tenant admin). Self-service signup is explicitly out of scope for v1.
- **Acceptance Criteria:**
  - `POST /admin/tenants` (superadmin only) creates a tenant record, seeds a `tenant_admin` user, and initializes the tenant's ChromaDB collection namespace
  - `GET /admin/tenants` returns all tenants with doc count, user count, last-active timestamp
  - `PATCH /admin/tenants/{tid}/suspend` prevents all queries and ingestion for that tenant (returns 403 with `tenant_suspended` error code)
  - Tenant provisioning is idempotent — re-running it for the same `tenant_slug` is a no-op

**`tenants` table schema:**
```sql
tenant_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
slug          VARCHAR(64) UNIQUE NOT NULL,   -- URL-safe identifier, e.g. "acme-corp"
name          TEXT NOT NULL,
status        VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | suspended | deleted
doc_cap       INTEGER NOT NULL DEFAULT 100,
created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
suspended_at  TIMESTAMPTZ,
config        JSONB DEFAULT '{}'
```

### F13.2 — Tenant Isolation at Every Layer

#### PostgreSQL — Row-Level Security (RLS)

All tenant-scoped tables carry a `tenant_id UUID NOT NULL` column. PostgreSQL Row-Level Security policies enforce isolation at the database engine level — the application layer cannot accidentally query across tenants.

```sql
-- Applied to every tenant-scoped table (documents, users, query_log, audit_log, etc.):
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

The FastAPI request lifecycle sets `SET LOCAL app.current_tenant_id = '{tid}'` at the start of every DB transaction. This cannot be overridden by application code.

#### ChromaDB — Collection Namespacing

ChromaDB collections are named `ek_{tenant_id}_{collection_name}` (e.g., `ek_abc123_hr_policies`). A query against collection `ek_abc123_hr_policies` cannot return vectors from `ek_xyz789_hr_policies` — these are entirely separate ChromaDB collections.

- At 100 docs × ~50 chunks/doc = **≤ 5,000 vectors per tenant** — well within ChromaDB embedded mode capacity.
- ChromaDB standalone mode (already in `docker-compose.yml`) handles multiple collections efficiently at this scale.

#### Redis — Key Namespacing

All Redis keys are namespaced as `ek:{tenant_id}:{key_type}:{hash}` (e.g., `ek:abc123:result:sha256...`). Cache invalidation on ingest purges only `ek:{tenant_id}:*` keys, never touching other tenants' caches.

#### Celery — Task-Level Isolation

Every Celery task payload includes `tenant_id`. The worker sets `SET app.current_tenant_id` before any database access. Cross-tenant task batching is prohibited by design.

### F13.3 — Tenant-Scoped RBAC

Roles (`viewer`, `curator`, `admin`) are **scoped to a tenant**. A user can hold different roles in different tenants. A tenant `admin` cannot access another tenant's data or admin panel.

- JWT claim structure: `{ "sub": "user_uuid", "tenant_id": "abc123", "roles": ["admin"] }`
- A user may belong to multiple tenants; each session JWT is issued for a single tenant
- `POST /auth/switch-tenant` issues a new JWT for a different tenant the user belongs to

**`user_tenant_roles` table:**
```sql
user_id    UUID REFERENCES users(user_id),
tenant_id  UUID REFERENCES tenants(tenant_id),
role       VARCHAR(16) NOT NULL,   -- viewer | curator | admin
granted_by UUID REFERENCES users(user_id),
granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
PRIMARY KEY (user_id, tenant_id)
```

### F13.4 — Corpus Cap Enforcement

With the 100-document-per-tenant cap (OQ-6), the following enforcement rules apply:

| Threshold | Behavior |
|---|---|
| **< 80 docs** | Normal ingestion |
| **80–99 docs** | Warning header `X-EKA-Corpus-Warning: approaching-limit` in ingest response; surfaced as amber badge in admin UI |
| **100 docs (cap reached)** | `POST /ingest` returns `HTTP 429 Too Many Requests` with body `{"error": "corpus_cap_reached", "limit": 100, "current": 100, "upgrade": "contact admin"}` |
| **Archived doc** | Does not count toward the cap (excluded from retrieval but retained in storage) |

Cap is enforced inside a serialized transaction (`SELECT COUNT(*) FROM documents WHERE tenant_id = $1 AND archived_at IS NULL FOR UPDATE`) to prevent race conditions from concurrent ingestion requests.

### F13.5 — Superadmin Panel

A system-level `superadmin` (set via `EKA_SUPERADMIN_EMAIL` env var at first boot) can:
- Create / suspend / delete tenants
- Override the doc cap for a specific tenant (`tenants.doc_cap` column)
- View cross-tenant aggregate metrics (total query volume, total users, total documents) — never individual query content
- Access is restricted to a dedicated `/superadmin/*` route prefix, protected by a separate JWT audience claim (`aud: superadmin`)

### F13.6 — Tenant Onboarding Checklist

When a new tenant is provisioned, the system automatically:

1. Creates the `tenants` record
2. Seeds a `tenant_admin` user account (password emailed or set via CLI flag)
3. Creates ChromaDB collection namespace `ek_{tenant_id}_default`
4. Initializes per-tenant Redis namespace (no action required — namespacing is key-based)
5. Applies PostgreSQL RLS policies (applied at migration time, not per-tenant)
6. Writes an entry to the `audit_log` with `action = 'tenant_provisioned'`

---

*End of Enterprise Knowledge Assistant PRD v1.1*
