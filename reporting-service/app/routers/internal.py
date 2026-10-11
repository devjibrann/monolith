from datetime import datetime, timezone
from typing import Literal, Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.responses import Response

from app.deps import verify_internal_secret
from app.services.chat_reports import (
    build_observations,
    fetch_chat_transcript,
    transcript_to_csv,
    transcript_to_json,
)

router = APIRouter(prefix="/internal", dependencies=[Depends(verify_internal_secret)])

MEDIA_TYPES = {"csv": "text/csv", "json": "application/json"}


@router.get("/reports/chats/export")
def export_chats(
    organization_id: int = Query(gt=0),
    user_id: Optional[int] = Query(default=None, gt=0),
    format: Literal["csv", "json"] = "csv",
) -> Response:
    try:
        transcript = fetch_chat_transcript(organization_id, user_id)
    except psycopg.Error as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}") from e

    body = (
        transcript_to_csv(transcript)
        if format == "csv"
        else transcript_to_json(transcript)
    )
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"chat-report-org{organization_id}-{stamp}.{format}"

    return Response(
        content=body,
        media_type=MEDIA_TYPES[format],
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Report-Message-Count": str(len(transcript)),
        },
    )


@router.get("/reports/chats/observations")
def chat_observations(
    organization_id: int = Query(gt=0),
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    try:
        return build_observations(organization_id, days)
    except psycopg.Error as e:
        raise HTTPException(status_code=502, detail=f"Database error: {e}") from e
