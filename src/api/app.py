"""FastAPI application exposing the Enterprise Knowledge Assistant (EKA) service.

Includes:
- Lifespan management (SQLAlchemy async engine, Redis connection pool)
- JWT Authentication & RBAC (viewer, curator, admin, superadmin)
- Multi-tenancy resolution & tenant isolation middleware
- SlowAPI rate limiting
- Free LLM generation & streaming
- Ingestion & query endpoints with role-based access control
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets
import time
import uuid
from collections import OrderedDict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        CollectorRegistry,
        Counter,
        Histogram,
        generate_latest,
    )
except ImportError:
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

    class CollectorRegistry:
        pass

    class _MockMetric:
        def labels(self, *args, **kwargs):
            return self

        def inc(self, *args, **kwargs):
            pass

        def observe(self, *args, **kwargs):
            pass

    def Counter(*args, **kwargs):
        return _MockMetric()

    def Histogram(*args, **kwargs):
        return _MockMetric()

    def generate_latest(*args, **kwargs):
        return b"# HELP rag_http_requests_total Total HTTP requests\nrag_http_requests_total 1\n"
from datetime import datetime
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.middleware.base import BaseHTTPMiddleware

from src.audit.service import AuditService
from src.auth.dependencies import get_current_user, require_role, require_superadmin
from src.auth.router import router as auth_router
from src.auth.schemas import TokenPayload
from src.cache.redis_client import close_redis, init_redis
from src.config import settings as _settings
from src.db.engine import close_db_engine, get_async_session, init_db_engine
from src.db.models.audit_log import AuditLog
from src.db.models.document import DocumentModel
from src.db.models.user_tenant_role import UserTenantRole
from src.departments.router import router as departments_router
from src.documents.router import router as documents_router
from src.escalation.router import router as escalation_router
from src.escalation.service import EscalationService
from src.generation.citations import CitationFormatter
from src.ingestion.access_control import AccessPolicy
from src.middleware.rate_limit import RateLimitExceeded, _rate_limit_exceeded_handler, limiter
from src.middleware.tenant import TenantResolutionMiddleware
from src.pipeline import RAGPipeline
from src.retrieval.access_filter import UserContext
from src.utils.i18n import _

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lifespan Management
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown resources."""
    logger.info("Initializing EKA database engine and Redis pool...")
    try:
        await init_db_engine()
    except Exception as exc:
        logger.warning("DB engine startup notice: %s", exc)

    try:
        await init_redis()
    except Exception as exc:
        logger.warning("Redis startup notice: %s", exc)

    yield

    logger.info("Cleaning up EKA database and Redis resources...")
    try:
        await close_redis()
    except Exception as exc:
        logger.warning("Error closing Redis: %s", exc)

    try:
        await close_db_engine()
    except Exception as exc:
        logger.warning("Error closing DB engine: %s", exc)


# ---------------------------------------------------------------------------
# Locale Configuration
# ---------------------------------------------------------------------------


async def setup_locale(accept_language: str | None = Header(None)):
    import gettext
    from src.utils.i18n import _current_translation

    lang = "en"
    if accept_language:
        parts = [p.split(";")[0].split("-")[0].strip().lower() for p in accept_language.split(",")]
        for p in parts:
            if p in ["de", "es", "en"]:
                lang = p
                break

    try:
        translation = gettext.translation(
            domain="messages",
            localedir=str(Path(__file__).parent.parent / "locale"),
            languages=[lang],
            fallback=True,
        )
    except Exception:
        translation = gettext.NullTranslations()

    token = _current_translation.set(translation)
    try:
        yield
    finally:
        _current_translation.reset(token)


# ---------------------------------------------------------------------------
# FastAPI App Initialization
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Enterprise Knowledge Assistant (EKA) API",
    version="2.0.0",
    description="Multi-tenant Enterprise Knowledge Assistant with JWT Auth, RBAC, and Hybrid Search.",
    dependencies=[Depends(setup_locale)],
    lifespan=lifespan,
)

# Attach SlowAPI rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Middlewares
# ---------------------------------------------------------------------------


class _RequestIDMiddleware(BaseHTTPMiddleware):
    """Propagate or generate a unique X-Request-ID for every request."""

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


app.add_middleware(_RequestIDMiddleware)
app.add_middleware(TenantResolutionMiddleware)

# Prometheus metrics setup
_metrics_registry = CollectorRegistry()
_http_requests_total = Counter(
    "rag_http_requests_total",
    "Total HTTP requests handled, by path and status code",
    ["path", "method", "status_code"],
    registry=_metrics_registry,
)
_http_request_duration_seconds = Histogram(
    "rag_http_request_duration_seconds",
    "HTTP request duration in seconds, by path",
    ["path", "method"],
    registry=_metrics_registry,
)


class _PrometheusMiddleware(BaseHTTPMiddleware):
    """Record request count and latency for every request, keyed by route."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        route = request.scope.get("route")
        path = getattr(route, "path", request.url.path)

        _http_requests_total.labels(
            path=path, method=request.method, status_code=response.status_code
        ).inc()
        _http_request_duration_seconds.labels(path=path, method=request.method).observe(duration)
        return response


app.add_middleware(_PrometheusMiddleware)

_cors_origins_raw = _settings.cors_origins
_cors_origins: list[str] = (
    ["*"]
    if _cors_origins_raw.strip() == "*"
    else [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(departments_router)
app.include_router(escalation_router)

# ---------------------------------------------------------------------------
# Upstream Provider Error Handlers
# ---------------------------------------------------------------------------
try:
    import openai

    @app.exception_handler(openai.RateLimitError)
    async def openai_rate_limit_handler(request: Request, exc: openai.RateLimitError):
        return Response(
            status_code=429,
            content='{"detail": "Rate limit exceeded on upstream LLM provider API."}',
            media_type="application/json",
        )

    @app.exception_handler(openai.APIConnectionError)
    async def openai_connection_handler(request: Request, exc: openai.APIConnectionError):
        return Response(
            status_code=503,
            content='{"detail": "Failed to connect to upstream LLM provider API."}',
            media_type="application/json",
        )

    @app.exception_handler(openai.APIStatusError)
    async def openai_status_handler(request: Request, exc: openai.APIStatusError):
        status_code = 502
        if exc.status_code == 429:
            status_code = 429
        return Response(
            status_code=status_code,
            content=f'{{"detail": "Upstream LLM provider returned error status: {exc.status_code}."}}',
            media_type="application/json",
        )
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Pipeline Singleton
# ---------------------------------------------------------------------------
_pipeline: RAGPipeline | None = None


def get_pipeline() -> RAGPipeline:
    """Return the shared RAGPipeline instance, constructing it on first use."""
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline


def reset_pipeline() -> None:
    """Drop the cached pipeline singleton so it is rebuilt on next access."""
    global _pipeline
    _pipeline = None


# ---------------------------------------------------------------------------
# Pydantic Request & Response Models
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str


class StatsResponse(BaseModel):
    chunks_in_store: int
    embedding_model: str
    llm_provider: str
    llm_model: str
    chunk_size: int
    chunk_overlap: int
    embedding_cache_hits: int
    embedding_cache_misses: int


class IngestRequest(BaseModel):
    source: str = Field(..., description="Path to a file or directory to ingest.")
    title: str | None = Field(None, description="Human-readable title of the document.")
    access_policy: AccessPolicy | None = Field(
        None, description="Access control policy governing chunk-level permissions."
    )
    reset: bool = Field(False, description="If true, clear the vector store before ingesting.")


class IngestResponse(BaseModel):
    document_id: str | None = None
    chunks_ingested: int
    total_chunks: int


class IngestJobResponse(BaseModel):
    job_id: str
    status: str


class IngestJobStatusResponse(BaseModel):
    job_id: str
    status: str
    chunks_ingested: int | None = None
    total_chunks: int | None = None
    error: str | None = None


class QueryRequest(BaseModel):
    question: str
    top_k: int | None = None
    use_hybrid: bool = False
    use_reranker: bool = False


class CitationResponse(BaseModel):
    chunk_id: str
    source: str
    filename: str
    text_snippet: str
    score: float
    rerank_score: float | None = None


class QueryResponse(BaseModel):
    answer: str
    citations: list[CitationResponse]
    abstained: bool = False
    confidence_score: float | None = None
    # Escalation fields — populated when abstention triggers a forwarded case
    status: str | None = None
    case_id: uuid.UUID | None = None
    department_name: str | None = None


# ---------------------------------------------------------------------------
# System Endpoints
# ---------------------------------------------------------------------------


@app.get("/healthz", response_model=HealthResponse)
def healthz() -> HealthResponse:
    """Lightweight liveness check that does not load heavy models."""
    return HealthResponse(status="ok")


@app.get("/readyz", response_model=HealthResponse)
def readyz() -> HealthResponse:
    """Readiness probe checking database access and eager-loading models."""
    try:
        try:
            import rank_bm25  # noqa: F401
            import sentence_transformers  # noqa: F401
        except ImportError:
            pass

        pipeline = get_pipeline()
        for lang in ["en", "de", "es"]:
            _ = pipeline._get_vector_store(lang)
            _ = pipeline._get_hybrid_retriever(lang)
        _ = pipeline._get_reranker()

        return HealthResponse(status="ok")
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Service not ready.",
        ) from exc


@app.get("/metrics")
def metrics() -> Response:
    """Prometheus scrape endpoint: request counts and latency histograms by route."""
    return Response(
        content=generate_latest(_metrics_registry),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.get("/stats", response_model=StatsResponse)
def stats(user: TokenPayload = Depends(require_role("viewer", "curator", "admin"))) -> dict[str, Any]:
    """Return pipeline statistics for the authenticated tenant."""
    pipeline = get_pipeline()
    return pipeline.stats()


# ---------------------------------------------------------------------------
# Admin Endpoints
# ---------------------------------------------------------------------------


@app.get("/admin/users", dependencies=[Depends(require_role("admin"))])
async def list_tenant_users(
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[dict[str, Any]]:
    """List all users with roles in the current tenant (admin only)."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = (
        select(UserTenantRole)
        .where(UserTenantRole.tenant_id == tenant_uuid)
        .options(selectinload(UserTenantRole.user))
    )
    result = await session.execute(stmt)
    roles = result.scalars().all()

    return [
        {
            "user_id": str(r.user.user_id),
            "email": r.user.email,
            "display_name": r.user.display_name,
            "role": r.role,
            "is_active": r.user.is_active,
            "granted_at": r.granted_at.isoformat() if r.granted_at else None,
        }
        for r in roles
        if r.user
    ]


class AuditLogResponse(BaseModel):
    event_id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID | None = None
    action: str
    document_id: uuid.UUID | None = None
    chunk_ids: list[str]
    query_hash: str | None = None
    ip_address: str | None = None
    created_at: datetime


@app.get(
    "/admin/audit-logs",
    response_model=list[AuditLogResponse],
    dependencies=[Depends(require_role("admin"))],
)
async def list_audit_logs(
    action: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[AuditLogResponse]:
    """List audit log events for the current tenant (admin only)."""
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID.")

    stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_uuid)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

    result = await session.execute(stmt)
    logs = result.scalars().all()

    return [
        AuditLogResponse(
            event_id=log.event_id,
            tenant_id=log.tenant_id,
            user_id=log.user_id,
            action=log.action,
            document_id=log.document_id,
            chunk_ids=log.chunk_ids or [],
            query_hash=log.query_hash,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]


# ---------------------------------------------------------------------------
# Ingestion Endpoints (curator or admin role required)
# ---------------------------------------------------------------------------


def _resolve_ingest_source(source: str) -> Path:
    """Validate and resolve an ingest source path confined to the data directory."""
    try:
        source_path = Path(source).resolve(strict=False)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid path: {exc}") from exc

    allowed_root = Path(_settings.data_dir).resolve()
    try:
        source_path.relative_to(allowed_root)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Path must be inside the configured data directory ({allowed_root}).",
        ) from None

    if not source_path.exists():
        raise HTTPException(
            status_code=400,
            detail=_("Source path does not exist: {source_path}").format(source_path=source),
        )

    return source_path


@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    request: IngestRequest,
    raw_request: Request,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> IngestResponse:
    """Ingest documents from a file or directory into the vector store."""
    source_path = _resolve_ingest_source(request.source)
    pipeline = get_pipeline()

    tenant_uuid = None
    user_uuid = None
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
        user_uuid = uuid.UUID(user.sub)
    except (ValueError, AttributeError):
        pass

    # Check tenant document quota (maximum 100 active documents per tenant)
    if tenant_uuid is not None:
        try:
            stmt = (
                select(func.count())
                .select_from(DocumentModel)
                .where(
                    DocumentModel.tenant_id == tenant_uuid,
                    DocumentModel.status == "active",
                )
            )
            result = await session.execute(stmt)
            active_count = result.scalar() or 0
            if active_count >= 100:
                raise HTTPException(
                    status_code=400,
                    detail="Tenant document limit reached (maximum 100 active documents). Please archive or delete existing documents before ingesting new ones.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Could not check document quota: %s", exc)

    if request.reset:
        await asyncio.to_thread(pipeline.reset)

    doc_id = str(uuid.uuid4())
    try:
        chunks_ingested = await asyncio.to_thread(
            pipeline.ingest,
            source_path,
            title=request.title,
            access_policy=request.access_policy,
            tenant_id=user.tenant_id,
            doc_id=doc_id,
        )
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Record document tracking record and audit event
    if tenant_uuid is not None:
        try:
            policy_dict = (
                request.access_policy.model_dump()
                if request.access_policy
                else {"is_public": True}
            )
            file_size = source_path.stat().st_size if source_path.is_file() else 0
            doc_record = DocumentModel(
                doc_id=uuid.UUID(doc_id),
                tenant_id=tenant_uuid,
                owner_id=user_uuid,
                filename=source_path.name,
                title=request.title or source_path.stem,
                mime_type="text/plain",
                file_size_bytes=file_size,
                chunk_count=chunks_ingested,
                status="active",
                access_policy=policy_dict,
                created_by=user_uuid,
            )
            session.add(doc_record)
            await session.flush()

            client_ip = raw_request.client.host if raw_request.client else None
            await AuditService.log_event(
                session=session,
                tenant_id=tenant_uuid,
                user_id=user_uuid,
                action="document_ingest",
                document_id=uuid.UUID(doc_id),
                ip_address=client_ip,
            )
        except Exception as exc:
            logger.warning("Could not record document tracking record: %s", exc)

    stats_res = await asyncio.to_thread(pipeline.stats)
    total_chunks = stats_res["chunks_in_store"]
    return IngestResponse(
        document_id=doc_id,
        chunks_ingested=chunks_ingested,
        total_chunks=total_chunks,
    )


_INGEST_JOBS_MAX = 500
_ingest_jobs: OrderedDict[str, dict[str, Any]] = OrderedDict()
_background_ingest_tasks: set[asyncio.Task[None]] = set()


def _record_ingest_job(job_id: str, **fields: Any) -> None:
    _ingest_jobs[job_id] = {**_ingest_jobs.get(job_id, {}), **fields}
    _ingest_jobs.move_to_end(job_id)
    while len(_ingest_jobs) > _INGEST_JOBS_MAX:
        _ingest_jobs.popitem(last=False)


async def _run_ingest_job(
    job_id: str,
    source_path: Path,
    reset: bool,
    title: str | None = None,
    access_policy: Any = None,
    tenant_id: str | None = None,
) -> None:
    _record_ingest_job(job_id, status="running")
    try:
        pipeline = get_pipeline()
        if reset:
            await asyncio.to_thread(pipeline.reset)
        doc_id = str(uuid.uuid4())
        chunks_ingested = await asyncio.to_thread(
            pipeline.ingest,
            source_path,
            title=title,
            access_policy=access_policy,
            tenant_id=tenant_id,
            doc_id=doc_id,
        )
        stats_res = await asyncio.to_thread(pipeline.stats)
        _record_ingest_job(
            job_id,
            status="completed",
            chunks_ingested=chunks_ingested,
            total_chunks=stats_res["chunks_in_store"],
            document_id=doc_id,
        )
    except Exception as exc:
        logger.warning("Ingest job %s failed: %s", job_id, exc)
        _record_ingest_job(job_id, status="failed", error=str(exc))


@app.post("/ingest/async", response_model=IngestJobResponse, status_code=202)
async def ingest_async(
    request: IngestRequest,
    user: TokenPayload = Depends(require_role("curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> IngestJobResponse:
    """Enqueue ingestion as a background job and return immediately."""
    source_path = _resolve_ingest_source(request.source)

    # Check tenant document quota (maximum 100 active documents per tenant)
    try:
        tenant_uuid = uuid.UUID(user.tenant_id)
        stmt = (
            select(func.count())
            .select_from(DocumentModel)
            .where(
                DocumentModel.tenant_id == tenant_uuid,
                DocumentModel.status == "active",
            )
        )
        result = await session.execute(stmt)
        active_count = result.scalar() or 0
        if active_count >= 100:
            raise HTTPException(
                status_code=400,
                detail="Tenant document limit reached (maximum 100 active documents). Please archive or delete existing documents before ingesting new ones.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Could not check document quota for async ingest: %s", exc)

    job_id = str(uuid.uuid4())
    _record_ingest_job(job_id, status="pending")

    task = asyncio.create_task(
        _run_ingest_job(
            job_id,
            source_path,
            request.reset,
            title=request.title,
            access_policy=request.access_policy,
            tenant_id=user.tenant_id,
        )
    )
    _background_ingest_tasks.add(task)
    task.add_done_callback(_background_ingest_tasks.discard)

    return IngestJobResponse(job_id=job_id, status="pending")


@app.get("/ingest/jobs/{job_id}", response_model=IngestJobStatusResponse)
def get_ingest_job(
    job_id: str,
    user: TokenPayload = Depends(require_role("curator", "admin")),
) -> IngestJobStatusResponse:
    """Return the current status of an async ingestion job."""
    job = _ingest_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="No ingest job found with that ID.")
    return IngestJobStatusResponse(job_id=job_id, **job)


# ---------------------------------------------------------------------------
# Query Endpoints (viewer, curator, admin roles allowed)
# ---------------------------------------------------------------------------


@app.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    raw_request: Request,
    response: Response,
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> QueryResponse:
    """Answer a question using the RAG pipeline."""
    from src.utils.usage import UsageTracker, request_usage

    tracker = UsageTracker()
    token = request_usage.set(tracker)

    user_context = UserContext(
        user_id=user.sub,
        tenant_id=user.tenant_id,
        roles=user.roles,
        is_superadmin=user.is_superadmin,
    )

    try:
        pipeline = get_pipeline()

        try:
            answer, citations, abstained, confidence_score = await pipeline.query_async(
                request.question,
                top_k=request.top_k,
                use_hybrid=request.use_hybrid,
                use_reranker=request.use_reranker,
                user=user_context,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        citation_responses = [
            CitationResponse(
                chunk_id=c["chunk_id"],
                source=c["source"],
                filename=c["filename"],
                text_snippet=c["text_snippet"],
                score=c["score"],
                rerank_score=c.get("rerank_score"),
            )
            for c in CitationFormatter.to_dict(citations)
        ]

        # Audit logging for permissioned retrieval
        try:
            chunk_ids = [c["chunk_id"] for c in CitationFormatter.to_dict(citations)]
            client_ip = raw_request.client.host if raw_request.client else None
            await AuditService.log_event(
                session=session,
                tenant_id=user.tenant_id,
                user_id=user.sub,
                action="query",
                chunk_ids=chunk_ids,
                query_text=request.question,
                ip_address=client_ip,
            )
        except Exception as exc:
            logger.warning("Could not record query audit event: %s", exc)

        # Token usage and retrieval mode response headers
        mode = "hybrid+reranker" if (request.use_hybrid and request.use_reranker) else ("hybrid" if request.use_hybrid else ("reranker" if request.use_reranker else "dense"))
        response.headers["X-RAG-Retrieval-Mode"] = mode
        response.headers["X-RAG-Prompt-Tokens"] = str(tracker.prompt_tokens)
        response.headers["X-RAG-Completion-Tokens"] = str(tracker.completion_tokens)
        response.headers["X-RAG-Total-Tokens"] = str(tracker.total_tokens)
        response.headers["X-RAG-LLM-Latency-Sec"] = f"{tracker.total_latency:.4f}"

        # If abstained, create an escalation case and return forwarding payload
        if abstained:
            try:
                escalation = await EscalationService.handle_abstention(
                    session=session,
                    tenant_id=user.tenant_id,
                    user_id=user.sub,
                    query_text=request.question,
                    confidence_score=confidence_score,
                    generator=pipeline.generator,
                )
            except Exception as exc:
                logger.warning("Escalation case creation failed: %s", exc)
                escalation = {}

            forwarded_msg = (
                "Query forwarded — not enough resources in the knowledge base. "
                f"A support case has been created (ID: {escalation.get('case_id', 'N/A')})."
            )
            return QueryResponse(
                answer=forwarded_msg,
                citations=[],
                abstained=True,
                confidence_score=confidence_score,
                status=escalation.get("status"),
                case_id=escalation.get("case_id"),
                department_name=escalation.get("department_name"),
            )

        return QueryResponse(
            answer=answer,
            citations=citation_responses,
            abstained=abstained,
            confidence_score=confidence_score,
        )
    finally:
        request_usage.reset(token)


@app.post("/query/stream")
async def query_stream(
    request: QueryRequest,
    user: TokenPayload = Depends(require_role("viewer", "curator", "admin")),
    session: AsyncSession = Depends(get_async_session),
) -> StreamingResponse:
    """Answer a question and stream tokens via Server-Sent Events (SSE)."""
    pipeline = get_pipeline()

    user_context = UserContext(
        user_id=user.sub,
        tenant_id=user.tenant_id,
        roles=user.roles,
        is_superadmin=user.is_superadmin,
    )

    async def _event_stream() -> AsyncGenerator[str, None]:
        try:
            question = request.question.strip()
            if not question:
                yield f"data: {json.dumps({'error': 'Question must not be empty.'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            if len(question) > RAGPipeline.MAX_QUESTION_LENGTH:
                yield f"data: {json.dumps({'error': 'Question exceeds maximum length.'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            k = request.top_k or _settings.top_k_final

            contexts = await asyncio.to_thread(
                pipeline._retrieve,
                question,
                use_hybrid=request.use_hybrid,
                use_reranker=request.use_reranker,
                k=k,
                user=user_context,
            )

            if not contexts:
                no_context_msg = (
                    "I could not find any relevant information in the knowledge "
                    "base to answer your question."
                )
                yield f"data: {json.dumps({'token': no_context_msg})}\n\n"
                yield f"data: {json.dumps({'citations': []})}\n\n"
                yield "data: [DONE]\n\n"
                return

            if request.use_reranker:
                contexts = await asyncio.to_thread(
                    pipeline._apply_reranker, question, contexts, top_k=k
                )

            # Phase 4: Abstention threshold logic
            confidence_score = 0.0
            if contexts:
                confidence_score = max(
                    (c.get("rerank_score") if c.get("rerank_score") is not None else c.get("score", 0.0)) 
                    for c in contexts
                )

            if confidence_score < 0.3:
                # Centralized abstention: create escalation case
                try:
                    escalation = await EscalationService.handle_abstention(
                        session=session,
                        tenant_id=user.tenant_id,
                        user_id=user.sub,
                        query_text=question,
                        confidence_score=confidence_score,
                        generator=pipeline.generator,
                    )
                except Exception as esc_exc:
                    logger.warning("Escalation case creation failed in stream: %s", esc_exc)
                    escalation = {}

                forwarded_msg = (
                    "Query forwarded — not enough resources in the knowledge base. "
                    f"A support case has been created (ID: {escalation.get('case_id', 'N/A')})."
                )
                yield f"data: {json.dumps({'token': forwarded_msg})}\n\n"
                yield f"data: {json.dumps({'citations': [], 'abstained': True, 'confidence_score': round(confidence_score, 4), 'status': escalation.get('status'), 'case_id': escalation.get('case_id'), 'department_name': escalation.get('department_name')})}\n\n"
                yield "data: [DONE]\n\n"
                return

            contexts = pipeline._apply_context_budget(contexts)

            # Stream tokens
            if hasattr(pipeline.generator, "generate_stream"):
                async for chunk in pipeline.generator.generate_stream(question, contexts):
                    yield f"data: {json.dumps({'token': chunk})}\n\n"
            else:
                answer = await pipeline.generator.generate_async(question, contexts)
                yield f"data: {json.dumps({'token': answer})}\n\n"

            # Emit citations
            citations = pipeline.citation_formatter.build_citations(contexts)
            citation_dicts = CitationFormatter.to_dict(citations)
            yield f"data: {json.dumps({'citations': citation_dicts, 'abstained': False, 'confidence_score': round(confidence_score, 4)})}\n\n"

        except ValueError as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        except Exception as exc:
            logger.exception("Error in streaming response: %s", exc)
            yield f"data: {json.dumps({'error': 'Internal server error during streaming.'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
