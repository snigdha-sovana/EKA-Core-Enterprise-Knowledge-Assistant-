"""LLM response generation with context injection and source citation."""

from __future__ import annotations

import logging
from typing import Any, Literal

from src.config import settings
from src.generation.llm_client import LLMClient
from src.utils.i18n import _

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = """You are a helpful research assistant. Answer the user's question based ONLY on the provided context. 

For every factual claim you make, you MUST cite the exact source chunk using the numbered references in brackets like [1], [2], etc. Each source maps to the corresponding context chunk provided below.

**Context:**
{context}

**Instructions:**
1. Answer concisely and accurately based ONLY on the provided context.
2. Cite sources for every factual claim using the [number] notation inline. Do NOT generate statements without an inline citation marker.
3. **Hallucination Guardrail:** If the provided context is tangentially related but does not contain sufficient authoritative information to directly answer the question, you MUST abstain. State EXACTLY: "I cannot find sufficient information in the provided documents to answer this question."
4. Do NOT use external knowledge — only the provided context.
"""


class Generator:
    """Generates answers using an LLM, with retrieved context injection.

    Supports Groq, Ollama, OpenAI, and Anthropic as backends.
    """

    def __init__(
        self,
        provider: Literal["groq", "ollama", "openai", "anthropic"] | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> None:
        self.provider = provider or settings.llm_provider
        self.model = model or settings.llm_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._client = LLMClient(provider=self.provider, model=self.model)

    def generate(
        self,
        query: str,
        contexts: list[dict[str, Any]],
        system_prompt: str | None = None,
    ) -> str:
        """Generate an answer from query + retrieved contexts."""
        formatted_context = self._format_context(contexts)
        prompt = (system_prompt or _(DEFAULT_SYSTEM_PROMPT)).format(context=formatted_context)

        return self._client.complete(
            prompt=query,
            system=prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

    async def generate_async(
        self,
        query: str,
        contexts: list[dict[str, Any]],
        system_prompt: str | None = None,
    ) -> str:
        """Generate an answer asynchronously from query + retrieved contexts."""
        formatted_context = self._format_context(contexts)
        prompt = (system_prompt or _(DEFAULT_SYSTEM_PROMPT)).format(context=formatted_context)

        return await self._client.complete_async(
            prompt=query,
            system=prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

    def _format_context(self, contexts: list[dict[str, Any]]) -> str:
        """Format retrieved contexts into numbered references with token/char guardrail."""
        if not contexts:
            return _("No relevant context found.")

        formatted_chunks = []
        total_chars = 0

        for i, ctx in enumerate(contexts, 1):
            doc = ctx.get("document", "").strip()
            source = ctx.get("metadata", {}).get("source", "Unknown")
            page = ctx.get("metadata", {}).get("page", None)
            loc = f" (page {page})" if page else ""
            chunk_str = f"[{i}] From {source}{loc}:\n{doc}"

            if total_chars + len(chunk_str) > settings.max_context_chars:
                logger.warning(
                    "Context exceeded max_context_chars (%d). Truncating remaining chunks.",
                    settings.max_context_chars,
                )
                break

            formatted_chunks.append(chunk_str)
            total_chars += len(chunk_str)

        return "\n\n".join(formatted_chunks)
