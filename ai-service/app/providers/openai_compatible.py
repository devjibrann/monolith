from typing import Any, Dict, Iterator, List

from openai import APIError, AuthenticationError, OpenAI, RateLimitError

from app.providers.config import ProviderSettings, fit_embedding_dimensions

SYSTEM_PROMPT = (
    "You are a helpful assistant for an AI Workspace. "
    "Use the provided document context when relevant. "
    "If context is empty, answer from general knowledge and say when context is missing."
)


def _client(settings: ProviderSettings) -> OpenAI:
    kwargs: dict = {
        "api_key": settings.api_key or "not-needed",
        "max_retries": 2,
        "timeout": 120.0,
    }
    if settings.base_url:
        kwargs["base_url"] = settings.base_url
    return OpenAI(**kwargs)


def _format_context(context: List[Dict[str, Any]]) -> str:
    if not context:
        return "No document context available."
    parts = []
    for item in context:
        title = item.get("document_title", "Document")
        content = item.get("content", "")
        parts.append(f"### {title}\n{content}")
    return "\n\n".join(parts)


def _api_error_message(settings: ProviderSettings, exc: APIError) -> str:
    name = settings.provider.upper()
    if isinstance(exc, AuthenticationError):
        return (
            f"{name} rejected the API key (401). Check credentials in .env and "
            "recreate ai-service: docker compose up -d --force-recreate ai-service"
        )
    if isinstance(exc, RateLimitError):
        return f"{name} rate limit exceeded. Retry later or check quota."
    status = getattr(exc, "status_code", None)
    if status == 500:
        return (
            f"{name} returned HTTP 500. Verify the API key, model name "
            f"({settings.embedding_model} / {settings.chat_model}), and billing. "
            "For Ollama, ensure the model is pulled: ollama pull <model>"
        )
    return f"{name} API error: {exc}"


def embed_texts(settings: ProviderSettings, texts: List[str]) -> List[List[float]]:
    if not settings.api_key and settings.provider != "ollama":
        raise RuntimeError(f"{settings.provider}: API key is not configured")

    client = _client(settings)
    try:
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=texts,
        )
    except APIError as e:
        raise RuntimeError(_api_error_message(settings, e)) from e

    target = settings.embedding_dimensions
    return [
        fit_embedding_dimensions(list(item.embedding), target)
        for item in response.data
    ]


def stream_chat_reply(
    settings: ProviderSettings, message: str, context: List[Dict[str, Any]]
) -> Iterator[str]:
    if not settings.api_key and settings.provider != "ollama":
        yield (
            f"{settings.provider}: API key missing. Set credentials in .env "
            f"(AI_PROVIDER={settings.provider})."
        )
        return

    client = _client(settings)
    context_block = _format_context(context)

    try:
        stream = client.chat.completions.create(
            model=settings.chat_model,
            stream=True,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Context:\n{context_block}\n\nQuestion:\n{message}",
                },
            ],
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except AuthenticationError:
        yield (
            f"{settings.provider}: authentication failed. Check API key and "
            "recreate ai-service."
        )
    except RateLimitError:
        yield f"{settings.provider}: rate limit exceeded."
    except APIError as e:
        yield _api_error_message(settings, e)
