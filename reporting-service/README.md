# Reporting Service

Internal FastAPI microservice for chat reporting and observability. It reads the
shared PostgreSQL database (read-only) and is only reachable by the Rails
backend, which enforces authentication, tenancy, and role checks before
proxying requests here.

## Endpoints

All endpoints require the `X-Internal-Secret` header
(`REPORTING_SERVICE_SECRET`).

| Endpoint | Description |
|----------|-------------|
| `GET /internal/reports/chats/export?organization_id=&user_id=&format=csv\|json` | Downloadable chat transcript for an organization (optionally a single user). |
| `GET /internal/reports/chats/observations?organization_id=&days=30` | Chat observation metrics: totals, per-user activity, per-day volume, top cited documents. |
| `GET /health` | Health check. |

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (read-only usage). |
| `REPORTING_SERVICE_SECRET` | Shared secret with the Rails backend. |

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8100
```

Or via Docker Compose from the repo root: the `reporting-service` container is
exposed on `http://localhost:8100`.
