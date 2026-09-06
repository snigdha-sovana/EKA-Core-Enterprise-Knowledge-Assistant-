"""Ollama local LLM provider implementation."""

from __future__ import annotations

import logging
import time
from typing import Any, AsyncGenerator

import httpx

from src.config import settings
from src.utils.retry import async_retry_with_backoff, retry_with_backoff
from src.utils.usage import request_usage

logger = logging.getLogger(__name__)


class OllamaProvider:
    """LLM provider using local Ollama instance."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.model = model or settings.ollama_llm_model
        self.timeout = timeout

    def complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Synchronously complete a prompt using Ollama."""
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        def _api_call():
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/api/chat", json=payload)
                res.raise_for_status()
                return res.json()

        start_time = time.perf_counter()
        data = retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        prompt_tokens = data.get("prompt_eval_count", 0)
        completion_tokens = data.get("eval_count", 0)
        tracker = request_usage.get()
        if tracker is not None:
            tracker.add_call(prompt_tokens, completion_tokens, latency)

        message = data.get("message", {})
        return message.get("content", "")

    async def complete_async(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Asynchronously complete a prompt using Ollama."""
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        async def _api_call():
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                res.raise_for_status()
                return res.json()

        start_time = time.perf_counter()
        data = await async_retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        prompt_tokens = data.get("prompt_eval_count", 0)
        completion_tokens = data.get("eval_count", 0)
        tracker = request_usage.get()
        if tracker is not None:
            tracker.add_call(prompt_tokens, completion_tokens, latency)

        message = data.get("message", {})
        return message.get("content", "")

    async def stream(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> AsyncGenerator[str, None]:
        """Stream token chunks asynchronously from Ollama."""
        import json

        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
