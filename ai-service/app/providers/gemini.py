from typing import Any, Dict, Iterator, List

from app.providers.config import ProviderSettings, fit_embedding_dimensions

SYSTEM_PROMPT = (
    "You are a helpful assistant for an AI Workspace. "
    "Use the provided document context when relevant. "
    "If context is empty, answer from general knowledge and say when context is missing."
)


def _configure(settings: ProviderSettings):
    import google.generativeai as genai

    if not settings.api_key:
        raise RuntimeError(
            "Gemini: set GEMINI_API_KEY (or GOOGLE_API_KEY) in .env and "
            "AI_PROVIDER=gemini"
        )
    genai.configure(api_key=settings.api_key)
    return genai


def _format_context(context: List[Dict[str, Any]]) -> str:
    if not context:
        return "No document context available."
    parts = []
    for item in context:
        title = item.get("document_title", "Document")
        content = item.get("content", "")
        parts.append(f"### {title}\n{content}")
    return "\n\n".join(parts)


def embed_texts(settings: ProviderSettings, texts: List[str]) -> List[List[float]]:
    genai = _configure(settings)
    target = settings.embedding_dimensions
    vectors: List[List[float]] = []

    for text in texts:
        try:
            result = genai.embed_content(
                model=settings.embedding_model,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=target,
            )
        except Exception as e:
            raise RuntimeError(f"Gemini embeddings failed: {e}") from e

        embedding = result.get("embedding")
        if not embedding:
            raise RuntimeError("Gemini returned an empty embedding")
        vectors.append(fit_embedding_dimensions(list(embedding), target))

    return vectors


def stream_chat_reply(
    settings: ProviderSettings, message: str, context: List[Dict[str, Any]]
) -> Iterator[str]:
    genai = _configure(settings)
    context_block = _format_context(context)
    prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{context_block}\n\nQuestion:\n{message}"

    try:
        model = genai.GenerativeModel(settings.chat_model)
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"Gemini chat failed: {e}"
