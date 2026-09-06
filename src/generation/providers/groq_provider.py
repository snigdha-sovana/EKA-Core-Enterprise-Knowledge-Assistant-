"""Groq Cloud LLM provider implementation."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, AsyncGenerator

from src.config import settings
from src.utils.retry import async_retry_with_backoff, retry_with_backoff
from src.utils.usage import request_usage

logger = logging.getLogger(__name__)


class GroqProvider:
    """LLM provider using Groq Cloud fast inference (OpenAI-compatible)."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.api_key = api_key or settings.groq_api_key or os.environ.get("GROQ_API_KEY", "")
        self.model = model or settings.groq_llm_model
        self.timeout = timeout

    def complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Synchronously complete a prompt using Groq."""
        try:
            from groq import Groq
        except ImportError:
            raise ImportError("groq package required. Install with: pip install groq") from None

        client = Groq(api_key=self.api_key, timeout=self.timeout)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        def _api_call():
            return client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        start_time = time.perf_counter()
        response = retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        if getattr(response, "usage", None):
            prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
            completion_tokens = getattr(response.usage, "completion_tokens", 0)
            tracker = request_usage.get()
            if tracker is not None:
                tracker.add_call(prompt_tokens, completion_tokens, latency)

        return response.choices[0].message.content or ""

    async def complete_async(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Asynchronously complete a prompt using Groq."""
        try:
            from groq import AsyncGroq
        except ImportError:
            raise ImportError("groq package required. Install with: pip install groq") from None

        client = AsyncGroq(api_key=self.api_key, timeout=self.timeout)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async def _api_call():
            return await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        start_time = time.perf_counter()
        response = await async_retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        if getattr(response, "usage", None):
            prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
            completion_tokens = getattr(response.usage, "completion_tokens", 0)
            tracker = request_usage.get()
            if tracker is not None:
                tracker.add_call(prompt_tokens, completion_tokens, latency)

        return response.choices[0].message.content or ""

    async def stream(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Stream token chunks asynchronously."""
        try:
            from groq import AsyncGroq
        except ImportError:
            raise ImportError("groq package required. Install with: pip install groq") from None

        client = AsyncGroq(api_key=self.api_key, timeout=self.timeout)
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        stream_resp = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream_resp:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
