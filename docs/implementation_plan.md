# Implementation Plan - AI Workspace Platform

## Phase 1: Modular Monolith on ECS

### Milestone 1: Repository Structure + Docker Compose ✅
- [x] Initialize Next.js frontend
- [x] Initialize Rails 8 API backend (Ruby 3.3)
- [x] Initialize FastAPI AI service
- [x] Create Dockerfiles for all services
- [x] Create `docker-compose.yml`
- [x] Basic project documentation

### Milestone 2: Rails Auth + Organizations ✅
- [x] Setup Devise or custom JWT auth
- [x] Create `Organization` model
- [x] Create `Membership` (RBAC)
- [x] Multi-tenancy implementation (using `acts_as_tenant` or similar)

### Milestone 3: Next.js Frontend Shell ✅
- [x] Setup shadcn/ui or similar component library
- [x] Create layout with sidebar and organization switcher
- [x] Implement login/signup pages

### Milestone 4: File Uploads ✅
- [x] Setup Active Storage with local/S3 provider
- [x] Implement document upload endpoint
- [x] Background job for processing (Sidekiq)

### Milestone 5: FastAPI AI Service ✅
- [x] Integration with OpenAI/Anthropic
- [x] Basic RAG implementation
- [x] Internal API for Rails to call FastAPI

### Milestone 6: RAG Pipeline ✅
- [x] Vector DB setup (pgvector)
- [x] Document chunking and embedding
- [x] Retrieval logic

### Milestone 7: Streaming Responses ✅
- [x] SSE chat endpoint (Rails)
- [x] Streaming from FastAPI to Rails to Frontend

### Milestone 8: Deploy entire system to ECS ⏳
- [ ] ECR setup (AWS console — see docs/deploy.md)
- [x] Task definitions (`infra/ecs/`)
- [ ] ALB and Networking (AWS console)
- [x] CI/CD with Github Actions (`.github/workflows/`)
- [x] Production Dockerfiles (`infra/docker/*.prod.Dockerfile`)
