<div align="center">

# 🗿 Monolith

### *One repo. Five services. Zero hand-waving.*

**A production-style, multi-tenant AI workspace: upload your documents, ask questions, and get grounded, streaming answers.**
Built to study how a real SaaS architecture grows, one phase at a time.

![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Rails](https://img.shields.io/badge/Rails-8.0-CC0000?style=for-the-badge&logo=rubyonrails&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Postgres-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-ECS_Fargate-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

[Quick start](#-quick-start) · [Architecture](#-architecture) · [Features](#-what-it-does) · [Deploy](#-shipping-it-to-aws)

</div>

---

## 💡 The idea

Most AI demos are a single script and an API key. **Monolith** is the opposite: a deliberately realistic platform with auth, organizations, background jobs, vector search, microservices, CI/CD and cloud infrastructure, so you can watch the architecture change as the product grows.

> **Drop in a PDF → it gets chunked and embedded → ask a question → watch the answer stream in, with citations.**

---

## 🏛 Architecture

```text
                          ┌──────────────┐
                          │     ALB      │
                          └──────┬───────┘
                 ┌───────────────┴───────────────┐
          ┌──────▼──────┐                 ┌──────▼──────┐
          │   Next.js   │ ───── API ────▶ │  Rails API  │
          │  frontend   │                 │   (core)    │
          └─────────────┘                 └──────┬──────┘
                   ┌─────────────┬───────────────┼───────────────┐
            ┌──────▼─────┐ ┌─────▼─────┐  ┌──────▼──────┐ ┌──────▼──────────┐
            │ PostgreSQL │ │   Redis   │  │   Sidekiq   │ │ FastAPI         │
            │ + pgvector │ │ cache/queue│ │   workers   │ │ AI Service 🤖   │
            └──────▲─────┘ └───────────┘  └─────────────┘ └─────────────────┘
                   │                                      ┌─────────────────┐
                   └────────── read-only ──────────────── │ FastAPI         │
                                                          │ Reporting 📊    │
                                                          └─────────────────┘
```

| Layer | Tech | Job |
|---|---|---|
| 🎨 **Frontend** | Next.js 14+ (App Router, Tailwind) | The workspace UI: chat, documents, orgs, reports, hierarchy maps |
| 🧠 **Backend** | Rails 8 (API mode), Ruby 3.4 | Auth, tenancy, documents, chats, and the gateway to every other service |
| ⚙️ **Workers** | Sidekiq 7 | Text extraction, chunking and embedding in the background |
| 🤖 **AI service** | FastAPI | Embeddings, streaming chat and the multi-step agent pipeline |
| 📊 **Reporting service** | FastAPI | Transcript exports and chat analytics over a read-only DB connection |
| 🗄 **Data** | PostgreSQL 15 + pgvector, Redis 7 | Records, vectors, cache and queues |
| ☁️ **Infra** | Docker Compose → ECS Fargate + GitHub Actions | Local dev to production with the same images |

---

## ✨ What it does

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Auth & organizations
JWT login/signup, organizations, memberships and an org switcher. Every query is scoped to its tenant.

### 📄 Documents
Upload **PDF, TXT or Markdown**. Sidekiq extracts the text, chunks it and stores embeddings in pgvector, with clear *pending → ready → failed* status.

### 💬 RAG chat
Retrieval-augmented answers streamed over **SSE**, grounded in your own content.

</td>
<td width="50%" valign="top">

### 🧭 Agent mode
An optional multi-step pipeline: **plan → ground → synthesize**. Each step's progress streams live into the chat UI.

### 📊 Reports
Download chat transcripts as CSV or JSON, and view analytics: totals, per-user activity, daily volume and the most-cited documents. Access is role-checked.

### 🕸 Hierarchy maps
Interactive React Flow graphs of the organization tree and each org's user-role hierarchy.

</td>
</tr>
</table>

### 🔌 Bring your own model

The AI service is provider-agnostic. Switch with one env var:

```
AI_PROVIDER = openai | gemini | nvidia | ollama | mock
```

Running fully offline? Use **Ollama** (included in Compose) or set `USE_MOCK_EMBEDDINGS=true`. Details are in [ai-service/README.md](ai-service/README.md).

---

## 🚀 Quick start

**You only need Docker.**

```bash
git clone https://github.com/devjibrann/monolith.git
cd monolith
cp .env.example .env        # optional: choose AI_PROVIDER and add a key
docker compose up --build
```

Then prepare the database (first run only):

```bash
docker compose exec backend bundle exec rails db:prepare
```

| Service | URL |
|---|---|
| 🎨 Frontend | http://localhost:3001 |
| 🧠 Backend API | http://localhost:3000 |
| 🤖 AI Service | http://localhost:8000 |
| 📊 Reporting Service | http://localhost:8100 |

> 💡 After changing the AI provider in `.env`, restart only that service:
> `docker compose up -d --force-recreate ai-service`

---

## 🗺 Repo map

```text
monolith/
├── frontend/            Next.js app (chat, documents, orgs, reports, users)
├── backend/             Rails 8 API + Sidekiq jobs
├── ai-service/          FastAPI: embeddings, chat stream, agent pipeline
├── reporting-service/   FastAPI: exports & analytics
├── infra/
│   ├── docker/          Dev & prod Dockerfiles
│   ├── ecs/             ECS task definitions
│   └── aws/             Secrets Manager templates
├── docs/                Deploy guide & implementation plan
└── .github/workflows/   CI + ECS deploy
```

---

## 🎨 Design with intent

The UI follows a written product and design brief, so humans and AI tooling build to the same standard: **calm, practical, no hype**.

- 📘 [`frontend/PRODUCT.md`](frontend/PRODUCT.md): who it's for and why
- 🎯 [`frontend/DESIGN.md`](frontend/DESIGN.md): the visual system

Run the design detector locally:

```bash
cd frontend && npm run design:detect
```

CI runs it in report-only mode for now, so it flags issues without failing the build.

---

## ☁️ Shipping it to AWS

Production images, ECS task definitions and CI/CD workflows are all included. **[docs/deploy.md](docs/deploy.md)** walks through:

- 🔒 Pushing to GitHub safely (no secrets in git)
- 🧱 ECR, RDS, ElastiCache Redis, Secrets Manager and the ALB
- 🪪 GitHub OIDC with repository variables (no long-lived AWS keys)
- 🚢 Your first ECS deploy via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

---

## 🧗 The journey

Monolith grows in phases. **Phase 1** is the foundation you see above. The roadmap and the reasoning behind each step are in [docs/implementation_plan.md](docs/implementation_plan.md).

<div align="center">

---

**Built to learn by shipping.** ⭐ Star the repo if it helped you learn something.

</div>
