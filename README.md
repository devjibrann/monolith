# AI Workspace Platform

A production-style AI SaaS platform built for learning architectural evolution.

## Architecture (Phase 1)

```text
                 ALB
                  |
        --------------------
        |                  |
     Next.js          Rails API
                           |
        --------------------------------
        |              |              |
    PostgreSQL      Redis         Sidekiq
                                          |
                                   FastAPI AI Service
```

## Tech Stack

- **Frontend**: Next.js 14+ (App Router, Tailwind)
- **Backend**: Rails 8.0+ (API Mode)
- **AI Service**: FastAPI
- **Ruby**: 3.4.x
- **Database**: PostgreSQL 15+
- **Cache/Queue**: Redis 7+
- **Background Jobs**: Sidekiq 7+
- **Infrastructure**: Docker Compose (local), ECS Fargate + GitHub Actions (AWS)

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Run Local Development

```bash
docker-compose up --build
```

- Frontend: [http://localhost:3001](http://localhost:3001)
- Backend API: [http://localhost:3000](http://localhost:3000)
- AI Service: [http://localhost:8000](http://localhost:8000)

## Phase 1 features

- **Auth & orgs**: JWT login/signup, organizations, memberships, org switcher
- **Documents**: Upload PDF, TXT, or Markdown; text extraction, Sidekiq processing, pgvector chunks
- **Chat**: RAG retrieval + SSE streaming via configurable AI providers
- **AI service**: FastAPI internal API (`/internal/embeddings`, `/internal/chat/stream`); providers: OpenAI, Gemini, NVIDIA NIM, Ollama, or mock — see [ai-service/README.md](ai-service/README.md)

After `docker compose up --build`, run migrations if needed:

```bash
docker compose exec backend bundle exec rails db:prepare
```

Optional: copy `.env.example` to `.env`, set `AI_PROVIDER` and the matching API key (or `USE_MOCK_EMBEDDINGS=true`), then `docker compose up -d --force-recreate ai-service`.

## Frontend design quality workflow

- Product/design context for AI tooling lives in:
  - `frontend/PRODUCT.md`
  - `frontend/DESIGN.md`
- Local detector command:

```bash
cd frontend
npm run design:detect
```

- CI runs `design:detect` in non-blocking mode for now (reports issues without failing build).

## Deploy to AWS (ECS)

Production images, ECS task definitions, and CI/CD workflows are in the repo. See **[docs/deploy.md](docs/deploy.md)** for:

- Pushing to GitHub safely (no secrets in git)
- ECR, RDS, Redis, Secrets Manager, ALB
- GitHub OIDC + repository variables
- First ECS deploy via `.github/workflows/deploy.yml`
