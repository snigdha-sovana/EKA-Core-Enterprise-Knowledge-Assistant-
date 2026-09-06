# Enterprise Knowledge Assistant (EKA-Core)

[![CI](https://github.com/snigdha-sovana/EKA-Core-Enterprise-Knowledge-Assistant-/actions/workflows/ci.yml/badge.svg)](https://github.com/snigdha-sovana/EKA-Core-Enterprise-Knowledge-Assistant-/actions/workflows/ci.yml)
[![Docker](https://github.com/snigdha-sovana/EKA-Core-Enterprise-Knowledge-Assistant-/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/snigdha-sovana/EKA-Core-Enterprise-Knowledge-Assistant-/actions/workflows/docker-publish.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Tests](https://img.shields.io/badge/tests-84%20passing-brightgreen.svg)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-ready **Retrieval-Augmented Generation (RAG)** system designed specifically for enterprise environments. EKA-Core provides hard multi-tenant data isolation, granular Document-Level Access Control (ACL), Role-Based Access Control (RBAC), and privacy-preserving audit logging. 

It demonstrates a scalable microservices architecture using FastAPI, PostgreSQL, Redis, Celery, and ChromaDB, paired with free LLM backends (Groq and Ollama) to eliminate API costs while retaining high accuracy.

---

## Architecture

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
                        │ • RBAC Guard Dependencies  │
                        └─────────────┬──────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ Auth & Users  │             │   Documents   │             │ Query Engine  │
│ ───────────── │             │ ───────────── │             │ ───────────── │
│ • Login/Token │             │ • Ingest & ACL│             │ • Hybrid Search │
│ • Roles/Tenant│             │ • 100-Doc Cap │             │ • Escalations │
└───────┬───────┘             └───────┬───────┘             └───────┬───────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                             Storage Layer                                 │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │     PostgreSQL 16     │  │    Redis 7.2     │  │   ChromaDB 0.4+    │  │
│  │ ───────────────────── │  │ ──────────────── │  │ ────────────────── │  │
│  │ • tenants & users     │  │ • Token blacklist│  │ • Multi-lang vector│  │
│  │ • departments & docs  │  │ • Celery broker  │  │ • ACL metadata     │  │
│  │ • audit_logs (Hashed) │  │                  │  │   filtering        │  │
│  └───────────────────────┘  └──────────────────┘  └────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Development Phases

| Phase | What's added |
|-------|-------------|
| **0 — Foundation** | Docker Compose (7 services), PostgreSQL, Redis, Celery, Alembic async migrations. |
| **1 — Auth & RBAC** | JWT lifecycle, 4-tier RBAC (`viewer`, `curator`, `admin`, `superadmin`), Tenant Middleware, Groq/Ollama LLMs. |
| **2 — ACL & Audit** | Fine-grained Document ACLs, Silent Non-leakage, 100-document active quota, privacy-preserving SHA-256 query hashing. |
| **3 — Hybrid Search** | BM25 sparse indexing, Reciprocal Rank Fusion (RRF), Cross-Encoder reranking, tenant-partitioned scoring. |
| **4 — Citations** | Verifiable inline citation markers, hallucination guardrails, confidence scoring. |
| **5 — Departments** | Tenant-scoped organizational units, ownership hierarchies, and single-fallback constraint enforcement. |
| **6 — Escalation** | Centralized query abstention (`confidence < 0.3`), LLM-based department classification, support ticket generation. |

---

## Features

- **Multi-Tenancy & Hard Isolation** — Complete physical and logical separation of data across storage, cache, and vector layers via JWT context extraction.
- **Role-Based Access Control** — Enforced at the FastAPI dependency level (`viewer`, `curator`, `admin`, `superadmin`).
- **Document-Level ACLs** — Permissions evaluate active status, public flags, allowed roles, and allowed specific users before context reaches the LLM.
- **Silent Non-Leakage Guarantee** — Unauthorized queries silently filter out protected chunks and respond with a neutral "information not found" answer, ensuring metadata existence isn't leaked via 403 errors.
- **Privacy-Preserving Audit Logs** — Immutable logs where sensitive user search texts are irreversibly hashed (`SHA-256`) to protect corporate secrets, while tracking resource usage.
- **Hybrid Search & Reranking** — Pure-Python BM25 + dense ChromaDB vectors fused via Reciprocal Rank Fusion (RRF), reordered by a fast `ms-marco` cross-encoder for precision.
- **Tenant-Partitioned BM25** — Avoids Inverse Document Frequency (IDF) distortion across tenants so terminology in one org doesn't skew results in another.
- **Intelligent Query Escalations** — When RAG confidence is low, the system abstains from hallucinating, creates an escalation case, and automatically classifies the query to the correct department.
- **Cost-Free LLM Integrations** — Deep integration with Groq (for blazing fast inference) and Ollama (for offline, private execution) without expensive per-token bills.
- **SSE Token Streaming** — `/query/stream` delivers live tokens seamlessly to web/mobile clients.
- **Asynchronous Processing** — Celery workers handle heavy document chunking and ingestion while the API remains responsive.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- `uv` (optional, for rapid environment management)

### Installation

```bash
git clone https://github.com/snigdha-sovana/EKA-Core-Enterprise-Knowledge-Assistant-.git
cd EKA-Core-Enterprise-Knowledge-Assistant-

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### Configure

```bash
cp .env.example .env
# Edit .env — specifically your GROQ_API_KEY if using Groq.
```

### Run the Infrastructure (Docker)

To start the required datastores (Postgres, Redis, Chroma, Celery, Ollama):

```bash
docker-compose up -d
```

Initialize the database schemas:

```bash
alembic upgrade head
```

### Seed & Query

Create a superadmin user to begin onboarding tenants:
```bash
python scripts/seed_superadmin.py
```

Run the API Server:
```bash
uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000
```

---

## API Reference

The API is fully documented via Swagger at `http://localhost:8000/docs` when running.

| Category | Endpoints | Description |
|--------|----------|-------------|
| **Auth** | `/auth/login`, `/auth/refresh` | Obtain and refresh JWT tokens |
| **System** | `/healthz`, `/readyz` | Liveness and readiness probes |
| **Tenants** | `/admin/tenants/*` | Superadmin tenant onboarding |
| **Users** | `/admin/users/*` | Tenant-scoped user management |
| **Ingestion** | `/ingest`, `/ingest/async` | Document ingestion and quota tracking |
| **Documents** | `/documents/*` | Manage ACLs and soft-archive documents |
| **Querying** | `/query`, `/query/stream` | Synchronous and SSE-streaming RAG queries |
| **Escalations** | `/tenants/{id}/escalations` | Manage unanswerable queries and resolutions |
| **Departments** | `/tenants/{id}/departments` | Manage organizational fallback queues |

### Example Request (`POST /query`)

```json
{
  "question": "What is Q3 budget?",
  "top_k": 5,
  "use_hybrid": true,
  "use_reranker": true
}
```

Response (When Authorized):
```json
{
  "answer": "The Q3 budget is $45M [1].",
  "citations": [...],
  "abstained": false,
  "confidence_score": 0.95
}
```

Response (When Escalated/Unauthorized):
```json
{
  "answer": "Query forwarded — not enough resources in the knowledge base. A support case has been created (ID: 1234).",
  "citations": [],
  "abstained": true,
  "confidence_score": 0.1,
  "case_id": "uuid-here",
  "department_name": "Finance",
  "status": "open"
}
```

---

## Configuration

Core environment variables defined in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Cache and Celery broker |
| `JWT_SECRET_KEY` | *(Required)* | 256-bit cryptographically secure secret |
| `RAG_LLM_PROVIDER` | `groq` | Backend: `groq` or `ollama` |
| `GROQ_API_KEY` | *(Required if using Groq)* | Free API key from Groq Cloud |
| `RAG_CHROMA_PATH` | `data/chroma_db` | Vector store persistence |
| `RAG_CONFIDENCE_THRESHOLD`| `0.3` | Score below which the LLM abstains |
| `RAG_MAX_ACTIVE_DOCUMENTS`| `100` | Quota enforcement per tenant |

---

## Docker

### Full Stack

You can run the entire API application alongside its datastores entirely within Docker Compose:

```bash
docker-compose --profile full up -d
```

### Production Publishing

The image is configured to publish automatically via GitHub Actions:

```bash
docker pull ghcr.io/snigdha-sovana/eka-core:latest
```

---

## Testing

EKA-Core includes a highly rigorous integration test suite encompassing RBAC security matrices, vector persistence, streaming, and database migrations.

```bash
# Run the full integration suite (84 tests):
python -m pytest tests/integration/ -v
```

### Test Coverage Focus

| Module | Focus |
|--------|---------------|
| `test_auth.py` | JWT lifecycle, hierarchical RBAC enforcement |
| `test_acl.py` | Document-level isolation, public vs private, silent non-leakage |
| `test_hybrid_rerank.py` | Tenant BM25 partitioning, Cross-encoder filtering |
| `test_departments.py` | Single-fallback enforcement, DB relationship integrity |
| `test_escalation.py` | LLM abstention classification, support resolution loops |

---

## Security

- **Constant-time JWT comparisons** to prevent timing-based token attacks.
- **Bcrypt dual hashing** with smooth PBKDF2 fallbacks.
- **No Pickle** — all data structures (including BM25 sparse indices) are serialized purely as JSON.
- **Tenant Middleware Guard** — Suspended tenants result in immediate HTTP 403 blocks across all downstream routes without DB roundtripping.
- **Zero Plaintext Query Retention** via `SHA-256` hashing in audit logs.
- **Database read-only roles** (`eka_readonly`) configured internally for analytics protection.

To report a security vulnerability, please open a private advisory via GitHub Security.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
