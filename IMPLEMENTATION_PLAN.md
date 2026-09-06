# ERP Knowledge Assistant Implementation Plan

## Implemented for local development

- The default generator is now Ollama with `qwen2.5:1.5b`, a CPU-friendly local model appropriate for the current 16 GB RAM, Intel i3 development machine.
- The default embedding model remains `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`; it is lightweight and multilingual, so no vector-database migration is required.
- Run `ollama pull qwen2.5:1.5b` before starting the API. The model name is configurable with `RAG_LLM_MODEL` and `OLLAMA_LLM_MODEL`.
- Do not commit a real `.env` file. Copy `.env.example` to `.env` and keep local service URLs and secrets there.

## Target ERP architecture

1. Deploy each enterprise in its own customer-managed environment (on-premises or a private cloud/VPC) instead of collecting company knowledge in a shared public portal.
2. Integrate the assistant into the ERP dashboard and use ERP SSO/OIDC or SAML identity, rather than a separate employee login.
3. Ingest ERP data through least-privilege, read-only connectors. Track each source record's ID, version/hash, last synchronization time, and deletion state.
4. Use ERP webhooks for prompt updates where available and run a Celery Beat reconciliation job every two weeks. Re-index only changed or deleted records; do not retrain the language model.
5. Keep PostgreSQL, the vector store, model service, and audit records inside the enterprise network boundary. Use a private/self-hosted model endpoint for sensitive HR and Finance content.

## Department knowledge and human review

1. Add tenant-scoped departments with one existing tenant-admin owner and one required fallback department per enterprise.
2. Tag ingested ERP records, document metadata, and vector chunks with an optional `department_id`; preserve shared enterprise documents.
3. Search the employee's authorized enterprise knowledge first. On empty retrieval or confidence below the abstention threshold, classify the unsupported query to the best configured department with an LLM structured-output prompt.
4. Create a durable escalation case, assign it to the selected department owner, and return `Query forwarded — not enough resources.` with `status: "forwarded"` and a case ID.
5. If classification fails, create the case for the tenant's configured fallback owner and record `classification_failed`.
6. Give tenant admins an escalation queue. A case can only be resolved after the assigned department uploads and indexes a new source document linked to that case.

## Multilingual roadmap

1. Extend language detection beyond the current English, German, and Spanish routing; never silently force an unsupported user language to English.
2. Keep answers in the user's language while retaining source citations and technical names.
3. Benchmark the local stack with representative HR, Finance, and Project questions in each required language.
4. For a GPU-backed private production deployment, evaluate `BAAI/bge-m3` (1024-dimensional embeddings) with a multilingual reranker and `Qwen2.5-7B-Instruct` or `Qwen2.5-14B-Instruct` for generation. Switching embedding models requires recreating Chroma collections and re-indexing all documents.

## Next implementation steps

1. Add database migrations and APIs for departments, department owners, escalation cases, and case resolution.
2. Centralize abstention handling so `/query` and `/query/stream` create the same forwarded case exactly once.
3. Extend document ingestion, async ingestion, ACL metadata, and retrieval filters with department/project identifiers.
4. Build a mock ERP connector and dashboard views for employee chat, knowledge-base sync state, department escalation queues, and audit history.
5. Add incremental synchronization with webhook support, a two-week Celery Beat reconciliation task, retries, idempotency, and deletion handling.
6. Add integration tests for authorization, multilingual queries, mixed-department retrieval, forwarding, fallback routing, source-linked resolution, and ERP synchronization.
