# Production FastAPI (no --reload).
# Build from repo root: docker build -f infra/docker/ai-service.prod.Dockerfile .

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ai-service/ .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
