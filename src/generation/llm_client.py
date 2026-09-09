"""Shared LLM provider client (Groq / Ollama / OpenAI / Anthropic) with retry handling.

Centralizes the provider dispatch + retry logic across Generator, FaithfulnessScorer,
and AnswerRelevanceScorer.
"""

from __future__ import annotations

import logging
from typing import Literal

from src.generation.providers.groq_provider import GroqProvider
from src.generation.providers.ollama_provider import OllamaProvider
from src.utils.retry import async_retry_with_backoff, retry_with_backoff

logger = logging.getLogger(__name__)


class LLMClient:
    """Thin wrapper around LLM backends (Groq, Ollama, OpenAI, Anthropic).

    Args:
        provider: "groq", "ollama", "openai", or "anthropic".
        model: Model name passed to the provider API.
        timeout: Per-request timeout in seconds.
    """

    def __init__(
        self,
        provider: Literal["groq", "ollama", "openai", "anthropic"] = "groq",
        model: str = "llama-3.1-70b-versatile",
        timeout: float = 60.0,
    ) -> None:
        self.provider = provider
        self.model = model
        self.timeout = timeout
        self._groq_provider: GroqProvider | None = None
        self._ollama_provider: OllamaProvider | None = None

    def complete(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Generate a completion for ``prompt``, optionally with a system prompt."""
        if self.provider == "groq":
            if self._groq_provider is None:
                self._groq_provider = GroqProvider(model=self.model, timeout=self.timeout)
            return self._groq_provider.complete(prompt, system, temperature, max_tokens)
        elif self.provider == "ollama":
            if self._ollama_provider is None:
                self._ollama_provider = OllamaProvider(model=self.model, timeout=self.timeout)
            return self._ollama_provider.complete(prompt, system, temperature, max_tokens)
        elif self.provider == "openai":
            return self._call_openai(prompt, system, temperature, max_tokens)
        elif self.provider == "anthropic":
            return self._call_anthropic(prompt, system, temperature, max_tokens)
        raise ValueError(f"Unsupported LLM provider: {self.provider}")

    async def complete_async(
        self,
        prompt: str,
        system: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
    ) -> str:
        """Generate a completion for ``prompt`` asynchronously."""
        if self.provider == "groq":
            if self._groq_provider is None:
                self._groq_provider = GroqProvider(model=self.model, timeout=self.timeout)
            return await self._groq_provider.complete_async(prompt, system, temperature, max_tokens)
        elif self.provider == "ollama":
            if self._ollama_provider is None:
                self._ollama_provider = OllamaProvider(model=self.model, timeout=self.timeout)
            return await self._ollama_provider.complete_async(
                prompt, system, temperature, max_tokens
            )
        elif self.provider == "openai":
            return await self._call_openai_async(prompt, system, temperature, max_tokens)
        elif self.provider == "anthropic":
            return await self._call_anthropic_async(prompt, system, temperature, max_tokens)
        raise ValueError(f"Unsupported LLM provider: {self.provider}")

    # ------------------------------------------------------------------
    # Legacy / Fallback Providers
    # ------------------------------------------------------------------

    def _call_openai(
        self, prompt: str, system: str | None, temperature: float, max_tokens: int
    ) -> str:
        try:
            from openai import OpenAI
            from openai.types.chat import ChatCompletionMessageParam
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai") from None

        client = OpenAI(timeout=self.timeout)
        messages: list[ChatCompletionMessageParam] = []
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

        import time

        from src.utils.usage import request_usage

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

    def _call_anthropic(
        self, prompt: str, system: str | None, temperature: float, max_tokens: int
    ) -> str:
        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "anthropic package required. Install with: pip install anthropic"
            ) from None

        client = anthropic.Anthropic(timeout=self.timeout)

        def _api_call():
            if system:
                return client.messages.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    system=system,
                )
            else:
                return client.messages.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

        import time

        from src.utils.usage import request_usage

        start_time = time.perf_counter()
        response = retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        if getattr(response, "usage", None):
            prompt_tokens = getattr(response.usage, "input_tokens", 0)
            completion_tokens = getattr(response.usage, "output_tokens", 0)
            tracker = request_usage.get()
            if tracker is not None:
                tracker.add_call(prompt_tokens, completion_tokens, latency)

        return response.content[0].text if response.content else ""

    async def _call_openai_async(
        self, prompt: str, system: str | None, temperature: float, max_tokens: int
    ) -> str:
        try:
            from openai import AsyncOpenAI
            from openai.types.chat import ChatCompletionMessageParam
        except ImportError:
            raise ImportError("openai package required. Install with: pip install openai") from None

        client = AsyncOpenAI(timeout=self.timeout)
        messages: list[ChatCompletionMessageParam] = []
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

        import time

        from src.utils.usage import request_usage

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

    async def _call_anthropic_async(
        self, prompt: str, system: str | None, temperature: float, max_tokens: int
    ) -> str:
        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "anthropic package required. Install with: pip install anthropic"
            ) from None

        client = anthropic.AsyncAnthropic(timeout=self.timeout)

        async def _api_call():
            if system:
                return await client.messages.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    system=system,
                )
            else:
                return await client.messages.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

        import time

        from src.utils.usage import request_usage

        start_time = time.perf_counter()
        response = await async_retry_with_backoff(_api_call)
        latency = time.perf_counter() - start_time

        if getattr(response, "usage", None):
            prompt_tokens = getattr(response.usage, "input_tokens", 0)
            completion_tokens = getattr(response.usage, "output_tokens", 0)
            tracker = request_usage.get()
            if tracker is not None:
                tracker.add_call(prompt_tokens, completion_tokens, latency)

        return response.content[0].text if response.content else ""
