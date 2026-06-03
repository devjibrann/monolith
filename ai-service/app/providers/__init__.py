from typing import Any, Dict, Iterator, List

from app.providers import gemini, mock, openai_compatible
from app.providers.config import load_chat_settings, load_embedding_settings

__all__ = ["embed_texts", "stream_chat_reply", "provider_status"]

_KNOWN = frozenset({"openai", "gemini", "nvidia", "ollama", "mock"})


def _embed_with(settings, texts: List[str]) -> List[List[float]]:
    if settings.provider == "mock":
        return mock.embed_texts(texts, settings.embedding_dimensions)
    if settings.provider == "gemini":
        return gemini.embed_texts(settings, texts)
    if settings.provider in ("openai", "nvidia", "ollama"):
        return openai_compatible.embed_texts(settings, texts)
    raise RuntimeError(
        f"Unknown embedding provider '{settings.provider}'. "
        f"Use one of: {', '.join(sorted(_KNOWN))}."
    )


def _chat_with(
    settings, message: str, context: List[Dict[str, Any]]
) -> Iterator[str]:
    if settings.provider == "mock":
        yield from mock.stream_chat_reply(message, context, settings.provider)
        return
    if settings.provider == "gemini":
        yield from gemini.stream_chat_reply(settings, message, context)
        return
    if settings.provider in ("openai", "nvidia", "ollama"):
        yield from openai_compatible.stream_chat_reply(settings, message, context)
        return
    yield (
        f"Unknown chat provider '{settings.provider}'. "
        f"Set CHAT_PROVIDER to one of: {', '.join(sorted(_KNOWN))}."
    )


def embed_texts(texts: List[str]) -> List[List[float]]:
    return _embed_with(load_embedding_settings(), texts)


def stream_chat_reply(message: str, context: List[Dict[str, Any]]) -> Iterator[str]:
    yield from _chat_with(load_chat_settings(), message, context)


def provider_status() -> dict:
    embed = load_embedding_settings()
    chat = load_chat_settings()
    return {
        "embedding_provider": embed.provider,
        "embedding_model": embed.embedding_model,
        "embedding_dimensions": embed.embedding_dimensions,
        "chat_provider": chat.provider,
        "chat_model": chat.chat_model,
        "chat_base_url": chat.base_url,
        "embedding_api_key_configured": bool(embed.api_key)
        or embed.provider in ("mock", "ollama"),
        "chat_api_key_configured": bool(chat.api_key)
        or chat.provider in ("mock", "ollama"),
    }
