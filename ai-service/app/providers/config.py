import os
from dataclasses import dataclass
from typing import List, Optional


def _truthy(value: Optional[str]) -> bool:
    return (value or "").lower() in ("1", "true", "yes")


@dataclass(frozen=True)
class ProviderSettings:
    provider: str
    embedding_model: str
    chat_model: str
    api_key: Optional[str]
    base_url: Optional[str]
    embedding_dimensions: int = 1536

    @property
    def label(self) -> str:
        return self.provider


def resolve_provider() -> str:
    """Default provider when EMBEDDING_PROVIDER / CHAT_PROVIDER are not set."""
    if _truthy(os.getenv("USE_MOCK_EMBEDDINGS")):
        return "mock"
    explicit = (os.getenv("AI_PROVIDER") or "").strip().lower()
    if explicit:
        return explicit
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return "gemini"
    if os.getenv("NVIDIA_API_KEY"):
        return "nvidia"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("OLLAMA_BASE_URL"):
        return "ollama"
    return "mock"


def resolve_embedding_provider() -> str:
    override = (os.getenv("EMBEDDING_PROVIDER") or "").strip().lower()
    return override or resolve_provider()


def resolve_chat_provider() -> str:
    override = (os.getenv("CHAT_PROVIDER") or "").strip().lower()
    return override or resolve_provider()


def _settings_for_provider(provider: str) -> ProviderSettings:
    dims = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))

    if provider == "mock":
        return ProviderSettings(
            provider="mock",
            embedding_model="mock",
            chat_model="mock",
            api_key=None,
            base_url=None,
            embedding_dimensions=dims,
        )

    if provider == "gemini":
        return ProviderSettings(
            provider="gemini",
            embedding_model=os.getenv(
                "GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001"
            ),
            chat_model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash"),
            api_key=os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"),
            base_url=None,
            embedding_dimensions=dims,
        )

    if provider == "nvidia":
        return ProviderSettings(
            provider="nvidia",
            embedding_model=os.getenv(
                "NVIDIA_EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5"
            ),
            chat_model=os.getenv(
                "NVIDIA_CHAT_MODEL", "meta/llama-3.1-8b-instruct"
            ),
            api_key=os.getenv("NVIDIA_API_KEY"),
            base_url=os.getenv(
                "NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"
            ),
            embedding_dimensions=dims,
        )

    if provider == "ollama":
        return ProviderSettings(
            provider="ollama",
            embedding_model=os.getenv(
                "OLLAMA_EMBEDDING_MODEL", "all-minilm:latest"
            ),
            chat_model=os.getenv("OLLAMA_CHAT_MODEL", "llama3.2:3b"),
            api_key=os.getenv("OLLAMA_API_KEY", "ollama"),
            base_url=os.getenv(
                "OLLAMA_BASE_URL", "http://host.docker.internal:11434/v1"
            ),
            embedding_dimensions=dims,
        )

    return ProviderSettings(
        provider="openai",
        embedding_model=os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        ),
        chat_model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL"),
        embedding_dimensions=dims,
    )


def load_embedding_settings() -> ProviderSettings:
    return _settings_for_provider(resolve_embedding_provider())


def load_chat_settings() -> ProviderSettings:
    return _settings_for_provider(resolve_chat_provider())


def load_settings() -> ProviderSettings:
    """Backward-compatible: returns embedding provider settings."""
    return load_embedding_settings()


def fit_embedding_dimensions(vector: List[float], target: int) -> List[float]:
    if len(vector) == target:
        return vector
    if len(vector) > target:
        return vector[:target]
    return vector + [0.0] * (target - len(vector))
