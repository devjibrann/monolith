# Deploy to AWS ECS (Milestone 8)

This guide assumes you have **not pushed to GitHub yet**. Do local git setup first, then AWS, then enable CI/CD.

## 1. Push code to GitHub

```bash
cd /home/ubuntu/monlith
git init
git add .
git status   # confirm .env, master.key, node_modules are NOT listed
git commit -m "Add ECS deployment: prod Dockerfiles, task defs, GitHub Actions"
git branch -M main
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

**Never commit:** `backend/.env`, `backend/config/master.key`, `frontend/.env.local`.

---

## 2. AWS resources (one-time)

### ECR repositories

Create three repos (names can match your GitHub variables):

| Repository        | Used by              |
|-------------------|----------------------|
| `monlith-backend` | Rails API + Sidekiq  |
| `monlith-frontend`| Next.js              |
| `monlith-ai-service` | FastAPI           |

### RDS PostgreSQL

- Engine: PostgreSQL 15+
- Database name: e.g. `ai_workspace_production`
- Note endpoint for `DATABASE_URL`

Example:

```text
postgresql://USER:PASSWORD@your-rds-host:5432/ai_workspace_production
```

### ElastiCache Redis

- Used by Sidekiq and future AI jobs
- Example `REDIS_URL`: `redis://your-redis-host:6379/0`

### Secrets Manager

Create secret `monlith/production` (JSON or key/value) with:

| Key | Example |
|-----|---------|
| `RAILS_MASTER_KEY` | Contents of `backend/config/master.key` |
| `DATABASE_URL` | RDS URL above |
| `REDIS_URL` | ElastiCache URL |
| `DEVISE_JWT_SECRET_KEY` | Long random string |
| `CORS_ORIGINS` | `https://app.yourdomain.com` |
| `AI_SERVICE_URL` | `http://monlith-ai-service:8000` (ECS service discovery / internal URL) |
| `AI_SERVICE_SECRET` | Shared secret (match ai-service task env) |

Update ARNs in `infra/ecs/task-definition.*.json` (replace `REGION`, `ACCOUNT_ID`, and secret ARN suffix).

### CloudWatch log groups

```text
/ecs/monlith-backend
/ecs/monlith-sidekiq
/ecs/monlith-frontend
/ecs/monlith-ai-service
```

### ECS cluster + services

1. Create cluster (e.g. `monlith`).
2. Register task definitions (after editing placeholders):

```bash
aws ecs register-task-definition --cli-input-json file://infra/ecs/task-definition.backend.json
# repeat for sidekiq, frontend, ai-service
```

3. Create **four Fargate services** in private subnets:
   - `monlith-backend` — target group → ALB path `/api` or host `api.*`
   - `monlith-sidekiq` — no load balancer
   - `monlith-frontend` — ALB default /
   - `monlith-ai-service` — internal only (backend SG → port 8000)

### ALB + security groups

| SG | Inbound |
|----|---------|
| `alb-sg` | 443 from internet |
| `ecs-frontend-sg` | 3000 from `alb-sg` |
| `ecs-backend-sg` | 3000 from `alb-sg` |
| `ecs-sidekiq-sg` | none |
| `ecs-ai-sg` | 8000 from backend/sidekiq SGs |
| `rds-sg` | 5432 from backend/sidekiq SGs |
| `redis-sg` | 6379 from backend/sidekiq SGs |

---

## 3. GitHub OIDC (no long-lived AWS keys)

1. IAM → Identity provider → **GitHub**.
2. IAM role `github-actions-monlith-deploy` with trust policy (see `infra/aws/github-oidc-trust-policy.json.example`).
3. Attach policies: `AmazonEC2ContainerRegistryPowerUser`, `AmazonECS_FullAccess` (tighten later).

---

## 4. GitHub repository configuration

### Branch strategy

| Branch | CI (PR) | Deploy to ECS |
|--------|---------|---------------|
| `production` | via PR checks | **yes** — push runs `Production Deploy` workflow |
| `main` | via PR checks | no |

Workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | PR → `main` or `production` | Tests, lint, build |
| `.github/workflows/deploy.yml` | Push → `production`, manual | CI gates + ECR + ECS |

Update the GitHub OIDC trust policy to allow the `production` branch (see `infra/aws/iam-github-actions-deploy-trust.json`).

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT:role/github-actions-monlith-deploy` |
| `NEXT_PUBLIC_API_URL` | Public API URL baked into frontend build, e.g. `https://api.yourdomain.com` |

### Variables (repository variables)

| Variable | Example |
|----------|---------|
| `AWS_REGION` | `us-east-1` |
| `ECS_CLUSTER` | `monlith` |
| `ECR_REPOSITORY_BACKEND` | `monlith-backend` |
| `ECR_REPOSITORY_FRONTEND` | `monlith-frontend` |
| `ECR_REPOSITORY_AI` | `monlith-ai-service` |
| `ECS_SERVICE_BACKEND` | `monlith-backend` |
| `ECS_SERVICE_SIDEKIQ` | `monlith-sidekiq` |
| `ECS_SERVICE_FRONTEND` | `monlith-frontend` |
| `ECS_SERVICE_AI` | `monlith-ai-service` |

---

## 5. CI/CD workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | PR → `main` / `production` | Backend tests, frontend lint/build, AI import check |
| `.github/workflows/deploy.yml` | Push → `production`, manual | CI gates → build prod images → ECR → ECS rolling deploy |

First deploy: merge to `production` or run **Actions → Production Deploy → Run workflow** after variables/secrets and ECS services exist.

---

## 6. Production Dockerfiles (local test)

```bash
# Backend
docker build -f infra/docker/backend.prod.Dockerfile -t monlith-backend:local .

# Frontend (set your API URL)
docker build -f infra/docker/frontend.prod.Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 \
  -t monlith-frontend:local .

# AI service
docker build -f infra/docker/ai-service.prod.Dockerfile -t monlith-ai:local .
```

Development still uses `docker-compose.yml` and `infra/docker/*.Dockerfile` (dev targets).

---

## 7. Post-deploy checks

- `GET https://api.yourdomain.com/up` → 200
- Sign up / login from frontend
- CloudWatch logs for each service
- RDS migrations applied (`db:prepare` runs on backend container start)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Deploy workflow fails validation | Set all GitHub variables/secrets in section 4 |
| `CannotPullContainerError` | ECR repo name / IAM execution role |
| Backend 500 / credentials | `RAILS_MASTER_KEY` in Secrets Manager |
| CORS errors | `CORS_ORIGINS` must match frontend origin exactly |
| Frontend calls wrong API | Rebuild with correct `NEXT_PUBLIC_API_URL` secret |
| Sidekiq not processing | `REDIS_URL`, security group 6379, same backend image |
