from typing import Any, Dict, Iterator, List

from app.providers import stream_chat_reply as _stream_chat_reply

__all__ = ["stream_chat_reply"]


def stream_chat_reply(message: str, context: List[Dict[str, Any]]) -> Iterator[str]:
    yield from _stream_chat_reply(message, context)
