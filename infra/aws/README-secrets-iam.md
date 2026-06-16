# Secrets Manager & IAM (Monlith)

Account: **316383776132** · Region: **us-east-1**

## 1. Create the secret (console or CLI)

Copy the example, fill real values, save as `secrets.json` (do not commit):

```bash
cp infra/aws/secrets-manager.monlith-production.json.example secrets.json
# edit secrets.json with real passwords and endpoints
```

Create secret:

```bash
aws secretsmanager create-secret \
  --region us-east-1 \
  --name monlith/production \
  --description "Monlith production env for ECS" \
  --secret-string file://secrets.json

rm secrets.json
```

Get the ARN suffix (needed for task definitions):

```bash
aws secretsmanager describe-secret \
  --region us-east-1 \
  --secret-id monlith/production \
  --query ARN --output text
```

Example ARN:

`arn:aws:secretsmanager:us-east-1:316383776132:secret:monlith/production-AbCdEf`

In `infra/ecs/task-definition.*.json`, replace:

- `ACCOUNT_ID` → `316383776132`
- `REGION` → `us-east-1`
- `secret:monlith/production` → `secret:monlith/production-AbCdEf` (include AWS suffix)

Per-key reference format (unchanged suffix at end):

`arn:aws:secretsmanager:us-east-1:316383776132:secret:monlith/production-AbCdEf:RAILS_MASTER_KEY::`

## 2. IAM roles

### A. `ecsTaskExecutionRole` (pull images, logs, read secrets)

Trust: `iam-ecs-task-execution-trust.json`  
Policy: `iam-ecs-task-execution-policy.json`

```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://infra/aws/iam-ecs-task-execution-trust.json

aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name monlith-ecs-execution \
  --policy-document file://infra/aws/iam-ecs-task-execution-policy.json
```

Or attach AWS managed policy `AmazonECSTaskExecutionRolePolicy` and add an inline policy for `monlith/production` secrets only.

### B. `monlith-ecs-task` (runtime; optional S3)

Trust: `iam-monlith-ecs-task-trust.json`  
Policy: `iam-monlith-ecs-task-policy.json` (edit S3 bucket or use empty `{"Version":"2012-10-17","Statement":[]}` until S3 is configured)

```bash
aws iam create-role \
  --role-name monlith-ecs-task \
  --assume-role-policy-document file://infra/aws/iam-monlith-ecs-task-trust.json

aws iam put-role-policy \
  --role-name monlith-ecs-task \
  --policy-name monlith-ecs-task \
  --policy-document file://infra/aws/iam-monlith-ecs-task-policy.json
```

### C. GitHub Actions OIDC (no long-lived keys)

1. Add OIDC provider (once per account): IAM → Identity providers → GitHub → `token.actions.githubusercontent.com`

2. Create role:

```bash
aws iam create-role \
  --role-name github-actions-monlith-deploy \
  --assume-role-policy-document file://infra/aws/iam-github-actions-deploy-trust.json

aws iam put-role-policy \
  --role-name github-actions-monlith-deploy \
  --policy-name monlith-deploy \
  --policy-document file://infra/aws/iam-github-actions-deploy-policy.json
```

3. GitHub repo **Settings → Secrets**:

| Secret | Value |
|--------|--------|
| `AWS_ROLE_ARN` | `arn:aws:iam::316383776132:role/github-actions-monlith-deploy` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR_ALB_DNS_OR_api.yourdomain.com` |

## 3. Keys used by each service

| Key | backend | sidekiq | ai-service |
|-----|---------|---------|------------|
| RAILS_MASTER_KEY | ✓ | ✓ | |
| DATABASE_URL | ✓ | ✓ | |
| REDIS_URL | ✓ | ✓ | |
| DEVISE_JWT_SECRET_KEY | ✓ | | |
| CORS_ORIGINS | ✓ | | |
| AI_SERVICE_URL | ✓ | ✓ | |
| AI_SERVICE_SECRET | ✓ | ✓ | ✓ |
| AI_PROVIDER / OLLAMA_* / GEMINI_* | | | ✓ |

## 4. Generate random secrets

```bash
openssl rand -hex 32   # AI_SERVICE_SECRET
openssl rand -hex 64   # DEVISE_JWT_SECRET_KEY
```

## 5. AI_SERVICE_URL

Until ECS Service Connect is configured, use one of:

- Service Connect DNS: `http://monlith-ai-service.monlith.local:8000`
- Temporary: `http://<ai-service-task-private-ip>:8000` (changes on redeploy)

`CORS_ORIGINS` must match the browser origin exactly (ALB URL for frontend, no trailing slash).
