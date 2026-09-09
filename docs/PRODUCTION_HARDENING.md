# Production Hardening & Disaster Recovery Runbook
**Enterprise Knowledge Assistant (EKA) & NexoraERP**

---

## 1. Architectural Overview

EKA's Phase 8 Production Hardening enforces an enterprise-grade defense-in-depth model across the edge gateway, application runtime, and persistence layers.

```
                  ┌──────────────────────────────────────────────┐
                  │                 CLIENT / WEB                 │
                  └───────────────────────┬──────────────────────┘
                                          │ HTTPS (Port 443 / 80)
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │        NGINX REVERSE PROXY & GATEWAY        │
                  │  • Edge Rate Limiting (5r/m auth, 10r/s RAG) │
                  │  • Connection Limiting (25 per IP)           │
                  │  • Zero-Buffering SSE Stream Relay           │
                  │  • Security Headers (CSP, HSTS, X-Frame)     │
                  └───────────────┬──────────────┬───────────────┘
                                  │              │
                   /app /assets   │              │ /api /auth /query
                                  ▼              ▼
                    ┌──────────────────┐   ┌───────────────────────────┐
                    │  FRONTEND (Vite) │   │     BACKEND (FastAPI)     │
                    │   React 18 SPA   │   │  • SlowAPI Role RBAC Quotas│
                    │                  │   │  • RFC 6585 429 JSON      │
                    └──────────────────┘   └─────────────┬─────────────┘
                                                         │
                                        ┌────────────────┴───────────────┐
                                        │                                │
                                        ▼                                ▼
                           ┌────────────────────────┐       ┌────────────────────────┐
                           │   POSTGRESQL 16 ACID   │       │   CHROMADB VECTOR DB   │
                           │ Relational + Audit Log │       │ Collections & Embeds   │
                           └────────────┬───────────┘       └────────────┬───────────┘
                                        │                                │
                                        └────────────────┬───────────────┘
                                                         │
                                                         ▼
                                            ┌─────────────────────────┐
                                            │ DISASTER RECOVERY SUITE │
                                            │ • SHA-256 Verification  │
                                            │ • Tarball Bundling      │
                                            │ • Dry-Run Restoration   │
                                            │ • Celery Daily Backup   │
                                            └─────────────────────────┘
```

---

## 2. Nginx Edge Reverse Proxy Configuration

### File Locations
- Master Configuration: `nginx/nginx.conf`
- Virtual Host & Routing: `nginx/conf.d/default.conf`
- Docker Compose: `docker-compose.yml` (service `nginx`)

### Edge Rate Limiting Zones

| Zone Name | Rate Quota | Burst / Policy | Target Path | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `auth_login` | **5 req/min** | `burst=3 nodelay` | `/auth/login` | Brute-force & credential-stuffing prevention |
| `rag_query` | **10 req/sec** | `burst=15 nodelay` | `/query`, `/query/stream` | Vector compute protection & GPU throttling |
| `api_general` | **30 req/sec** | `burst=20 nodelay` | `/api/*`, `/healthz`, docs | General API defense against rogue crawlers |
| `addr_conn` | **25 connections** | Hard limit | Global IP limit | Slowloris and resource exhaustion mitigation |

### SSE Streaming Directives (`/query/stream`)
Real-time RAG token streaming requires unbuffered downstream transmission:
```nginx
location /query/stream {
    proxy_pass http://api_upstream;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_read_timeout 600s;
}
```

### Security Headers Enforced
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- **X-Frame-Options**: `SAMEORIGIN` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing attacks)
- **X-XSS-Protection**: `1; mode=block`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Content-Security-Policy (CSP)**: `default-src 'self'; script-src 'self' 'unsafe-inline'; ...`
- **Server Identity Masking**: `server_tokens off;`

---

## 3. Application Multi-Tier Rate Limiting (FastAPI + SlowAPI)

In addition to edge filtering, the FastAPI runtime implements fine-grained user and role-based quotas in `src/middleware/rate_limit.py`.

### Rate Limit Matrix by Role

| Identity Tier | Quota | Key Strategy | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **Super Admin / Admin** | `300/minute` | `ek:{tenant_id}:user:{user_id}` | Bounded high-capacity operations |
| **Curator** | `120/minute` | `ek:{tenant_id}:user:{user_id}` | Bulk ingestion & knowledge curation |
| **Viewer / Employee** | `60/minute` | `ek:{tenant_id}:user:{user_id}` | Standard departmental inquiry flow |
| **Authentication (/auth/login)** | `5/minute` | `ek:auth:ip:{client_ip}` | Combined IP credential defense |
| **Anonymous / Public** | `20/minute` | `ek:public:ip:{client_ip}` | Minimum access surface |

### RFC 6585 Compliant Error Response
When a client exceeds their allowance, EKA returns HTTP `429 Too Many Requests`:

**Headers:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 5/minute
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1788770000
```

**JSON Body:**
```json
{
  "error": "rate_limit_exceeded",
  "detail": "Too many requests. Please slow down and try again later.",
  "retry_after": 60,
  "path": "/auth/login"
}
```

---

## 4. Automated Disaster Recovery & Backup Suite

### Scripts Manifest
| Script | Command / Path | Purpose |
| :--- | :--- | :--- |
| **PostgreSQL Backup** | `scripts/backup/backup_postgres.py` | Schema & table export (`pg_dump` binary or async SQLAlchemy snapshot fallback) |
| **ChromaDB Backup** | `scripts/backup/backup_chroma.py` | Vector index collection metadata and parquet storage bundle |
| **Master Orchestrator** | `scripts/backup/backup_all.py` | Full DR bundle creation (`.tar.gz`), manifest generation, SHA-256 calculation |
| **Restoration Engine** | `scripts/backup/restore.py` | Checksum verification, manifest extraction, and `--dry-run` validation |
| **POSIX Shell Runner** | `scripts/backup/backup.sh` | Linux/Unix cron wrapper with environment detection |

### Creating a Full Backup Archive
To run a coordinated disaster recovery backup:
```bash
python scripts/backup/backup_all.py --dest data/backups/bundles --retention 7
```
**Artifact Produced:**
- `data/backups/bundles/eka_dr_bundle_<YYYYMMDD_HHMMSS>.tar.gz`
- `data/backups/bundles/eka_dr_bundle_<YYYYMMDD_HHMMSS>.tar.sha256`

### Bundle Manifest Schema (`manifest.json`)
```json
{
  "format": "eka_dr_manifest_v1",
  "backup_id": "dr-20260907_062517",
  "created_at": "2026-09-07T06:25:22.941012+00:00",
  "application": "EKA - Enterprise Knowledge Assistant",
  "retention_days": 7,
  "components": {
    "postgres": {
      "file": "postgres_backup_20260907_062517.sql.gz",
      "size_bytes": 663,
      "sha256": "8462211a9437f2426dadc40f64d0f1570032f8368c7d9831fcef478363a61bcf"
    },
    "chroma": {
      "file": "chroma_backup_20260907_062518.tar.gz",
      "size_bytes": 333,
      "sha256": "ee2d79f0dc2bb1e9b5d4372ea34c8b9985d4f855df348a531a7465e328cadf46"
    }
  },
  "config_snapshot": {
    "chroma_host": "127.0.0.1",
    "chroma_port": 8000,
    "llm_provider": "ollama",
    "llm_model": "qwen2.5:1.5b"
  },
  "status": "SUCCESS"
}
```

---

## 5. Restoration Standard Operating Procedure (SOP)

### Pre-Flight Dry-Run Validation
Before applying any backup archive to an active cluster, always execute a dry-run to verify bundle integrity and individual component hashes:
```bash
python scripts/backup/restore.py data/backups/bundles/eka_dr_bundle_20260907_062517.tar.gz --dry-run
```
Expected output:
```
[INFO] Top-level archive SHA-256 verified successfully: 98b7b0...
[INFO] Manifest loaded: Backup ID: dr-20260907_062517
[INFO] PostgreSQL component checksum verified: 846221...
[INFO] ChromaDB component checksum verified: ee2d79...
[INFO] [DRY-RUN] Validation Successful! Archive is valid and healthy.
```

### Executing Live Disaster Recovery
```bash
python scripts/backup/restore.py data/backups/bundles/eka_dr_bundle_20260907_062517.tar.gz
```

### Automated Background Execution via Celery
In `src/worker/celery_app.py`, Celery Beat executes daily DR backups automatically:
```python
"automated-daily-disaster-recovery-backup": {
    "task": "tasks.run_automated_backup",
    "schedule": 86400.0,
}
```
Backed up bundles older than `retention_days` (default 7 days) are automatically pruned.
