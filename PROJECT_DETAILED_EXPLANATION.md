# Enterprise Knowledge Assistant (EKA) — Project Detailed Explanation

---

## Executive Summary & Vision

The **Enterprise Knowledge Assistant (EKA)** is a production-grade, multi-tenant enterprise question-answering and search system built on Retrieval-Augmented Generation (RAG). It transforms fragmented institutional knowledge into an accurate, secure, verifiable knowledge engine.

### Key Capabilities Built So Far:
1. **Multi-Tenancy & Hard Isolation**: Complete organization-level data separation across storage, cache, and retrieval layers.
2. **Enterprise Authentication & RBAC**: JWT access/refresh token lifecycle with 4 distinct roles (`viewer`, `curator`, `admin`, `superadmin`).
3. **Document-Level Access Control (ACL)**: Fine-grained permissions allowing documents to be public to a tenant, restricted to specific departments/roles (e.g., `finance`, `legal`), or granted to specific user IDs.
4. **Silent Non-Leakage Guarantee**: Unauthorized queries prune context before LLM generation, returning a neutral "information not found" answer with zero citations instead of HTTP 403, preventing metadata leakage.
5. **Tenant Document Quotas**: Strict enforcement of a 100-document active corpus limit per tenant to guarantee performance, budget predictability, and storage boundaries.
6. **Privacy-Preserving Audit Logging**: Immutable, append-only logs for all ingestion, query, and lifecycle events. User query text is strictly stored as SHA-256 cryptographic hashes (`query_hash`), ensuring zero plaintext query retention.
7. **Free LLM Backends**: Seamless integration with **Groq Cloud** (ultra-fast free inference at 500+ tok/s) and **Ollama** (100% offline private local inference) without paid API keys.

---

## Architectural Overview

```
                          ┌────────────────────────┐
                          │   HTTP Client / SDK    │
                          └───────────┬────────────┘
                                      │ (Bearer JWT / Tenant Slug)
                                      ▼
                        ┌────────────────────────────┐
                        │ Fast API Application Core   │
                        │ ────────────────────────── │
                        │ • TenantResolutionMiddleware│
                        │ • Rate Limiting (SlowAPI)  │
                        │ • RBAC Guard Dependencies  │
                        └─────────────┬──────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ Auth & Users  │             │   Documents   │             │ Query Engine  │
│ ───────────── │             │ ───────────── │             │ ───────────── │
│ • Login/Token │             │ • Ingest & ACL│             │ • UserContext │
│ • Superadmin  │             │ • 100-Doc Cap │             │ • Hybrid (BM25│
│ • Roles/Tenant│             │ • Soft Archive│             │   + ChromaDB) │
└───────┬───────┘             └───────┬───────┘             └───────┬───────┘
        │                             │                             │
        │                             │ (Flush metadata & Audit)    │ (Prune unauthorized)
        ▼                             ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                             Storage Layer                                 │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │     PostgreSQL 16     │  │    Redis 7.2     │  │   ChromaDB 0.4+    │  │
│  │ ───────────────────── │  │ ──────────────── │  │ ────────────────── │  │
│  │ • tenants             │  │ • Token blacklist│  │ • Multi-lang vector│  │
│  │ • users               │  │ • Tenant cache   │  │   collections      │  │
│  │ • user_tenant_roles   │  │ • Celery broker  │  │ • ACL metadata     │  │
│  │ • documents           │  │                  │  │   filtering        │  │
│  │ • audit_logs (Hashed) │  │                  │  │                    │  │
│  └───────────────────────┘  └──────────────────┘  └────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Walkthroughs

---

### Phase 0: Foundation Infrastructure

#### 1. Container Topology (`docker-compose.yml`)
The stack is organized into 7 orchestrated services operating on an isolated internal network (`eka-network`):
- `api`: FastAPI application with Uvicorn, health probes (`/healthz`, `/readyz`), and Prometheus metrics (`/metrics`).
- `postgres`: PostgreSQL 16 Alpine with initialized extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`) and an unprivileged read-only role (`eka_readonly`).
- `redis`: Redis 7.2 Alpine configured with a 512MB memory ceiling, `allkeys-lru` eviction, append-only file (AOF) persistence, and command renaming for security (`FLUSHALL`, `FLUSHDB`, `CONFIG` disabled/masked).
- `chroma`: ChromaDB vector database container persisting indices to `/chroma/chroma`.
- `worker`: Celery 5.4 worker processing asynchronous ingestion pipelines and document parsing jobs.
- `beat`: Celery Beat scheduler handling periodic cache cleanups and quota synchronizations.
- `ollama`: Offline local inference engine with volume caching for GGUF model weights.

#### 2. Database Layer (`src/db/`)
- **SQLAlchemy 2.0 Async Engine** (`src/db/engine.py`): Managed connection pooling (`pool_size=10`, `max_overflow=20`), connection pre-pinging, and context-managed sessions. Includes resilient error recovery that rolls back and logs connection notices gracefully when running in offline or test environments.
- **Alembic Async Migrations** (`alembic/`): Complete version-controlled database schema migration pipeline configured to execute asynchronously with `asyncpg`.

#### 3. Caching & Background Workers
- **Redis Client** (`src/cache/redis_client.py`): Asynchronous Redis wrapper with automatic connection recovery and graceful fallback to an in-memory dictionary cache if the Redis daemon is unreachable.
- **Celery Worker Setup** (`src/worker/celery_app.py`): Configured tasks (`tasks.ingest_document`, `tasks.reindex_tenant`) with Redis broker/backend and task time limits.

---

### Phase 1: Authentication, Multi-Tenancy & RBAC

#### 1. Authentication Core (`src/auth/`)
- **Dual Password Hashing** (`src/auth/security.py`): Industry-standard bcrypt with a seamless PBKDF2-HMAC-SHA256 fallback for environments lacking compiled bcrypt libraries.
- **JWT Signing & Verification**:
  - Access tokens: Short-lived (default 60 minutes) containing `sub` (user UUID), `tenant_id`, `roles` list, and `is_superadmin` flag.
  - Refresh tokens: Long-lived (default 7 days) with cryptographic UUID `jti` tracking for revocation.
- **Authentication Endpoints** (`src/auth/router.py`):
  - `POST /auth/login`: Authenticates email and password, verifies user active status and tenant membership, and issues paired tokens.
  - `POST /auth/refresh`: Validates refresh token signature and expiry, returning refreshed access tokens.
  - `GET /auth/me`: Returns the authenticated user profile, tenant assignments, and roles.

#### 2. Tenant Resolution Middleware (`src/middleware/tenant.py`)
- Evaluates every incoming request and extracts the active tenant context:
  1. Primary: `tenant_id` claim in validated Authorization Bearer JWT.
  2. Fallback: `X-Tenant-ID` header for public or pre-auth routing.
- Validates that the resolved tenant exists and has `status == "active"`. If a tenant is suspended, requests are rejected immediately with HTTP 403.
- In-memory tenant caching with short TTL prevents redundant database roundtrips.

#### 3. Role-Based Access Control (RBAC)
Four hierarchical roles are enforced via FastAPI dependencies:
- **`viewer`**: Allowed to query RAG search (`/query`, `/query/stream`) and read tenant stats (`/stats`).
- **`curator`**: Inherits `viewer` permissions; can ingest documents (`/ingest`, `/ingest/async`) and manage document access policies.
- **`admin`**: Full control within the tenant; can manage tenant users (`/admin/users`), view audit logs (`/admin/audit-logs`), and modify any document.
- **`superadmin`**: Cross-tenant administrative access; bypasses tenant boundaries and ACL restrictions.

#### 4. Free LLM Providers (`src/generation/providers/`)
- **Groq Provider** (`src/generation/providers/groq_provider.py`): Integrates with Groq's LPU hardware via their free API, supporting `llama-3.3-70b-versatile` and `mixtral-8x7b-32768`.
- **Ollama Provider** (`src/generation/providers/ollama_provider.py`): Connects to local Ollama daemon for 100% offline inference with Server-Sent Events (SSE) token streaming.

---

### Phase 2: Document-Level Access Control (ACL), Quotas & Audit Logging

#### 1. Relational Schema (`src/db/models/`)
- **`DocumentModel`** (`src/db/models/document.py`):
  - Table: `documents`
  - Columns: `doc_id` (UUID PK), `tenant_id` (FK), `owner_id` (FK), `filename`, `title`, `mime_type`, `file_size_bytes`, `chunk_count`, `status` (`active` / `archived`), `access_policy` (JSONB), `created_at`, `updated_at`.
  - Composite Index on `(tenant_id, status)` for fast quota counting and listing.
- **`AuditLog`** (`src/db/models/audit_log.py`):
  - Table: `audit_logs`
  - Columns: `event_id` (UUID PK), `tenant_id` (FK), `user_id` (FK), `action` (e.g. `query`, `document_ingest`, `permission_update`), `document_id` (FK), `chunk_ids` (JSONB array), `query_hash` (VARCHAR 64), `ip_address`, `created_at`.
  - Composite Index on `(tenant_id, created_at)`.

#### 2. Ingestion ACL Formatting (`src/ingestion/access_control.py`)
- **`AccessPolicy` Schema**:
  ```python
  class AccessPolicy(BaseModel):
      roles: List[str] = Field(default_factory=list)
      user_ids: List[str] = Field(default_factory=list)
      is_public: bool = True
  ```
- **Delimiter-Padded String Formatting**:
  Vector stores (like ChromaDB) often have limited nested JSON query support. We flatten permissions using comma-padded strings:
  - Role list `["finance", "executive"]` $\rightarrow$ `",finance,executive,"`
  - User list `["user-1", "user-2"]` $\rightarrow$ `",user-1,user-2,"`
  - Exact match lookup: Searching for role `finance` checks for substring `",finance,"`, preventing false positives like matching `finance` in `microfinance`.

#### 3. Permissioned Retrieval Engine (`src/retrieval/access_filter.py`)
- **`UserContext` Dataclass**: Captures caller credentials (`user_id`, `tenant_id`, `roles`, `is_superadmin`).
- **Two-Tier Filtering Architecture**:
  1. **Tier 1 (Chroma Pre-Filter)**: Vector search queries apply `where={"tenant_id": user.tenant_id}` to guarantee physical isolation at the vector level.
  2. **Tier 2 (In-Memory ACL Post-Filter)**: Retrieved candidate chunks are evaluated through `can_user_access_chunk`:
     - Checks if document status is `active` (rejects `archived`).
     - Checks if chunk is `is_public == "true"`.
     - Checks if caller is tenant `admin` or `superadmin`.
     - Checks if caller's user ID matches `allowed_users`.
     - Checks if any of caller's roles intersect `allowed_roles`.
- **Silent Non-Leakage Principle**:
  When a user queries for information in documents they cannot access, unauthorized chunks are stripped before LLM prompt generation. The system generates a neutral fallback answer ("*I could not find any relevant information in the knowledge base to answer your question.*") and returns an empty citations array `[]`. It **never** returns HTTP 403 on search queries, preventing unauthorized users from deducing confidential document existence.

#### 4. 100-Document Quota Enforcement
- Enforced in `POST /ingest` and `POST /ingest/async` in `src/api/app.py`.
- Queries `SELECT count(*) FROM documents WHERE tenant_id = :tid AND status = 'active'`.
- If active count $\ge 100$, ingestion is halted immediately with HTTP 400:
  ```json
  {"detail": "Tenant document limit reached (maximum 100 active documents). Please archive or delete existing documents."}
  ```

#### 5. Privacy-Preserving Audit Service (`src/audit/service.py`)
- `hash_query_text(query)` computes `SHA-256(query.strip().encode("utf-8"))`.
- `AuditService.log_event(...)` persists audit events to the database.
- Even in the event of database inspection or compromise, user search queries cannot be reversed to plaintext.
- Exposed via `GET /admin/audit-logs` for authorized tenant admins.

#### 6. Document Lifecycle Router (`src/documents/router.py`)
- `GET /documents`: Paginated list of tenant documents with title, chunk counts, and access policies.
- `GET /documents/{id}`: Detailed metadata for a specific document.
- `PATCH /documents/{id}/permissions`: Updates document access policies and logs audit events.
- `DELETE /documents/{id}`: Soft-delete/archives documents, instantly removing them from retrieval results while preserving historical audit integrity.

---

### Phase 3: Advanced Hybrid Retrieval & Cross-Encoder Reranking

#### 1. Tenant-Partitioned BM25 Retrieval (`src/retrieval/hybrid.py`)
- **Tenant-Scoped In-Memory & Disk Indexing**:
  - Maintained in `self._tenant_indices: dict[str, dict[str, Any]]` keyed by tenant ID.
  - Prevents Inverse Document Frequency (IDF) distortion across tenants: an internal term or acronym used frequently in Tenant A does not artificially dilute relevance in Tenant B.
  - Granular invalidation: `invalidate_index(tenant_id=...)` selectively invalidates only the updated tenant index rather than purging the entire index cache.
  - Disk persistence: Each tenant index is safely saved to and loaded from `bm25_index_{collection}_{tenant_id}.json`.
- **Pure-Python BM25Okapi Fallback Engine**:
  - Implements genuine BM25Okapi scoring with $k_1 = 1.5, b = 0.75$ and IDF computation directly in pure Python without requiring compiled C extensions or external pip packages when `rank_bm25` is absent.
  - Seamlessly utilizes high-performance `rank_bm25` when installed inside Docker.

#### 2. Reciprocal Rank Fusion (RRF)
- Combines rankings from sparse keyword search ($r_{bm25}$) and dense semantic vector search ($r_{vec}$):
  $$RRF\_score(d) = \alpha \cdot \frac{1}{k + r_{vec}(d) + 1} + (1 - \alpha) \cdot \frac{1}{k + r_{bm25}(d) + 1}$$
  where $k=60$ and $\alpha=0.6$ by default.
- Ensures documents matching both conceptual semantics and exact identifiers rank highest.

#### 3. Cross-Encoder Reranking (`src/retrieval/reranker.py`)
- **Architecture**:
  - Joint query-document attention scoring using `cross-encoder/ms-marco-MiniLM-L-6-v2` (fast 6-layer CPU model) or `BAAI/bge-reranker-large`.
  - Sigmoid calibration: Maps raw logits into normalized confidence scores in $[0.0, 1.0]$.
  - Minimum score thresholding (`min_score`): Filters out irrelevant candidates that fail semantic relevance checks.
- **Resilience & Fallbacks**:
  - Thread-safe lazy loading prevents race conditions under high concurrent traffic.
  - Automatic fallback mode: if PyTorch or SentenceTransformers is unavailable or encounters an out-of-memory condition on constrained machines, the system automatically preserves RRF scores and continues serving traffic with zero downtime.

#### 4. End-to-End Pipeline & API Enhancements
- **Two-Stage Retrieval Pipeline**:
  - Stage 1: Fast candidate retrieval (default 20 candidates) via hybrid search.
  - Stage 2: Precision re-ranking (top 5 final chunks) via cross-encoder.
- **Citation Relevance Tracking**:
  - `Citation` models now store both `score` (hybrid/dense) and `rerank_score` (cross-encoder confidence).
  - `X-RAG-Retrieval-Mode` response header (`hybrid+reranker`, `hybrid`, `dense`) provides transparency into search execution.

---

### Phase 4: Citations, Confidence Scoring & Abstention Logic

#### 1. Confidence Thresholding (`src/pipeline.py`)
- Evaluates the maximum `rerank_score` (or hybrid score) across all retrieved chunks.
- If the maximum score falls below the `confidence_threshold` (default `0.3`), the system **short-circuits generation entirely**.
- Returns a strict abstention message without calling the LLM, eliminating hallucination risks for out-of-domain queries.

#### 2. Abstention Serialization (`src/api/app.py`)
- The `QueryResponse` model and `/query/stream` endpoint events now include explicit `abstained: bool` and `confidence_score: float` fields.
- Clients can programmatically detect when the system abstains rather than parsing text strings.

#### 3. Verifiable Inline Citation Guardrails (`src/generation/generator.py`)
- Strict system prompt instructs the LLM to generate verifiable inline citation markers (e.g. `[1]`, `[2]`) mapped directly to the retrieved chunks.
- Explicit hallucination guardrail commands the LLM to abstain if the retrieved context is tangentially related but insufficient.

---

## Verification & Test Results

All 33 automated integration tests across Auth (Phase 1), ACL (Phase 2), and Hybrid/Rerank (Phase 3) pass on the host environment:

```bash
python -m pytest tests/integration/test_auth.py tests/integration/test_acl.py tests/integration/test_hybrid_rerank.py -v
```

### Complete Test Run Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-8.4.2, pluggy-1.6.0
collected 33 items

tests/integration/test_auth.py::test_login_success PASSED                [  3%]
tests/integration/test_auth.py::test_login_wrong_password_returns_401 PASSED [  6%]
tests/integration/test_auth.py::test_query_without_token_returns_401 PASSED [  9%]
tests/integration/test_auth.py::test_query_with_expired_token_returns_401 PASSED [ 12%]
tests/integration/test_auth.py::test_query_with_viewer_token_allowed PASSED [ 15%]
tests/integration/test_auth.py::test_ingest_with_viewer_token_forbidden PASSED [ 18%]
tests/integration/test_auth.py::test_ingest_with_curator_token_allowed PASSED [ 21%]
tests/integration/test_auth.py::test_admin_users_with_viewer_token_forbidden PASSED [ 24%]
tests/integration/test_auth.py::test_admin_users_with_admin_token_allowed PASSED [ 27%]
tests/integration/test_auth.py::test_refresh_tokens_success PASSED       [ 30%]
tests/integration/test_auth.py::test_refresh_tokens_expired_returns_401 PASSED [ 33%]
tests/integration/test_auth.py::test_get_me_profile PASSED               [ 36%]
tests/integration/test_acl.py::test_build_chunk_acl_metadata PASSED      [ 39%]
tests/integration/test_acl.py::test_can_user_access_chunk_public PASSED  [ 42%]
tests/integration/test_acl.py::test_can_user_access_chunk_restricted_role PASSED [ 45%]
tests/integration/test_acl.py::test_can_user_access_chunk_cross_tenant_rejected PASSED [ 48%]
tests/integration/test_acl.py::test_superadmin_bypasses_acls PASSED      [ 51%]
tests/integration/test_acl.py::test_filter_chunks_by_access PASSED       [ 54%]
tests/integration/test_acl.py::test_query_silent_non_leakage PASSED      [ 57%]
tests/integration/test_acl.py::test_tenant_isolation_in_query PASSED     [ 60%]
tests/integration/test_acl.py::test_ingest_quota_limit_enforced PASSED   [ 63%]
tests/integration/test_acl.py::test_list_documents PASSED                [ 66%]
tests/integration/test_acl.py::test_patch_document_permissions PASSED    [ 69%]
tests/integration/test_acl.py::test_delete_document_archives_record PASSED [ 72%]
tests/integration/test_acl.py::test_hash_query_text_privacy PASSED       [ 75%]
tests/integration/test_acl.py::test_admin_list_audit_logs PASSED         [ 78%]
tests/integration/test_hybrid_rerank.py::test_bm25_keyword_exact_match PASSED [ 81%]
tests/integration/test_hybrid_rerank.py::test_bm25_tenant_partitioning_isolation PASSED [ 84%]
tests/integration/test_hybrid_rerank.py::test_reciprocal_rank_fusion_combined_ranking PASSED [ 87%]
tests/integration/test_hybrid_rerank.py::test_reranker_fallback_mode_when_model_fails PASSED [ 90%]
tests/integration/test_hybrid_rerank.py::test_reranker_custom_prediction_and_normalization PASSED [ 93%]
tests/integration/test_hybrid_rerank.py::test_reranker_min_score_filtering PASSED [ 96%]
tests/integration/test_hybrid_rerank.py::test_api_query_hybrid_and_reranker PASSED [100%]

======================= 33 passed, 4 warnings in 25.52s =======================
```

---

## Roadmap & Upcoming Phases

| Phase | Name | Focus Areas | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Foundation Infrastructure | Docker Compose (7 services), PostgreSQL, Redis, Celery, Alembic | **COMPLETED** |
| **Phase 1** | Auth, RBAC & Multi-Tenancy | JWT auth, 4-tier RBAC, Tenant Resolution Middleware, Free LLMs | **COMPLETED** |
| **Phase 2** | Document ACL & Audit | DocumentModel, Ingestion ACLs, Silent Non-leakage, 100-Doc Cap, Privacy Audit | **COMPLETED** |
| **Phase 3** | Advanced Retrieval & Rerank | BM25 sparse index + Chroma dense index + RRF + Cross-Encoder Reranker + Tenant BM25 Partitioning | **COMPLETED** |
| **Phase 4** | Citations & Confidence Abstention | Verifiable citation markers, hallucination detection, abstention logic | **COMPLETED** |
| **Phase 5** | ERP Department System | Tenant-scoped departments, RBAC-guarded CRUD API, fallback enforcement, DB migration | **COMPLETED** |
| **Phase 6** | Escalation Cases & Query Forwarding | Escalation case lifecycle, centralized abstention handler, LLM-based query classification | Upcoming |
| **Phase 7** | ERP Mock Connector & Sync | Mock ERP connector, Celery Beat reconciliation, webhook ingestion, idempotency | Upcoming |
| **Phase 8** | Production Hardening | Nginx reverse proxy, rate limiting policies, automated backup scripts | Upcoming |

---

## Phase 5: ERP Department System

### Overview

Phase 5 introduces the tenant-scoped **Department** model — the organizational unit that owns a slice of enterprise knowledge and receives escalation cases when a query cannot be answered from the vector store. Departments are a prerequisite for Phase 6 (escalation cases and query forwarding).

---

### 5.1 Data Model (`src/db/models/department.py`)

The `Department` SQLAlchemy model follows the same patterns established in earlier phases (UUID primary key, `TimestampMixin`, typed `Mapped` columns).

```
departments
├── department_id  UUID PK
├── tenant_id      UUID FK → tenants.tenant_id (CASCADE DELETE)
├── name           VARCHAR(128)
├── description    TEXT
├── owner_id       UUID FK → users.user_id (SET NULL on delete)
├── is_fallback    BOOLEAN  — at most one TRUE per tenant (DB-enforced)
├── is_active      BOOLEAN  — soft-delete flag
├── created_at     TIMESTAMPTZ
└── updated_at     TIMESTAMPTZ
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Soft-delete via `is_active` | Preserves referential integrity with future escalation cases that reference a department |
| `is_fallback` partial unique index | Enforced at both DB level (`WHERE is_fallback = true`) and application level, so no two departments in the same tenant can both be the fallback |
| `owner_id` SET NULL on delete | Avoids cascade-deleting the department when an owner user is removed; orphaned departments retain history |
| Bidirectional `Tenant.departments` | Enables `tenant.departments` ORM navigation; cascade `all, delete-orphan` means deleting a tenant wipes its departments |

---

### 5.2 Database Migration (`alembic/versions/0003_departments.py`)

Migration chained from `0002_document_acl_and_audit_log`:

```sql
CREATE TABLE departments (
    department_id UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name          VARCHAR(128) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    owner_id      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    is_fallback   BOOLEAN NOT NULL DEFAULT false,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard lookup indexes
CREATE INDEX ix_departments_tenant_id   ON departments (tenant_id);
CREATE INDEX ix_departments_owner_id    ON departments (owner_id);
CREATE INDEX ix_departments_is_fallback ON departments (is_fallback);

-- Enforce single fallback per tenant at DB level
CREATE UNIQUE INDEX uq_departments_one_fallback_per_tenant
    ON departments (tenant_id)
    WHERE is_fallback = true;
```

Apply with: `alembic upgrade head`

---

### 5.3 REST API (`src/departments/router.py`)

All routes are scoped under `/tenants/{tenant_id}/departments`:

| Method | Path | Role Required | Description |
|---|---|---|---|
| `GET` | `/tenants/{id}/departments` | viewer+ | List active departments (paginated) |
| `POST` | `/tenants/{id}/departments` | admin | Create a new department |
| `GET` | `/tenants/{id}/departments/{dept_id}` | viewer+ | Fetch a single department |
| `PATCH` | `/tenants/{id}/departments/{dept_id}` | admin | Partial update (name, owner, fallback, active) |
| `DELETE` | `/tenants/{id}/departments/{dept_id}` | admin | Soft-delete (sets `is_active=False`) |

**Tenant isolation:** Non-superadmin users can only access the tenant embedded in their JWT. Superadmins can access any tenant.

**Request/response schemas:**

```python
# Create
DepartmentCreate(name, description, owner_id?, is_fallback)

# Update (all fields optional)
DepartmentUpdate(name?, description?, owner_id?, is_fallback?, is_active?)

# Response
DepartmentResponse(department_id, tenant_id, name, description,
                   owner_id, is_fallback, is_active, created_at, updated_at)
```

**Business rule enforcement:**

1. **Single fallback**: `POST` or `PATCH` with `is_fallback=True` checks for an existing fallback in the same tenant and returns `409 Conflict` if one exists.
2. **Fallback protection**: `DELETE` returns `409 Conflict` if the target department is the tenant's fallback — the caller must promote another department first.
3. **Owner membership**: When `owner_id` is provided, the API validates that the user is a member of the target tenant via `user_tenant_roles`; returns `422 Unprocessable Entity` otherwise.
4. **Soft-delete only**: Deletion sets `is_active=False` — records are never physically removed to preserve audit history and future escalation case references.

---

### 5.4 Integration Tests (`tests/integration/test_departments.py`)

29 test cases organized into 7 classes covering the full surface area:

| Class | Tests |
|---|---|
| `TestListDepartments` | viewer can list; unauthenticated → 401; cross-tenant → 403 |
| `TestCreateDepartment` | admin creates; viewer blocked → 403; missing name → 422; duplicate fallback → 409 |
| `TestGetDepartment` | viewer can get; nonexistent → 404 |
| `TestUpdateDepartment` | admin renames; viewer blocked → 403; promote to fallback (success + 409) |
| `TestDeleteDepartment` | admin soft-deletes; fallback protected → 409; viewer blocked → 403; nonexistent → 404 |
| `TestSuperadminAccess` | superadmin bypasses tenant check |
| `TestDepartmentModel` | column defaults, table name, column set, Tenant relationship, Pydantic schema |
| `TestMigration` | file exists, revision chain correct, partial unique index present |

All tests use mocked `AsyncSession` — no live database required.

---

### 5.5 Files Added / Modified

| Change | File |
|---|---|
| **NEW** | `src/db/models/department.py` |
| **NEW** | `src/departments/__init__.py` |
| **NEW** | `src/departments/router.py` |
| **NEW** | `alembic/versions/0003_departments.py` |
| **NEW** | `tests/integration/test_departments.py` |
| **MODIFIED** | `src/db/models/__init__.py` — exports `Department` |
| **MODIFIED** | `src/db/models/tenant.py` — adds `departments` back-reference |
| **MODIFIED** | `src/api/app.py` — imports and mounts `departments_router` |

---

## Phase 6: Escalation Cases & Query Forwarding

### Overview

Phase 6 implements the core workflow for handling unanswerable queries. When the RAG pipeline is unable to find authoritative information (confidence score < 0.3), the system centralizes abstention handling, generates a support escalation case, classifies it to the most relevant department, and returns a forwarding message to the user.

---

### 6.1 Data Model (`src/db/models/escalation_case.py`)

The `EscalationCase` model tracks the lifecycle of an unanswerable query:

```text
escalation_cases
├── case_id               UUID PK
├── tenant_id             UUID FK → tenants.tenant_id
├── department_id         UUID FK → departments.department_id (SET NULL)
├── user_id               UUID FK → users.user_id (SET NULL)
├── query_text            TEXT
├── query_hash            VARCHAR(64)
├── status                VARCHAR(32) — 'open', 'resolved', 'classification_failed'
├── classification_reason TEXT
├── confidence_score      FLOAT
├── resolution_doc_id     UUID
├── resolved_by           UUID
├── resolved_at           TIMESTAMPTZ
├── created_at            TIMESTAMPTZ
└── updated_at            TIMESTAMPTZ
```

**Privacy-Preserving Hash**:
- Just like Audit Logs, the original `query_text` is hashed into `query_hash`. However, the original `query_text` is also preserved here to allow department owners to see the context of the unanswerable query and upload an appropriate resolution document.

---

### 6.2 Database Migration (`alembic/versions/0004_escalation_cases.py`)

Alembic migration chaining from `0003_departments.py` to create the table and requisite indexes for fast querying by `tenant_id`, `status`, and `department_id`.

---

### 6.3 Centralized Escalation Service (`src/escalation/service.py`)

Centralized abstention logic replaces fragmented conditionals in the `/query` and `/query/stream` endpoints:
- `handle_abstention(session, tenant_id, user_id, query_text, confidence_score, generator)`:
  1. Identifies the most appropriate `Department` via an LLM classification prompt.
  2. If LLM fails or no department strongly matches, routes to the tenant's `is_fallback=True` department.
  3. If no departments exist, marks the case as `classification_failed`.
  4. Returns the created `EscalationCase` ID and department name to emit to the user.
- `resolve_case(...)`: Associates a newly ingested `resolution_doc_id` with an open escalation case, closing the loop.

---

### 6.4 REST API (`src/escalation/router.py`)

Endpoints scoped under `/tenants/{tenant_id}/escalations`:

| Method | Path | Role Required | Description |
|---|---|---|---|
| `GET` | `/tenants/{id}/escalations` | admin | List escalation cases (filter by status/dept) |
| `GET` | `/tenants/{id}/escalations/{case_id}` | admin | Fetch a specific escalation case |
| `POST` | `/tenants/{id}/escalations/{case_id}/resolve` | admin | Resolve case via a resolution doc ID |

---

### 6.5 Pipeline Integrations

- **`/query` and `/query/stream` endpoints**:
  - The threshold check (`confidence_score < 0.3`) triggers `EscalationService.handle_abstention()`.
  - Emits the forwarding message (instead of just "I don't know") and populates `case_id`, `status`, and `department_name` in the response JSON.

---

### 6.6 Integration Tests (`tests/integration/test_escalation.py`)

29 comprehensive tests verifying:
- Admin CRUD permissions vs viewer/curator restrictions.
- LLM generator mock success, failure (fallback routing), and empty state behaviors in `EscalationService`.
- 409 Conflict when attempting to resolve an already resolved case.
- 422 Unprocessable Entity if the provided `resolution_doc_id` is missing or belongs to a different tenant.
- End-to-end `/query` abstention creating an escalation and returning a case ID.

---

### 6.7 Files Added / Modified

| Change | File |
|---|---|
| **NEW** | `src/db/models/escalation_case.py` |
| **NEW** | `src/escalation/__init__.py` |
| **NEW** | `src/escalation/service.py` |
| **NEW** | `src/escalation/router.py` |
| **NEW** | `alembic/versions/0004_escalation_cases.py` |
| **NEW** | `tests/integration/test_escalation.py` |
| **MODIFIED** | `src/db/models/__init__.py` — exports `EscalationCase` |
| **MODIFIED** | `src/api/app.py` — `QueryResponse`, `/query`, `/query/stream`, router mount |
| **MODIFIED** | `tests/integration/test_abstention.py` — updated assertions for Phase 6 forwarding text |
| **MODIFIED** | `tests/integration/test_acl.py` — updated silent non-leakage assertions |
| **MODIFIED** | `tests/integration/test_auth.py` — updated test mocks for `QueryResponse` 4-tuple |
