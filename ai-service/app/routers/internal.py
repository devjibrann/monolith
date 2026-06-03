from typing import Any, Dict, Iterator, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from app.deps import verify_internal_secret
from app.services.chat import stream_chat_reply
from app.services.embeddings import embed_texts

router = APIRouter(prefix="/internal", dependencies=[Depends(verify_internal_secret)])


class EmbeddingsRequest(BaseModel):
    texts: List[str] = Field(min_length=1)


class EmbeddingsResponse(BaseModel):
    embeddings: List[List[float]]


class ChatStreamRequest(BaseModel):
    message: str
    context: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/embeddings", response_model=EmbeddingsResponse)
def create_embeddings(body: EmbeddingsRequest) -> EmbeddingsResponse:
    try:
        vectors = embed_texts(body.texts)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return EmbeddingsResponse(embeddings=vectors)


@router.post("/chat/stream")
async def chat_stream(body: ChatStreamRequest) -> StreamingResponse:
    def event_stream() -> Iterator[str]:
        for token in stream_chat_reply(body.message, body.context):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
