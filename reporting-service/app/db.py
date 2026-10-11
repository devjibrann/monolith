import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5433/ai_workspace_development",
)


@contextmanager
def db_cursor() -> Iterator[psycopg.Cursor]:
    """Short-lived read-only connection per request; keeps the service stateless."""
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        conn.read_only = True
        with conn.cursor() as cur:
            yield cur
