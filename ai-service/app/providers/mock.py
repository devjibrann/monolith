import hashlib
from typing import Any, Dict, Iterator, List

SYSTEM_PROMPT = (
    "You are a helpful assistant for an AI workspace. "
    "Use the provided document context when relevant."
)


def mock_embedding(text: str, dimensions: int) -> List[float]:
    values: List[float] = []
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    while len(values) < dimensions:
        digest = hashlib.sha256(digest).digest()
        for byte in digest:
            values.append((byte / 255.0) * 2.0 - 1.0)
            if len(values) >= dimensions:
                break
    norm = sum(v * v for v in values) ** 0.5 or 1.0
    return [v / norm for v in values]


def embed_texts(texts: List[str], dimensions: int) -> List[List[float]]:
    return [mock_embedding(text, dimensions) for text in texts]


def _format_context(context: List[Dict[str, Any]]) -> str:
    if not context:
        return "No document context available."
    parts = []
    for item in context:
        title = item.get("document_title", "Document")
        content = item.get("content", "")
        parts.append(f"### {title}\n{content}")
    return "\n\n".join(parts)


def stream_chat_reply(
    message: str, context: List[Dict[str, Any]], provider_label: str
) -> Iterator[str]:
    context_block = _format_context(context)
    mock = (
        f"(Mock mode: provider={provider_label}. No live LLM configured.)\n\n"
        f"You asked: {message}\n\n"
        f"Retrieved {len(context)} context snippet(s).\n\n"
        f"Context preview:\n{context_block[:1200]}"
    )
    yield mock
