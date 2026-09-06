"""Configuration checks for the CPU-friendly local development model."""

from src.config import Settings


def test_default_local_model_is_cpu_friendly() -> None:
    settings = Settings(_env_file=None)

    assert settings.llm_provider == "ollama"
    assert settings.llm_model == "qwen2.5:1.5b"
    assert settings.ollama_llm_model == "qwen2.5:1.5b"
    assert settings.embedding_model == "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
