import csv
import io
import json
from typing import Any, Dict, List, Optional

from app.db import db_cursor

EXPORT_COLUMNS = [
    "message_id",
    "created_at",
    "role",
    "user_email",
    "content",
    "source_documents",
]


def fetch_chat_transcript(
    organization_id: int, user_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    query = """
        SELECT cm.id AS message_id,
               cm.created_at,
               cm.role,
               u.email AS user_email,
               cm.content,
               cm.sources
        FROM chat_messages cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.organization_id = %(organization_id)s
    """
    params: Dict[str, Any] = {"organization_id": organization_id}
    if user_id is not None:
        query += " AND cm.user_id = %(user_id)s"
        params["user_id"] = user_id
    query += " ORDER BY cm.created_at ASC"

    with db_cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    transcript = []
    for row in rows:
        sources = row["sources"] or []
        transcript.append(
            {
                "message_id": row["message_id"],
                "created_at": row["created_at"].isoformat(),
                "role": row["role"],
                "user_email": row["user_email"],
                "content": row["content"],
                "source_documents": sorted(
                    {
                        s.get("document_title", "")
                        for s in sources
                        if isinstance(s, dict) and s.get("document_title")
                    }
                ),
            }
        )
    return transcript


def transcript_to_csv(transcript: List[Dict[str, Any]]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=EXPORT_COLUMNS)
    writer.writeheader()
    for row in transcript:
        writer.writerow(
            {**row, "source_documents": "; ".join(row["source_documents"])}
        )
    return buffer.getvalue()


def transcript_to_json(transcript: List[Dict[str, Any]]) -> str:
    return json.dumps({"messages": transcript}, ensure_ascii=False, indent=2)


def build_observations(organization_id: int, days: int = 30) -> Dict[str, Any]:
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS total_messages,
                   COUNT(*) FILTER (WHERE role = 'user') AS user_messages,
                   COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_messages,
                   COUNT(DISTINCT user_id) AS active_users,
                   MIN(created_at) AS first_message_at,
                   MAX(created_at) AS last_message_at,
                   COALESCE(AVG(LENGTH(content)) FILTER (WHERE role = 'user'), 0)
                       AS avg_user_message_length,
                   COALESCE(AVG(LENGTH(content)) FILTER (WHERE role = 'assistant'), 0)
                       AS avg_assistant_message_length
            FROM chat_messages
            WHERE organization_id = %(org)s
            """,
            {"org": organization_id},
        )
        totals = cur.fetchone()

        cur.execute(
            """
            SELECT u.id AS user_id,
                   u.email,
                   COUNT(*) FILTER (WHERE cm.role = 'user') AS questions_asked,
                   COUNT(*) AS total_messages,
                   MAX(cm.created_at) AS last_active_at
            FROM chat_messages cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.organization_id = %(org)s
            GROUP BY u.id, u.email
            ORDER BY total_messages DESC
            """,
            {"org": organization_id},
        )
        per_user = cur.fetchall()

        cur.execute(
            """
            SELECT DATE(created_at) AS day,
                   COUNT(*) FILTER (WHERE role = 'user') AS user_messages,
                   COUNT(*) FILTER (WHERE role = 'assistant') AS assistant_messages
            FROM chat_messages
            WHERE organization_id = %(org)s
              AND created_at >= NOW() - make_interval(days => %(days)s)
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            {"org": organization_id, "days": days},
        )
        per_day = cur.fetchall()

        cur.execute(
            """
            SELECT source ->> 'document_title' AS document_title,
                   COUNT(*) AS citations
            FROM chat_messages cm,
                 jsonb_array_elements(cm.sources) AS source
            WHERE cm.organization_id = %(org)s
              AND cm.role = 'assistant'
              AND source ->> 'document_title' IS NOT NULL
            GROUP BY source ->> 'document_title'
            ORDER BY citations DESC
            LIMIT 10
            """,
            {"org": organization_id},
        )
        top_sources = cur.fetchall()

    return {
        "organization_id": organization_id,
        "window_days": days,
        "totals": {
            "total_messages": totals["total_messages"],
            "user_messages": totals["user_messages"],
            "assistant_messages": totals["assistant_messages"],
            "active_users": totals["active_users"],
            "first_message_at": _iso(totals["first_message_at"]),
            "last_message_at": _iso(totals["last_message_at"]),
            "avg_user_message_length": round(
                float(totals["avg_user_message_length"]), 1
            ),
            "avg_assistant_message_length": round(
                float(totals["avg_assistant_message_length"]), 1
            ),
        },
        "per_user": [
            {
                "user_id": row["user_id"],
                "email": row["email"],
                "questions_asked": row["questions_asked"],
                "total_messages": row["total_messages"],
                "last_active_at": _iso(row["last_active_at"]),
            }
            for row in per_user
        ],
        "per_day": [
            {
                "day": row["day"].isoformat(),
                "user_messages": row["user_messages"],
                "assistant_messages": row["assistant_messages"],
            }
            for row in per_day
        ],
        "top_sources": [
            {
                "document_title": row["document_title"],
                "citations": row["citations"],
            }
            for row in top_sources
        ],
    }


def _iso(value) -> Optional[str]:
    return value.isoformat() if value is not None else None
