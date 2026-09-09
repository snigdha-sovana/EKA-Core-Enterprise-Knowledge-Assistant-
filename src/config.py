"""Application configuration via environment variables with pydantic-settings."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for Enterprise Knowledge Assistant (EKA).

    Supports both legacy RAG_ prefixed variables and standard EKA variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------- Environment ----------
    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "RAG_APP_ENV"))
    log_level: str = Field(default="INFO", validation_alias=AliasChoices("LOG_LEVEL", "RAG_LOG_LEVEL"))

    # ---------- Paths ----------
    data_dir: Path = Field(default=Path("data"), validation_alias=AliasChoices("RAG_DATA_DIR", "DATA_DIR"))
    chroma_path: Path = Field(default=Path("data/chroma_db"), validation_alias=AliasChoices("RAG_CHROMA_PATH", "CHROMA_PATH"))
    chroma_host: str | None = Field(default=None, validation_alias=AliasChoices("RAG_CHROMA_HOST", "CHROMA_HOST"))
    chroma_port: int | None = Field(default=None, validation_alias=AliasChoices("RAG_CHROMA_PORT", "CHROMA_PORT"))
    golden_dataset_path: Path = Field(default=Path("data/golden_dataset/dataset.jsonl"), validation_alias=AliasChoices("RAG_GOLDEN_DATASET_PATH", "GOLDEN_DATASET_PATH"))
    eval_results_path: Path = Field(default=Path("data/eval_results"), validation_alias=AliasChoices("RAG_EVAL_RESULTS_PATH", "EVAL_RESULTS_PATH"))

    # ---------- Embedding model ----------
    embedding_provider: Literal["local", "openai"] = Field(default="local", validation_alias=AliasChoices("RAG_EMBEDDING_PROVIDER", "EMBEDDING_PROVIDER"))
    embedding_model: str = Field(
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        validation_alias=AliasChoices("RAG_EMBEDDING_MODEL", "EMBEDDING_MODEL"),
    )
    embedding_dim: int = Field(default=384, validation_alias=AliasChoices("RAG_EMBEDDING_DIM", "EMBEDDING_DIM"))
    embedding_query_cache_size: int = Field(default=256, validation_alias=AliasChoices("RAG_EMBEDDING_QUERY_CACHE_SIZE", "EMBEDDING_QUERY_CACHE_SIZE"))

    # ---------- Chunking ----------
    chunk_size: int = Field(default=800, validation_alias=AliasChoices("RAG_CHUNK_SIZE", "CHUNK_SIZE"))
    chunk_overlap: int = Field(default=150, validation_alias=AliasChoices("RAG_CHUNK_OVERLAP", "CHUNK_OVERLAP"))

    # ---------- Ingestion limits ----------
    max_file_size_mb: float = Field(default=50.0, validation_alias=AliasChoices("RAG_MAX_FILE_SIZE_MB", "MAX_FILE_SIZE_MB"))
    max_pdf_pages: int = Field(default=1000, validation_alias=AliasChoices("RAG_MAX_PDF_PAGES", "MAX_PDF_PAGES"))

    # ---------- Generation limits ----------
    max_context_chars: int = Field(default=12000, validation_alias=AliasChoices("RAG_MAX_CONTEXT_CHARS", "MAX_CONTEXT_CHARS"))

    # ---------- Retrieval ----------
    top_k_retrieval: int = Field(default=20, validation_alias=AliasChoices("RAG_TOP_K_RETRIEVAL", "TOP_K_RETRIEVAL"))
    top_k_rerank: int = Field(default=5, validation_alias=AliasChoices("RAG_TOP_K_RERANK", "TOP_K_RERANK"))
    top_k_final: int = Field(default=5, validation_alias=AliasChoices("RAG_TOP_K_FINAL", "TOP_K_FINAL"))

    # Hybrid search
    hybrid_alpha: float = Field(default=0.6, validation_alias=AliasChoices("RAG_HYBRID_ALPHA", "HYBRID_ALPHA"))
    rrf_k: int = Field(default=60, validation_alias=AliasChoices("RAG_RRF_K", "RRF_K"))

    # ---------- Re-ranker ----------
    reranker_model: str = Field(default="BAAI/bge-reranker-large", validation_alias=AliasChoices("RAG_RERANKER_MODEL", "RERANKER_MODEL"))

    # ---------- LLM (Free providers: groq, ollama) ----------
    llm_provider: Literal["groq", "ollama", "openai", "anthropic"] = Field(
        default="ollama",
        validation_alias=AliasChoices("RAG_LLM_PROVIDER", "LLM_PROVIDER"),
    )
    llm_model: str = Field(default="qwen2.5:1.5b", validation_alias=AliasChoices("RAG_LLM_MODEL", "LLM_MODEL"))
    llm_temperature: float = Field(default=0.0, validation_alias=AliasChoices("RAG_LLM_TEMPERATURE", "LLM_TEMPERATURE"))
    llm_max_tokens: int = Field(default=1024, validation_alias=AliasChoices("RAG_LLM_MAX_TOKENS", "LLM_MAX_TOKENS"))

    # Groq Cloud
    groq_api_key: str = Field(default="", validation_alias=AliasChoices("GROQ_API_KEY", "RAG_GROQ_API_KEY"))
    groq_llm_model: str = Field(default="llama-3.1-70b-versatile", validation_alias=AliasChoices("GROQ_LLM_MODEL", "RAG_GROQ_LLM_MODEL"))

    # Ollama Local
    ollama_base_url: str = Field(default="http://localhost:11434", validation_alias=AliasChoices("OLLAMA_BASE_URL", "RAG_OLLAMA_BASE_URL"))
    ollama_llm_model: str = Field(default="qwen2.5:1.5b", validation_alias=AliasChoices("OLLAMA_LLM_MODEL", "RAG_OLLAMA_LLM_MODEL"))

    # Legacy OpenAI / Anthropic keys (kept for fallback compatibility)
    openai_api_key: str = Field(default="", validation_alias=AliasChoices("OPENAI_API_KEY", "RAG_OPENAI_API_KEY"))
    anthropic_api_key: str = Field(default="", validation_alias=AliasChoices("ANTHROPIC_API_KEY", "RAG_ANTHROPIC_API_KEY"))

    # ---------- Database (PostgreSQL 16) ----------
    database_url: str = Field(
        default="postgresql+asyncpg://eka_user:eka_secure_pass_change_in_prod@localhost:5432/eka_db",
        validation_alias=AliasChoices("DATABASE_URL", "RAG_DATABASE_URL"),
    )
    db_pool_size: int = Field(default=10, validation_alias=AliasChoices("DB_POOL_SIZE", "RAG_DB_POOL_SIZE"))
    db_max_overflow: int = Field(default=20, validation_alias=AliasChoices("DB_MAX_OVERFLOW", "RAG_DB_MAX_OVERFLOW"))
    db_pool_timeout: int = Field(default=30, validation_alias=AliasChoices("DB_POOL_TIMEOUT", "RAG_DB_POOL_TIMEOUT"))

    # ---------- Redis ----------
    redis_url: str = Field(default="redis://localhost:6379/0", validation_alias=AliasChoices("REDIS_URL", "RAG_REDIS_URL"))
    redis_cache_ttl_seconds: int = Field(default=3600, validation_alias=AliasChoices("REDIS_CACHE_TTL_SECONDS", "RAG_REDIS_CACHE_TTL_SECONDS"))
    tenant_cache_ttl_seconds: int = Field(default=60, validation_alias=AliasChoices("TENANT_CACHE_TTL_SECONDS", "RAG_TENANT_CACHE_TTL_SECONDS"))

    # ---------- Celery ----------
    celery_broker_url: str = Field(default="redis://localhost:6379/1", validation_alias=AliasChoices("CELERY_BROKER_URL", "RAG_CELERY_BROKER_URL"))
    celery_result_backend: str = Field(default="redis://localhost:6379/2", validation_alias=AliasChoices("CELERY_RESULT_BACKEND", "RAG_CELERY_RESULT_BACKEND"))

    # ---------- Authentication & JWT ----------
    jwt_secret_key: str = Field(
        default="eka-insecure-secret-change-me-32chars-min",
        validation_alias=AliasChoices("JWT_SECRET_KEY", "RAG_JWT_SECRET_KEY"),
    )
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM", "RAG_JWT_ALGORITHM"))
    jwt_expiry_minutes: int = Field(default=60, validation_alias=AliasChoices("JWT_EXPIRY_MINUTES", "RAG_JWT_EXPIRY_MINUTES"))
    jwt_refresh_expiry_days: int = Field(default=7, validation_alias=AliasChoices("JWT_REFRESH_EXPIRY_DAYS", "RAG_JWT_REFRESH_EXPIRY_DAYS"))
    jwt_issuer: str = Field(default="eka-auth", validation_alias=AliasChoices("JWT_ISSUER", "RAG_JWT_ISSUER"))
    jwt_audience: str = Field(default="eka-api", validation_alias=AliasChoices("JWT_AUDIENCE", "RAG_JWT_AUDIENCE"))
    superadmin_audience: str = Field(default="eka-superadmin", validation_alias=AliasChoices("SUPERADMIN_AUDIENCE", "RAG_SUPERADMIN_AUDIENCE"))

    # ---------- Multi-tenancy Limits ----------
    max_docs_per_tenant: int = Field(default=100, validation_alias=AliasChoices("EKA_MAX_DOCS_PER_TENANT", "MAX_DOCS_PER_TENANT"))
    doc_cap_warn_threshold: int = Field(default=80, validation_alias=AliasChoices("EKA_DOC_CAP_WARN_THRESHOLD", "DOC_CAP_WARN_THRESHOLD"))

    # ---------- Rate Limiting ----------
    rate_limit_viewer: str = Field(default="60/minute", validation_alias=AliasChoices("RATE_LIMIT_VIEWER", "RAG_RATE_LIMIT_VIEWER"))
    rate_limit_curator: str = Field(default="120/minute", validation_alias=AliasChoices("RATE_LIMIT_CURATOR", "RAG_RATE_LIMIT_CURATOR"))
    rate_limit_admin: str = Field(default="300/minute", validation_alias=AliasChoices("RATE_LIMIT_ADMIN", "RAG_RATE_LIMIT_ADMIN"))
    rate_limit_auth: str = Field(default="5/minute", validation_alias=AliasChoices("RATE_LIMIT_AUTH", "RAG_RATE_LIMIT_AUTH"))
    rate_limit_anonymous: str = Field(default="20/minute", validation_alias=AliasChoices("RATE_LIMIT_ANONYMOUS", "RAG_RATE_LIMIT_ANONYMOUS"))

    # ---------- Evaluation ----------
    faithfulness_threshold: float = Field(default=0.7, validation_alias=AliasChoices("RAG_FAITHFULNESS_THRESHOLD", "FAITHFULNESS_THRESHOLD"))
    eval_llm_model: str = Field(default="llama-3.1-70b-versatile", validation_alias=AliasChoices("RAG_EVAL_LLM_MODEL", "EVAL_LLM_MODEL"))

    # ---------- API / CLI ----------
    api_url: str = Field(default="http://localhost:8000", validation_alias=AliasChoices("RAG_API_URL", "API_URL"))
    cors_origins: str = Field(default="*", validation_alias=AliasChoices("RAG_CORS_ORIGINS", "CORS_ORIGINS"))


settings = Settings()
