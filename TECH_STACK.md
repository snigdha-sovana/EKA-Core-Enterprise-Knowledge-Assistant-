# Enterprise Knowledge Assistant — Detailed Technical Stack Reference

> **Version:** 1.1 — Free LLM Backend  
> **Companion to:** PRD v1.1  
> **Date:** September 2026

> [!IMPORTANT]
> **LLM backend decision:** Groq API (primary, free cloud) + Ollama (local fallback). OpenAI and Anthropic are **removed** as defaults. Embeddings run locally via `sentence-transformers` — zero per-token cost.

---

## Table of Contents

1. [Stack Overview — One-Page Map](#1-stack-overview--one-page-map)
2. [API Keys & External Credentials](#2-api-keys--external-credentials)
3. [Authentication Stack](#3-authentication-stack)
4. [Database Layer — PostgreSQL](#4-database-layer--postgresql)
5. [Vector Store — ChromaDB](#5-vector-store--chromadb)
6. [Cache Layer — Redis](#6-cache-layer--redis)
7. [Async Task Layer — Celery](#7-async-task-layer--celery)
8. [LLM & Embedding Providers](#8-llm--embedding-providers)
9. [Search & Retrieval Stack](#9-search--retrieval-stack)
10. [Observability Stack](#10-observability-stack)
11. [API Framework — FastAPI](#11-api-framework--fastapi)
12. [Web UI — Next.js](#12-web-ui--nextjs)
13. [Infrastructure — Docker & Nginx](#13-infrastructure--docker--nginx)
14. [CI/CD — GitHub Actions](#14-cicd--github-actions)
15. [Complete `.env.example`](#15-complete-envexample)
16. [Complete `requirements.txt`](#16-complete-requirementstxt)
17. [Complete `docker-compose.yml`](#17-complete-docker-composeyml)
18. [Quick-Start Order of Operations](#18-quick-start-order-of-operations)

---

## 1. Stack Overview — One-Page Map

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                                                 │
│                                                                                    │
│  Groq API (FREE)          Langfuse Cloud (FREE tier)    GitHub (CI/CD + GHCR)      │
│  Llama 3.1 70B / Mixtral  Trace spans per query         Actions + Container Reg.   │
│  6,000 req/day free                                                                │
└──────────────┬─────────────────────────────┬───────────────────┬───────────────────┘
               │                             │                   │
┌──────────────▼─────────────────────────────▼───────────────────▼───────────────────┐
│  SELF-HOSTED SERVICES (Docker Compose) — 100% Free                                 │
│                                                                                    │
│  Nginx (TLS + rate limit)                                                          │
│    └── FastAPI (Python 3.11)       ← JWT Auth + Tenant Middleware                  │
│          ├── Ollama (local LLM)    ← Llama 3.1 / Mistral / Gemma2 (fallback/dev)  │
│          ├── ChromaDB standalone   ← Vector store, per-tenant collections          │
│          ├── PostgreSQL 15         ← Metadata, users, audit, analytics             │
│          ├── Redis 7               ← Cache (results, embeddings, sessions)         │
│          ├── Celery Worker         ← Async ingestion + eval scoring                │
│          └── Celery Beat           ← Scheduled reports                             │
│                                                                                    │
│  Embeddings: sentence-transformers (local, BAAI/bge-small-en-v1.5) — FREE         │
│  Reranker:   cross-encoder/ms-marco-MiniLM-L-6-v2 (local) — FREE                  │
└────────────────────────────────────────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│  FRONTEND (Next.js 14, App Router)      │
│  Admin UI + Analytics + Query Interface │
└─────────────────────────────────────────┘
```

---

## 2. API Keys & External Credentials

> [!NOTE]
> The EKA free-LLM stack requires **only two external API keys**: Groq (free) and optionally Langfuse (free tier). All other services (embeddings, reranker, local LLM fallback) run fully on-premise with zero API calls.

### 2.1 Groq API — Primary Free LLM Backend

**Used for:** Query answering (Llama 3.1 70B / Mixtral 8x7B), evaluation judge (LLM-as-Judge)  
**Cost:** $0 — free tier is sufficient for EKA at 100 docs/tenant scale  
**Free tier limits:** 6,000 requests/day, 500,000 tokens/minute (as of September 2026)

**Setup:**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign in with Google / GitHub — no credit card required
3. **API Keys** → **Create API Key**
4. Name it `eka-production` and copy it — shown only once

**Key format:** `gsk_...`

```bash
# .env — Groq (PRIMARY — required)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAG_LLM_PROVIDER=groq
RAG_LLM_MODEL=llama-3.1-70b-versatile    # best quality on free tier
# Alternatives (all free):
# RAG_LLM_MODEL=llama-3.1-8b-instant    # fastest, lower quality
# RAG_LLM_MODEL=mixtral-8x7b-32768      # strong MoE, 32K context window
# RAG_LLM_MODEL=gemma2-9b-it            # Google Gemma 2 9B
RAG_EVAL_JUDGE_MODEL=llama-3.1-70b-versatile   # used for LLM-as-Judge evaluation
```

**Groq free tier model reference:**
| Model | Context Window | Speed | Best For |
|---|---|---|---|
| `llama-3.1-70b-versatile` | 128K tokens | ~280 tokens/s | Default — best quality |
| `llama-3.1-8b-instant` | 128K tokens | ~750 tokens/s | Latency-sensitive queries |
| `mixtral-8x7b-32768` | 32K tokens | ~500 tokens/s | Long-context documents |
| `gemma2-9b-it` | 8K tokens | ~500 tokens/s | Lightweight alternative |

**Python package:**
```bash
pip install groq>=0.9.0
```

**Groq client usage pattern** (matches existing generator abstraction):
```python
# src/generation/providers/groq_provider.py
from groq import AsyncGroq

client = AsyncGroq(api_key=settings.groq_api_key)

async def generate(prompt: str, model: str) -> str:
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.1,    # low temperature for factual RAG answers
    )
    return response.choices[0].message.content
```

> [!TIP]
> Groq's API is **OpenAI-compatible** — you can also use the `openai` Python package pointed at Groq's base URL:
> ```python
> from openai import AsyncOpenAI
> client = AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
> ```
> This means the existing `src/generation/generator.py` needs **minimal changes** — just swap `base_url`.

---

### 2.2 Ollama — Local LLM Fallback (Zero API Key)

**Used for:** Fully offline / air-gapped deployments, local development without internet, privacy-first tenants  
**Cost:** $0 — runs entirely on your hardware  
**Requires:** CPU (slow) or NVIDIA GPU (fast). Runs on Mac M-series via Metal.

**Setup — Local (dev machine):**
```bash
# 1. Install Ollama
# Windows / Mac: https://ollama.com/download
# Linux:
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull models (choose one or more):
ollama pull llama3.1           # 4.7GB — Llama 3.1 8B (default)
ollama pull llama3.1:70b       # 40GB — requires 48GB+ VRAM for GPU
ollama pull mistral            # 4.1GB — fast and capable
ollama pull gemma2:9b          # 5.4GB — good for low-resource machines
ollama pull nomic-embed-text   # 274MB — embeddings (optional, see Section 8.2)

# 3. Verify Ollama is running:
curl http://localhost:11434/api/tags
```

**Setup — Docker Compose (recommended for consistent environment):**
```yaml
# In docker-compose.yml (see Section 17 for full compose)
ollama:
  image: ollama/ollama:latest
  container_name: eka-ollama
  volumes:
    - ollama_models:/root/.ollama
  ports:
    - "127.0.0.1:11434:11434"    # localhost only
  # GPU support (optional — comment out if no NVIDIA GPU):
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  restart: unless-stopped
  healthcheck:
    test: ["CMD-SHELL", "curl -sf http://localhost:11434/api/tags || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
```

```bash
# After docker compose up, pull models inside the container:
docker exec eka-ollama ollama pull llama3.1
docker exec eka-ollama ollama pull mistral
```

```bash
# .env — Ollama (LOCAL FALLBACK)
OLLAMA_BASE_URL=http://localhost:11434    # http://ollama:11434 in Docker
OLLAMA_LLM_MODEL=llama3.1               # model name as known to Ollama
OLLAMA_EMBED_MODEL=nomic-embed-text      # optional: local embeddings via Ollama

# To switch the full stack to Ollama:
RAG_LLM_PROVIDER=ollama
RAG_LLM_MODEL=llama3.1
RAG_EMBEDDING_PROVIDER=local             # uses sentence-transformers (not Ollama)
```

**Provider switching logic** (config-driven, no code changes):
```
RAG_LLM_PROVIDER=groq    → uses Groq API (cloud, free tier)
RAG_LLM_PROVIDER=ollama  → uses Ollama REST API (local, offline)
```

**Ollama hardware requirements:**
| Model | VRAM (GPU) | RAM (CPU) | Speed (CPU) |
|---|---|---|---|
| `llama3.1` (8B) | 6 GB | 8 GB | ~10 tokens/s |
| `mistral` (7B) | 5 GB | 8 GB | ~12 tokens/s |
| `gemma2:9b` | 7 GB | 10 GB | ~8 tokens/s |
| `llama3.1:70b` | 48 GB | 64 GB | ~1 token/s |

**Python package:**
```bash
pip install ollama>=0.3.0
```

---

### 2.3 Langfuse — LLM Tracing

**Used for:** End-to-end trace capture across retrieve → rerank → generate stages

**Option A — Langfuse Cloud (recommended for dev):**
1. Go to [cloud.langfuse.com](https://cloud.langfuse.com)
2. Create account → **New Project** → name it `eka-dev`
3. **Settings → API Keys** → copy both `pk-lf-...` and `sk-lf-...`

**Option B — Self-hosted Langfuse (recommended for production):**
```bash
# Add to docker-compose.yml (see Section 17 for full compose)
langfuse:
  image: langfuse/langfuse:latest
  ports:
    - "3000:3000"
  environment:
    DATABASE_URL: postgresql://langfuse:langfuse@postgres:5432/langfuse
    NEXTAUTH_SECRET: <generate with: openssl rand -base64 32>
    SALT: <generate with: openssl rand -base64 32>
```

```bash
# .env
MONITOR_ENABLED=true
MONITOR_LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONITOR_LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONITOR_LANGFUSE_HOST=https://cloud.langfuse.com   # or http://langfuse:3000 if self-hosted
```

---

### 2.4 GitHub — CI/CD & Container Registry

**Used for:** GitHub Actions CI/CD, GHCR Docker image publishing

**Setup:**
1. All Actions secrets are set at **Repository → Settings → Secrets and variables → Actions**
2. Required secrets:

| Secret Name | Value | Purpose |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` from console.groq.com | `evaluate.yml` (LLM-as-Judge via Groq) |
| `POSTGRES_PASSWORD` | Random strong password | Integration test DB |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` output | Integration test auth |
| `DEPLOY_SSH_KEY` | Private SSH key | `deploy.yml` SSH deployment |
| `DEPLOY_HOST` | Hostname/IP of staging server | `deploy.yml` target |
| `DEPLOY_USER` | SSH username | `deploy.yml` target |

**GHCR authentication** (automatic for Actions, local push):
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

### 2.5 Credential Security Rules

> [!CAUTION]
> Never commit any key to git. The `.gitignore` already excludes `.env`. Verify with:
> ```bash
> git secrets --scan   # if git-secrets is installed
> # or:
> grep -r "sk-" . --include="*.py" --include="*.yml" --include="*.env"
> ```

- All keys stored in `.env` locally; in GitHub Secrets for CI; in a secrets manager (HashiCorp Vault or AWS SSM) for production
- Key rotation: rotate Groq keys every 90 days; JWT secret on every major release
- Never log partial keys; the existing codebase already enforces this

---

## 3. Authentication Stack

### Packages

```
python-jose[cryptography]==3.3.0   # JWT sign/verify
passlib[bcrypt]==1.7.4             # Password hashing
python-multipart==0.0.9            # Form data (login endpoint)
```

### JWT Configuration

```bash
# .env — Authentication
JWT_SECRET_KEY=<output of: openssl rand -hex 32>   # REQUIRED — 256-bit random secret
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
JWT_AUDIENCE=eka-api                # standard JWT audience claim
JWT_ISSUER=eka-auth                 # standard JWT issuer claim
```

**Token Structure:**
```json
{
  "sub": "user-uuid-here",
  "tenant_id": "tenant-uuid-here",
  "tenant_slug": "acme-corp",
  "roles": ["admin"],
  "aud": "eka-api",
  "iss": "eka-auth",
  "iat": 1725470400,
  "exp": 1725474000
}
```

**Superadmin token** (separate audience, issued only at `/superadmin/auth/login`):
```json
{
  "sub": "superadmin-uuid",
  "aud": "eka-superadmin",
  "roles": ["superadmin"]
}
```

### OIDC Federation (Optional)

```bash
# .env — OIDC (leave unset to disable)
OIDC_PROVIDER_URL=https://accounts.google.com          # Google Workspace
# OIDC_PROVIDER_URL=https://login.microsoftonline.com/{tenant}/v2.0  # Azure AD
# OIDC_PROVIDER_URL=https://your-org.okta.com           # Okta

OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://your-eka-host.com/auth/callback

# Maps IdP group names to EKA roles (JSON string)
OIDC_ROLE_CLAIM_MAP={"Engineering": "curator", "IT-Admins": "admin", "default": "viewer"}
```

**Getting OIDC credentials:**

| Provider | Where to create |
|---|---|
| **Google Workspace** | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application) |
| **Azure AD** | [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App registrations → New registration |
| **Okta** | Okta Admin Console → Applications → Create App Integration → OIDC → Web Application |

**Required Python packages for OIDC:**
```
authlib==1.3.1          # OIDC client
httpx==0.27.0           # Async HTTP (already needed for async LLM calls)
```

### Password Hashing Setup

```python
# src/auth/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12      # 12 rounds ≈ 250ms per hash — good balance for 2026 hardware
)
```

> [!NOTE]
> Bcrypt 12 rounds is the correct default for 2026. Do not reduce rounds below 10. Never store plaintext passwords at any point.

---

## 4. Database Layer — PostgreSQL

### Version & Selection Rationale

| Decision | Choice | Why |
|---|---|---|
| Engine | PostgreSQL 15 | JSONB for `access_policy`, Row-Level Security (RLS), `gen_random_uuid()`, strong ecosystem |
| Driver | `asyncpg 0.29+` | Pure-async Python driver, fastest available for FastAPI async code |
| ORM | SQLAlchemy 2.0 (async) | Type-safe models, Alembic migration support, async session pool |
| Migrations | Alembic 1.13+ | Version-controlled DDL, auto-generated diff migrations |
| Connection pool | SQLAlchemy built-in | Pool size tuned per environment (see config below) |

### Packages

```
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
alembic==1.13.2
```

### Connection String Format

```bash
# .env — PostgreSQL
DATABASE_URL=postgresql+asyncpg://eka_user:STRONG_PASSWORD@localhost:5432/eka_db

# For Docker Compose (service name as host):
DATABASE_URL=postgresql+asyncpg://eka_user:STRONG_PASSWORD@postgres:5432/eka_db

# Pool sizing:
DB_POOL_SIZE=10          # concurrent connections per API worker
DB_MAX_OVERFLOW=20       # burst connections above pool_size
DB_POOL_TIMEOUT=30       # seconds to wait for a connection
DB_POOL_RECYCLE=1800     # recycle connections after 30 min to avoid stale TCP
```

### First-Time Database Setup

```bash
# 1. Create the database and user (run as postgres superuser):
psql -U postgres << 'EOF'
CREATE USER eka_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE eka_db OWNER eka_user;
\c eka_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- for fuzzy text search on query_log

-- Create a read-only analytics user:
CREATE USER eka_readonly WITH PASSWORD 'READONLY_PASSWORD';
GRANT CONNECT ON DATABASE eka_db TO eka_readonly;
GRANT USAGE ON SCHEMA public TO eka_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO eka_readonly;
EOF

# 2. Initialize Alembic:
alembic init alembic

# 3. Run migrations:
alembic upgrade head

# 4. Seed superadmin (run once):
python scripts/seed_superadmin.py --email admin@yourcompany.com
```

### PostgreSQL `postgresql.conf` Tuning (Production)

```ini
# /etc/postgresql/15/main/postgresql.conf  (or set via docker environment)
max_connections = 100
shared_buffers = 256MB            # 25% of available RAM (for 1GB RAM instance)
effective_cache_size = 768MB      # 75% of available RAM
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1            # SSD-optimized
work_mem = 4MB
log_min_duration_statement = 1000  # log queries slower than 1s
```

### Row-Level Security Setup

```sql
-- Applied in Alembic migration — runs once at schema creation time,
-- not per tenant. The app sets app.current_tenant_id at transaction start.

-- Example for documents table (same pattern applied to all tenant-scoped tables):
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON documents
  AS PERMISSIVE
  FOR ALL
  TO eka_user
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Superadmin bypass (applied separately for eka_readonly and superadmin role):
CREATE POLICY superadmin_bypass ON documents
  AS PERMISSIVE
  FOR SELECT
  TO eka_readonly
  USING (true);   -- superadmin can read all rows
```

### Full Schema (Alembic-managed)

```sql
-- tenants
CREATE TABLE tenants (
    tenant_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         VARCHAR(64) UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'active',
    doc_cap      INTEGER NOT NULL DEFAULT 100,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    suspended_at TIMESTAMPTZ,
    config       JSONB DEFAULT '{}'
);

-- users
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT,                      -- NULL for OIDC-only users
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    is_superadmin BOOLEAN NOT NULL DEFAULT false
);

-- user_tenant_roles  (RLS applied)
CREATE TABLE user_tenant_roles (
    user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    role       VARCHAR(16) NOT NULL,
    granted_by UUID REFERENCES users(user_id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tenant_id)
);

-- documents  (RLS applied)
CREATE TABLE documents (
    document_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
    title        TEXT NOT NULL,
    filename     TEXT NOT NULL,
    collection   VARCHAR(128) NOT NULL DEFAULT 'default',
    owner_id     UUID NOT NULL REFERENCES users(user_id),
    access_policy JSONB NOT NULL DEFAULT '{"public": false, "roles": [], "user_ids": []}',
    chunk_count  INTEGER,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at  TIMESTAMPTZ,
    file_hash    CHAR(64)             -- SHA-256 of file content (dedup)
);
CREATE INDEX idx_documents_tenant ON documents(tenant_id) WHERE archived_at IS NULL;

-- chunks  (RLS applied via documents join)
CREATE TABLE chunks (
    chunk_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id),
    chroma_id     TEXT NOT NULL,             -- ChromaDB internal ID
    text_preview  TEXT,                      -- first 200 chars for UI display
    page_number   INTEGER,
    section_heading TEXT,
    chunk_index   INTEGER NOT NULL
);

-- query_log  (RLS applied)
CREATE TABLE query_log (
    query_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id           UUID NOT NULL REFERENCES users(user_id),
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
    query_hash        CHAR(64) NOT NULL,
    query_text        TEXT,                  -- only if RAG_LOG_QUERY_TEXT=true
    collections       TEXT[],
    hybrid_alpha      FLOAT,
    use_reranker      BOOLEAN,
    top_k_final       INTEGER,
    confidence_score  FLOAT,
    confidence_tier   VARCHAR(8),            -- HIGH | MEDIUM | LOW
    abstained         BOOLEAN NOT NULL DEFAULT false,
    abstention_reason VARCHAR(64),
    latency_ms        INTEGER,
    tokens_used       INTEGER,
    cost_usd          NUMERIC(10,6),
    llm_provider      VARCHAR(32),
    llm_model         VARCHAR(64),
    faithfulness      FLOAT,
    answer_relevance  FLOAT,
    session_id        UUID
);
CREATE INDEX idx_query_log_tenant_ts ON query_log(tenant_id, timestamp DESC);

-- audit_log  (append-only; no UPDATE/DELETE policy applied for eka_user)
CREATE TABLE audit_log (
    event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID REFERENCES tenants(tenant_id),
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id      UUID REFERENCES users(user_id),
    action       VARCHAR(64) NOT NULL,
    document_id  UUID REFERENCES documents(document_id),
    chunk_ids    TEXT[],
    query_hash   CHAR(64),
    ip_address   INET
);
CREATE INDEX idx_audit_tenant_ts ON audit_log(tenant_id, timestamp DESC);

-- ingestion_jobs  (RLS applied)
CREATE TABLE ingestion_jobs (
    job_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id),
    user_id       UUID NOT NULL REFERENCES users(user_id),
    status        VARCHAR(16) NOT NULL DEFAULT 'pending',
    document_count INTEGER,
    error_message TEXT,
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- evaluation_results  (RLS applied)
CREATE TABLE evaluation_results (
    result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id),
    query_id          UUID REFERENCES query_log(query_id),
    faithfulness      FLOAT,
    answer_relevance  FLOAT,
    context_precision FLOAT,
    context_recall    FLOAT,
    evaluated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- abstention_queue  (RLS applied)
CREATE TABLE abstention_queue (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id),
    query_id     UUID NOT NULL REFERENCES query_log(query_id),
    reviewed     BOOLEAN NOT NULL DEFAULT false,
    reviewer_id  UUID REFERENCES users(user_id),
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Vector Store — ChromaDB

### Version & Selection Rationale

| Decision | Choice | Why |
|---|---|---|
| Mode | Standalone (HTTP client) | Already in `docker-compose.yml`; shared across API replicas |
| Collection strategy | `ek_{tenant_id}_{collection}` | Hard tenant isolation — no cross-tenant vector bleed possible |
| Embedding function | `OpenAIEmbeddingFunction` | Consistent with query embedding; alternatively `SentenceTransformerEmbeddingFunction` for local |
| Distance metric | Cosine | Standard for semantic similarity; configured at collection creation |

### Packages

```
chromadb==0.5.20
```

### Environment Variables

```bash
# .env — ChromaDB
RAG_CHROMA_HOST=localhost          # chroma (in Docker Compose)
RAG_CHROMA_PORT=8000
RAG_CHROMA_PATH=data/chroma_db    # for embedded mode (local dev only)

# Multi-tenancy namespacing:
EKA_CHROMA_COLLECTION_PREFIX=ek   # collections: ek_{tenant_id}_{name}
```

### Collection Initialization (per tenant, at provisioning)

```python
# src/retrieval/vector_store.py  (pattern)
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

client = chromadb.HttpClient(host="chroma", port=8000)

def get_collection(tenant_id: str, collection_name: str = "default"):
    name = f"ek_{tenant_id}_{collection_name}"
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
        embedding_function=OpenAIEmbeddingFunction(
            api_key=settings.openai_api_key,
            model_name=settings.embedding_model,
        ),
    )
```

### ChromaDB Docker Configuration

```yaml
# docker-compose.yml excerpt (no host port — internal only)
chroma:
  image: chromadb/chroma:0.5.20
  container_name: eka-chromadb
  volumes:
    - chroma_data:/chroma/chroma
  environment:
    - ANONYMIZED_TELEMETRY=False
    - CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER=chromadb.auth.token.TokenConfigServerAuthCredentialsProvider
    - CHROMA_SERVER_AUTH_CREDENTIALS=your-chroma-token   # optional auth
    - CHROMA_SERVER_AUTH_PROVIDER=chromadb.auth.token.TokenAuthServerProvider
  healthcheck:
    test: ["CMD-SHELL", "curl -sf http://localhost:8000/api/v1/heartbeat || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
```

> [!IMPORTANT]
> ChromaDB is **never** exposed on a host port. It is reachable only by the `api` and `worker` services over the internal Docker network. This prevents bypassing EKA's auth layer via direct Chroma REST API calls.

### Sizing at 100 docs/tenant

| Metric | Value |
|---|---|
| Docs per tenant | 100 |
| Avg chunks per doc (800 char chunks) | ~50 |
| Max vectors per tenant | ~5,000 |
| Vector dimension (`text-embedding-3-small`) | 1,536 |
| Memory per vector | 1,536 × 4 bytes = 6 KB |
| Total memory per tenant | 5,000 × 6 KB = **~30 MB** |
| 10 tenants | **~300 MB** |

ChromaDB embedded mode comfortably handles this. Standalone mode (current) adds HTTP overhead but supports multi-replica API deployments.

---

## 6. Cache Layer — Redis

### Version & Selection Rationale

| Decision | Choice | Why |
|---|---|---|
| Version | Redis 7.2 | Stable LTS, ACL support, sorted sets for leaderboards |
| Client | `redis-py 5.x` (async via `redis.asyncio`) | Official client, async-native |
| Eviction policy | `allkeys-lru` | Evict least-recently-used keys when memory is full |
| Persistence | `AOF + RDB` | AOF for durability, RDB for fast startup snapshots |

### Packages

```
redis[hiredis]==5.0.8    # hiredis for 10x faster parsing
```

### Environment Variables

```bash
# .env — Redis
REDIS_URL=redis://localhost:6379/0        # redis://redis:6379/0 in Docker
REDIS_PASSWORD=your-redis-password        # set in production; optional in dev

# Key namespacing:
EKA_REDIS_KEY_PREFIX=ek                  # keys: ek:{tenant_id}:{type}:{hash}

# Cache TTLs (seconds):
RAG_CACHE_TTL_SECONDS=3600              # query result cache: 1 hour
RAG_EMBEDDING_CACHE_TTL=86400           # embedding cache: 24 hours
RAG_SESSION_TTL=1800                    # session context: 30 minutes

# Cache backend for embeddings:
RAG_EMBEDDING_CACHE_BACKEND=redis       # redis | lru (lru = existing in-process)

# Max memory (also set in redis.conf):
REDIS_MAX_MEMORY=512mb
```

### Redis Configuration File (`redis.conf`)

```conf
# /etc/redis/redis.conf  (mounted into container)
bind 0.0.0.0
requirepass your-redis-password

maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence:
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000

# Security:
rename-command FLUSHALL ""             # disable dangerous commands in production
rename-command FLUSHDB  ""
rename-command DEBUG    ""
rename-command CONFIG   "CONFIG_SECRET_abc123"

# Logging:
loglevel notice
```

### Cache Key Schema

```
Query result cache:
  ek:{tenant_id}:result:{sha256(query_text + collections + hybrid_alpha + model)}:{user_scope_hmac}

Embedding cache:
  ek:{tenant_id}:emb:{sha256(model_name + text)}

Session context:
  ek:{tenant_id}:session:{session_uuid}

Rate limiting:
  ek:{tenant_id}:ratelimit:{user_id}:{window_start_ts}

Corpus count (for cap enforcement):
  ek:{tenant_id}:doc_count   (integer, invalidated on ingest/archive)
```

### Redis Docker Configuration

```yaml
# docker-compose.yml excerpt
redis:
  image: redis:7.2-alpine
  container_name: eka-redis
  command: redis-server /etc/redis/redis.conf
  volumes:
    - redis_data:/data
    - ./config/redis.conf:/etc/redis/redis.conf:ro
  healthcheck:
    test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

---

## 7. Async Task Layer — Celery

### Version & Selection Rationale

| Decision | Choice | Why |
|---|---|---|
| Task framework | Celery 5.4 | Mature, Django/FastAPI compatible, Redis broker support |
| Broker | Redis (db 1) | Already in stack; simpler ops than RabbitMQ for this scale |
| Result backend | Redis (db 2) | Fast polling for `GET /ingest/jobs/{job_id}` |
| Scheduler | Celery Beat | Built-in, no additional service needed for cron jobs |

### Packages

```
celery[redis]==5.4.0
flower==2.0.1             # Celery monitoring UI (optional, dev only)
```

### Environment Variables

```bash
# .env — Celery
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@localhost:6379/1
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@localhost:6379/2
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
CELERY_ACCEPT_CONTENT=["json"]
CELERY_TIMEZONE=UTC
CELERY_TASK_TRACK_STARTED=true
CELERY_TASK_TIME_LIMIT=3600        # 1 hour hard limit per task
CELERY_TASK_SOFT_TIME_LIMIT=3000   # 50 min soft limit (raises SoftTimeLimitExceeded)
```

### Celery App Initialization

```python
# src/worker/celery_app.py
from celery import Celery

celery_app = Celery(
    "eka",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["src.worker.tasks.ingestion", "src.worker.tasks.evaluation"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Tenant isolation: all tasks must include tenant_id in kwargs
    task_always_eager=False,
)
```

### Defined Tasks

| Task | Module | Trigger | Description |
|---|---|---|---|
| `ingest_documents` | `tasks.ingestion` | `POST /ingest/async` | Chunk, embed, store documents for a tenant |
| `score_query` | `tasks.evaluation` | Post-query async | LLM-as-Judge scoring for sampled queries |
| `weekly_abstention_report` | `tasks.reports` | Celery Beat, Monday 09:00 UTC | Cluster abstained queries, generate report |
| `purge_old_jobs` | `tasks.maintenance` | Celery Beat, daily 02:00 UTC | Delete ingestion_jobs older than 30 days |

### Docker Configuration

```yaml
# docker-compose.yml excerpt
worker:
  build:
    context: .
    dockerfile: Dockerfile.worker
  container_name: eka-worker
  command: celery -A src.worker.celery_app worker --loglevel=info --concurrency=4
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=${REDIS_URL}
    - GROQ_API_KEY=${GROQ_API_KEY}
  depends_on:
    - redis
    - postgres
  restart: unless-stopped

beat:
  build:
    context: .
    dockerfile: Dockerfile.worker
  container_name: eka-beat
  command: celery -A src.worker.celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
  depends_on:
    - redis
    - postgres
  restart: unless-stopped
```

---

## 8. LLM & Embedding Providers

### 8.1 Generation Models (All Free)

| Model ID | Provider | API Key Needed | Context | Recommended For |
|---|---|---|---|---|
| `llama-3.1-70b-versatile` | **Groq** (cloud) | `GROQ_API_KEY` (free) | 128K | **Default — best quality** |
| `llama-3.1-8b-instant` | **Groq** (cloud) | `GROQ_API_KEY` (free) | 128K | Low-latency / high-volume |
| `mixtral-8x7b-32768` | **Groq** (cloud) | `GROQ_API_KEY` (free) | 32K | Long-context documents |
| `gemma2-9b-it` | **Groq** (cloud) | `GROQ_API_KEY` (free) | 8K | Lightweight alternative |
| `llama3.1` | **Ollama** (local) | None | 128K | Offline / air-gapped |
| `mistral` | **Ollama** (local) | None | 32K | Local fallback |
| `gemma2:9b` | **Ollama** (local) | None | 8K | Low-resource local deploy |

```bash
# .env — Generation provider selection
RAG_LLM_PROVIDER=groq                        # groq | ollama
RAG_LLM_MODEL=llama-3.1-70b-versatile       # for Groq
# RAG_LLM_MODEL=llama3.1                    # for Ollama
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx        # REQUIRED for groq provider
OLLAMA_BASE_URL=http://ollama:11434          # REQUIRED for ollama provider
```

### 8.2 Embedding Models (All Free — Local Only)

Embeddings run **entirely locally** via `sentence-transformers`. Zero API calls, zero cost.

| Model | Dimensions | Size | Speed | Recommended For |
|---|---|---|---|---|
| `BAAI/bge-small-en-v1.5` | 384 | 130 MB | Very fast | **Default — best balance** |
| `BAAI/bge-base-en-v1.5` | 768 | 440 MB | Fast | Higher recall needed |
| `all-MiniLM-L6-v2` | 384 | 80 MB | Fastest | Minimal resource environments |
| `nomic-embed-text` (via Ollama) | 768 | 274 MB | Fast | Consistent with Ollama stack |

```bash
# .env — Embeddings (always local)
RAG_EMBEDDING_PROVIDER=local                          # always local — no API key
RAG_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5            # default
# RAG_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5           # higher quality option
```

**First-run model download** (baked into Docker image in `model-cache` stage):
```dockerfile
# Dockerfile model-cache stage — bakes both embedding + reranker models
FROM deps AS model-cache
ARG EMBED_MODEL=BAAI/bge-small-en-v1.5
ARG RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RUN python -c "
from sentence_transformers import SentenceTransformer, CrossEncoder
SentenceTransformer('${EMBED_MODEL}')
CrossEncoder('${RERANKER_MODEL}')
print('Models cached successfully')
"
```

### 8.3 Reranker Model (Free — Local)

```bash
# .env — Reranker
RAG_RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2   # 66MB, default
# Upgrade: BAAI/bge-reranker-large                         # 400MB, better quality
```

### 8.4 Cost Comparison

| Component | Old Stack (OpenAI) | New Stack (Groq + Local) |
|---|---|---|
| Query generation | $0.15–$2.50 / 1M tokens | **$0** |
| Embeddings | $0.02 / 1M tokens | **$0** |
| Reranking | $0 (already local) | **$0** |
| Evaluation judge | $0.15 / 1M tokens | **$0** |
| **Total per 1,000 queries** | ~$0.20–$2.00 | **$0** |

---

## 9. Search & Retrieval Stack

### Packages

```
rank-bm25==0.2.2            # BM25 keyword retrieval (existing)
sentence-transformers==3.1.1 # Embeddings + cross-encoder reranker (existing)
langdetect==1.0.9            # Language detection for multilingual routing (existing)
numpy==1.26.4                # RRF score computation
```

### Configuration

```bash
# .env — Retrieval
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_TOP_K_RETRIEVAL=20         # candidates before reranking
RAG_TOP_K_FINAL=5              # chunks passed to LLM
RAG_HYBRID_ALPHA=0.6           # 1.0 = pure vector, 0.0 = pure BM25
RAG_RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RAG_MAX_CONTEXT_CHARS=12000    # context budget for LLM prompt
RAG_ABSTENTION_THRESHOLD=0.40  # confidence below which system abstains

# Corpus cap:
EKA_MAX_DOCS_PER_TENANT=100
EKA_DOC_CAP_WARN_THRESHOLD=80
```

---

## 10. Observability Stack

### 10.1 OpenTelemetry

```bash
# Required packages:
opentelemetry-sdk==1.27.0
opentelemetry-exporter-otlp==1.27.0
opentelemetry-instrumentation-fastapi==0.48b0
opentelemetry-instrumentation-sqlalchemy==0.48b0
opentelemetry-instrumentation-redis==0.48b0
```

```bash
# .env — OpenTelemetry
MONITOR_ENABLED=true
MONITOR_OTEL_SERVICE_NAME=eka-api
MONITOR_OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318   # Docker internal
MONITOR_OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**All OTel spans tagged with `tenant_id` attribute** — enables per-tenant filtering in Grafana/Jaeger.

### 10.2 Langfuse Tracing

```bash
# .env — Langfuse
MONITOR_LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONITOR_LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MONITOR_LANGFUSE_HOST=https://cloud.langfuse.com
MONITOR_CIRCUIT_BREAKER_THRESHOLD=3
MONITOR_CIRCUIT_BREAKER_COOLDOWN_SECONDS=30.0
```

### 10.3 Prometheus + Grafana (Optional Self-Hosted)

```yaml
# docker-compose.yml (optional observability stack)
prometheus:
  image: prom/prometheus:v2.53.0
  volumes:
    - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:11.1.0
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=your-grafana-password
  volumes:
    - grafana_data:/var/lib/grafana
```

```bash
# .env — Grafana
GRAFANA_ADMIN_PASSWORD=<strong password>
```

---

## 11. API Framework — FastAPI

### Packages

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9       # form uploads (document ingest)
sse-starlette==2.1.3          # SSE streaming (existing /query/stream)
slowapi==0.1.9                # per-tenant rate limiting (new)
```

### Environment Variables

```bash
# .env — FastAPI / API
APP_ENV=development                        # development | staging | production
RAG_LOG_LEVEL=INFO
RAG_CORS_ORIGINS=http://localhost:3000     # Next.js dev server; * for dev
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4                             # number of uvicorn workers (= CPU cores)
RAG_LOG_QUERY_TEXT=false                  # store query plaintext in query_log
```

### Rate Limiting Strategy

```python
# src/api/middleware/rate_limit.py
# Per-tenant: 60 queries/minute for viewer, 120 for curator, unlimited for admin
RATE_LIMITS = {
    "viewer": "60/minute",
    "curator": "120/minute",
    "admin": None,
}
# Key: ek:{tenant_id}:ratelimit:{user_id}:{minute_bucket}
```

---

## 12. Web UI — Next.js

### Version & Stack

| Choice | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 3.x |
| State management | Zustand (lightweight, no Redux overhead) |
| Charts | Recharts (analytics dashboard) |
| Auth client | `next-auth` v5 (JWT session, OIDC integration) |
| HTTP client | `ky` (lightweight fetch wrapper) |

### Packages (package.json)

```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.5.4",
    "tailwindcss": "3.4.7",
    "next-auth": "5.0.0-beta.20",
    "zustand": "4.5.4",
    "recharts": "2.12.7",
    "ky": "1.7.2",
    "@radix-ui/react-dialog": "1.1.1",
    "@radix-ui/react-dropdown-menu": "2.1.1",
    "lucide-react": "0.414.0"
  }
}
```

### Environment Variables (`.env.local` in `ui/` directory)

```bash
# ui/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000    # EKA API base URL
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<output of: openssl rand -base64 32>
NEXT_PUBLIC_TENANT_SLUG=acme-corp               # optional: locks UI to a tenant
```

### Setup

```bash
cd ui/
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir
npm install next-auth zustand recharts ky @radix-ui/react-dialog lucide-react
npm run dev   # starts on http://localhost:3000
```

---

## 13. Infrastructure — Docker & Nginx

### Nginx Configuration

```nginx
# config/nginx.conf
upstream eka_api {
    server api:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-eka-domain.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Per-tenant rate limiting (10 req/s burst 20)
    limit_req_zone $http_x_tenant_id zone=per_tenant:10m rate=10r/s;
    limit_req zone=per_tenant burst=20 nodelay;

    # Block oversized uploads (max 50MB per document)
    client_max_body_size 50M;

    location /api/ {
        proxy_pass         http://eka_api/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # SSE streaming — disable buffering
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://ui:3000;
        proxy_set_header Host $host;
    }
}
```

```bash
# .env — Nginx / TLS
NGINX_TLS_CERT_PATH=/etc/nginx/certs/fullchain.pem
NGINX_TLS_KEY_PATH=/etc/nginx/certs/privkey.pem
# Use Let's Encrypt (certbot) or your corporate CA to generate certs
```

### Docker Multi-Stage Build (Extended)

```dockerfile
# Dockerfile
FROM python:3.11-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM deps AS model-cache
# Bake reranker model into the image — no download at runtime
ARG RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RUN python -c "from sentence_transformers import CrossEncoder; CrossEncoder('${RERANKER_MODEL}')"

FROM model-cache AS runtime
WORKDIR /app
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .
RUN useradd --no-create-home --shell /false eka
USER eka
EXPOSE 8000
CMD ["uvicorn", "src.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

---

## 14. CI/CD — GitHub Actions

### Required Repository Secrets

Set at **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | How to Generate | Used By |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` from console.groq.com | `evaluate.yml` (LLM-as-Judge via Groq) |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` | Integration tests |
| `POSTGRES_PASSWORD` | `openssl rand -hex 16` | `ci.yml` service container |
| `REDIS_PASSWORD` | `openssl rand -hex 16` | `ci.yml` service container |
| `DEPLOY_SSH_KEY` | `ssh-keygen -t ed25519` (private key) | `deploy.yml` |
| `DEPLOY_HOST` | Staging server IP/hostname | `deploy.yml` |
| `DEPLOY_USER` | SSH username on staging server | `deploy.yml` |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` | `docker-publish.yml` |

### CI Workflow Structure

```yaml
# .github/workflows/ci.yml  (structure)
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install ruff mypy
      - run: ruff check src/ tests/
      - run: mypy src/

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - run: pytest tests/unit/ --cov=src --cov-fail-under=85

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: eka_test
          POSTGRES_USER: eka_user
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7.2-alpine
        options: --health-cmd "redis-cli ping"
    steps:
      - run: pytest tests/integration/ -v

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - run: pip install pip-audit bandit
      - run: pip-audit --require-hashes -r requirements.txt
      - run: bandit -r src/ -ll   # medium severity and above

  evaluate:
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration]
    env:
      GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      RAG_LLM_PROVIDER: groq
      RAG_LLM_MODEL: llama-3.1-70b-versatile
      RAG_EMBEDDING_PROVIDER: local
      RAG_EMBEDDING_MODEL: BAAI/bge-small-en-v1.5
    steps:
      - run: python scripts/evaluate.py --hybrid --reranker --fail-on-threshold --export-ci-summary
```

---

## 15. Complete `.env.example`

```bash
# =============================================================================
# Enterprise Knowledge Assistant — Complete Environment Configuration
# Copy to .env and fill in all required values.
# Lines marked REQUIRED must be set. Lines marked OPTIONAL can be left unset.
# =============================================================================

# ─── Application ──────────────────────────────────────────────────────────────
APP_ENV=development                          # development | staging | production

# ─── LLM Providers ───────────────────────────────────────────────────────────
# PRIMARY: Groq (free cloud — get key at console.groq.com, no credit card)
RAG_LLM_PROVIDER=groq                        # groq | ollama
RAG_LLM_MODEL=llama-3.1-70b-versatile       # best quality on Groq free tier
GROQ_API_KEY=gsk_REQUIRED                    # REQUIRED for groq provider
                                             #   get free key: console.groq.com

# FALLBACK: Ollama (local, zero API key, offline-capable)
# Uncomment to switch to local-only mode:
# RAG_LLM_PROVIDER=ollama
# RAG_LLM_MODEL=llama3.1
# OLLAMA_BASE_URL=http://localhost:11434      # http://ollama:11434 in Docker

# ─── Embeddings (always local — no API key, no cost) ─────────────────────────
RAG_EMBEDDING_PROVIDER=local                 # always local
RAG_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5  # 130MB, auto-downloaded at startup
# RAG_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5 # 440MB, higher recall option

# ─── Authentication ───────────────────────────────────────────────────────────
JWT_SECRET_KEY=REQUIRED_run_openssl_rand_hex_32   # REQUIRED
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
JWT_AUDIENCE=eka-api
JWT_ISSUER=eka-auth

# OIDC Federation (leave unset to disable)
# OIDC_PROVIDER_URL=https://accounts.google.com
# OIDC_CLIENT_ID=your-client-id
# OIDC_CLIENT_SECRET=your-client-secret
# OIDC_REDIRECT_URI=https://your-domain.com/auth/callback
# OIDC_ROLE_CLAIM_MAP={"Engineering": "curator", "IT-Admins": "admin", "default": "viewer"}

# Superadmin (seeded at first boot)
EKA_SUPERADMIN_EMAIL=superadmin@yourcompany.com

# ─── Database — PostgreSQL ────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://eka_user:REQUIRED_PASSWORD@localhost:5432/eka_db
DATABASE_URL_READONLY=postgresql+asyncpg://eka_readonly:READONLY_PASSWORD@localhost:5432/eka_db
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800

# ─── Vector Store — ChromaDB ─────────────────────────────────────────────────
RAG_CHROMA_HOST=localhost                    # chroma (in Docker)
RAG_CHROMA_PORT=8000
RAG_CHROMA_PATH=data/chroma_db             # embedded mode only (local dev)
EKA_CHROMA_COLLECTION_PREFIX=ek

# ─── Cache — Redis ────────────────────────────────────────────────────────────
REDIS_URL=redis://:REQUIRED_PASSWORD@localhost:6379/0
REDIS_PASSWORD=REQUIRED_PASSWORD
EKA_REDIS_KEY_PREFIX=ek

RAG_CACHE_TTL_SECONDS=3600
RAG_EMBEDDING_CACHE_TTL=86400
RAG_SESSION_TTL=1800
RAG_EMBEDDING_CACHE_BACKEND=redis           # redis | lru

# ─── Celery — Async Tasks ─────────────────────────────────────────────────────
CELERY_BROKER_URL=redis://:REQUIRED_PASSWORD@localhost:6379/1
CELERY_RESULT_BACKEND=redis://:REQUIRED_PASSWORD@localhost:6379/2
CELERY_TASK_TIME_LIMIT=3600
CELERY_TASK_SOFT_TIME_LIMIT=3000

# ─── Retrieval & Pipeline ────────────────────────────────────────────────────
RAG_DATA_DIR=data
RAG_CHROMA_PATH=data/chroma_db
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_TOP_K_RETRIEVAL=20
RAG_TOP_K_RERANK=5
RAG_TOP_K_FINAL=5
RAG_HYBRID_ALPHA=0.6
RAG_RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
RAG_MAX_CONTEXT_CHARS=12000
RAG_EMBEDDING_QUERY_CACHE_SIZE=256

# ─── Confidence & Abstention ─────────────────────────────────────────────────
RAG_ABSTENTION_THRESHOLD=0.40
RAG_CONFIDENCE_W_RERANKER=0.40
RAG_CONFIDENCE_W_SCORE_GAP=0.20
RAG_CONFIDENCE_W_FAITHFULNESS=0.25
RAG_CONFIDENCE_W_COVERAGE=0.15

# ─── Multi-Tenancy & Corpus Cap ──────────────────────────────────────────────
EKA_MAX_DOCS_PER_TENANT=100
EKA_DOC_CAP_WARN_THRESHOLD=80

# ─── Evaluation ──────────────────────────────────────────────────────────────
RAG_FAITHFULNESS_THRESHOLD=0.70
RAG_EVAL_JUDGE_MODEL=llama-3.1-70b-versatile    # uses GROQ_API_KEY (free)

# ─── API Service ─────────────────────────────────────────────────────────────
APP_ENV=development
RAG_LOG_LEVEL=INFO
RAG_CORS_ORIGINS=http://localhost:3000
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
RAG_LOG_QUERY_TEXT=false                   # true only with legal sign-off

# ─── Monitoring ───────────────────────────────────────────────────────────────
MONITOR_ENABLED=true
MONITOR_LANGFUSE_PUBLIC_KEY=pk-lf-OPTIONAL
MONITOR_LANGFUSE_SECRET_KEY=sk-lf-OPTIONAL
MONITOR_LANGFUSE_HOST=https://cloud.langfuse.com
MONITOR_OTEL_SERVICE_NAME=eka-api
MONITOR_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
MONITOR_CIRCUIT_BREAKER_THRESHOLD=3
MONITOR_CIRCUIT_BREAKER_COOLDOWN_SECONDS=30.0

# ─── UI ───────────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=REQUIRED_run_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 16. Complete `requirements.txt`

```txt
# =============================================================================
# Enterprise Knowledge Assistant — Python Dependencies
# =============================================================================

# ── Configuration ─────────────────────────────────────────────────────────────
pydantic>=2.8.0,<3.0.0
pydantic-settings>=2.4.0
python-dotenv>=1.0.0

# ── API Framework ─────────────────────────────────────────────────────────────
fastapi>=0.115.0
uvicorn[standard]>=0.30.6
python-multipart>=0.0.9        # file uploads
sse-starlette>=2.1.3           # SSE streaming
slowapi>=0.1.9                 # rate limiting

# ── Authentication ────────────────────────────────────────────────────────────
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
authlib>=1.3.1                 # OIDC federation
httpx>=0.27.0                  # async HTTP client

# ── Database — PostgreSQL ─────────────────────────────────────────────────────
sqlalchemy[asyncio]>=2.0.35
asyncpg>=0.29.0
alembic>=1.13.2

# ── Cache — Redis ─────────────────────────────────────────────────────────────
redis[hiredis]>=5.0.8

# ── Async Tasks — Celery ─────────────────────────────────────────────────────
celery[redis]>=5.4.0

# ── Vector Store & Embeddings ─────────────────────────────────────────────────
chromadb>=0.5.20
sentence-transformers>=3.1.1   # embeddings + cross-encoder reranker

# ── Document Ingestion ────────────────────────────────────────────────────────
pypdf>=4.3.0                   # PDF loading
python-docx>=1.1.2             # DOCX loading (new)
markdown>=3.6                  # Markdown parsing

# ── Retrieval ─────────────────────────────────────────────────────────────────
rank-bm25>=0.2.2               # BM25 keyword retrieval
numpy>=1.26.4                  # RRF scoring
langdetect>=1.0.9              # multilingual routing

# ── LLM Providers — Free Backends ────────────────────────────────────────────
groq>=0.9.0                    # Groq cloud API (primary — free tier)
ollama>=0.3.0                  # Ollama local LLM client (fallback)

# ── Observability ─────────────────────────────────────────────────────────────
opentelemetry-sdk>=1.27.0
opentelemetry-exporter-otlp>=1.27.0
opentelemetry-instrumentation-fastapi>=0.48b0
opentelemetry-instrumentation-sqlalchemy>=0.48b0
opentelemetry-instrumentation-redis>=0.48b0
prometheus-client>=0.21.0
langfuse>=2.32.0               # Langfuse tracing SDK

# ── Utilities ─────────────────────────────────────────────────────────────────
tqdm>=4.66.0

# ── Dev / Test (move to requirements-dev.txt if preferred) ───────────────────
# pytest, ruff, mypy, etc. — see requirements-dev.txt
```

---

## 17. Complete `docker-compose.yml`

```yaml
# docker-compose.yml
# Run: docker compose up
# All services communicate over the internal 'eka-network'.
# Only nginx:443 and nginx:80 are exposed to the host.

services:

  # ── Reverse Proxy ────────────────────────────────────────────────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: eka-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - eka-network

  # ── API Service ───────────────────────────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eka-api
    environment:
      - APP_ENV=${APP_ENV:-development}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_ALGORITHM=${JWT_ALGORITHM:-HS256}
      - RAG_CHROMA_HOST=chroma
      - RAG_CHROMA_PORT=8000
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - MONITOR_LANGFUSE_PUBLIC_KEY=${MONITOR_LANGFUSE_PUBLIC_KEY:-}
      - MONITOR_LANGFUSE_SECRET_KEY=${MONITOR_LANGFUSE_SECRET_KEY:-}
      - MONITOR_OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - EKA_MAX_DOCS_PER_TENANT=${EKA_MAX_DOCS_PER_TENANT:-100}
    volumes:
      - ./data:/app/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      chroma:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8000/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - eka-network

  # ── Celery Worker ─────────────────────────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: eka-worker
    command: celery -A src.worker.celery_app worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RAG_CHROMA_HOST=chroma
      - RAG_CHROMA_PORT=8000
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND}
    depends_on:
      - redis
      - postgres
      - chroma
    restart: unless-stopped
    networks:
      - eka-network

  # ── Celery Beat (Scheduler) ───────────────────────────────────────────────────
  beat:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: eka-beat
    command: celery -A src.worker.celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    networks:
      - eka-network

  # ── Vector Store — ChromaDB ───────────────────────────────────────────────────
  chroma:
    image: chromadb/chroma:0.5.20
    container_name: eka-chromadb
    volumes:
      - chroma_data:/chroma/chroma
    # No host port — internal only (security: prevents unauthenticated REST access)
    environment:
      - ANONYMIZED_TELEMETRY=False
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8000/api/v1/heartbeat || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 10s
    networks:
      - eka-network

  # ── Database — PostgreSQL ──────────────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    container_name: eka-postgres
    environment:
      - POSTGRES_DB=eka_db
      - POSTGRES_USER=eka_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01_init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"    # localhost only — not exposed to external network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eka_user -d eka_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - eka-network

  # ── Cache — Redis ──────────────────────────────────────────────────────────────
  redis:
    image: redis:7.2-alpine
    container_name: eka-redis
    command: redis-server /etc/redis/redis.conf
    volumes:
      - redis_data:/data
      - ./config/redis.conf:/etc/redis/redis.conf:ro
    ports:
      - "127.0.0.1:6379:6379"    # localhost only
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - eka-network

volumes:
  chroma_data:
  postgres_data:
  redis_data:
  grafana_data:

networks:
  eka-network:
    driver: bridge
```

---

## 18. Quick-Start Order of Operations

Run these steps **in order** to go from zero to a working local development environment.

```bash
# ── Step 1: Clone and install ─────────────────────────────────────────────────
git clone https://github.com/Ashok007-cmd/production-grade-rag.git
cd production-grade-rag
python -m venv .venv && source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
pip install -e .

# ── Step 2: Configure environment ─────────────────────────────────────────────
cp .env.example .env
# Edit .env — MINIMUM required fields:
#   OPENAI_API_KEY
#   JWT_SECRET_KEY     (openssl rand -hex 32)
#   DATABASE_URL       (postgresql+asyncpg://eka_user:password@localhost:5432/eka_db)
#   REDIS_URL          (redis://:password@localhost:6379/0)
#   REDIS_PASSWORD
#   POSTGRES_PASSWORD
#   CELERY_BROKER_URL  (redis://:password@localhost:6379/1)
#   CELERY_RESULT_BACKEND (redis://:password@localhost:6379/2)

# ── Step 3: Start infrastructure services ────────────────────────────────────
docker compose up postgres redis chroma -d
docker compose ps   # verify all healthy

# ── Step 4: Initialize database ───────────────────────────────────────────────
alembic upgrade head
python scripts/seed_superadmin.py --email admin@yourcompany.com --password changeme

# ── Step 5: Start the API server ──────────────────────────────────────────────
uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000

# ── Step 6: Start Celery worker (new terminal) ────────────────────────────────
celery -A src.worker.celery_app worker --loglevel=info

# ── Step 7: Start the UI (new terminal) ───────────────────────────────────────
cd ui && npm install && npm run dev

# ── Step 8: Verify everything is running ─────────────────────────────────────
curl http://localhost:8000/healthz      # {"status": "ok"}
curl http://localhost:8000/readyz       # {"status": "ready"}
open http://localhost:3000              # Admin UI

# ── Step 9: Create your first tenant and ingest documents ────────────────────
# Login as superadmin at /superadmin/login
# Create a tenant via POST /admin/tenants
# Upload documents via the UI or:
python scripts/ingest.py --source data/sample_docs --tenant-id <your-tenant-id>

# ── Step 10: Run the test suite ───────────────────────────────────────────────
pytest tests/ -v --cov=src
```

### Service Health Check URLs

| Service | URL | Expected |
|---|---|---|
| EKA API | `http://localhost:8000/healthz` | `{"status": "ok"}` |
| EKA API ready | `http://localhost:8000/readyz` | `{"status": "ready"}` |
| EKA metrics | `http://localhost:8000/metrics` | Prometheus text |
| ChromaDB | `http://localhost:8000/api/v1/heartbeat` *(internal only)* | — |
| PostgreSQL | `psql -U eka_user -d eka_db -c '\l'` | Lists databases |
| Redis | `redis-cli -a $REDIS_PASSWORD ping` | `PONG` |
| Next.js UI | `http://localhost:3000` | Admin dashboard |
| Celery | `celery -A src.worker.celery_app inspect ping` | `pong` |

---

*End of Enterprise Knowledge Assistant Technical Stack Reference v1.0*
