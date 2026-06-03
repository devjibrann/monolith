from typing import List

from app.providers import embed_texts as _embed_texts

__all__ = ["embed_texts"]


def embed_texts(texts: List[str]) -> List[List[float]]:
    return _embed_texts(texts)
