# ECS task definitions

Templates for **Fargate** services. Before first deploy:

1. Replace `ACCOUNT_ID` and `REGION` in all JSON files.
2. Replace Secrets Manager ARNs with your `monlith/production` secret.
3. Replace `executionRoleArn` / `taskRoleArn` with your IAM roles.
4. Register once:

```bash
aws ecs register-task-definition --cli-input-json file://infra/ecs/task-definition.backend.json
aws ecs register-task-definition --cli-input-json file://infra/ecs/task-definition.sidekiq.json
aws ecs register-task-definition --cli-input-json file://infra/ecs/task-definition.frontend.json
aws ecs register-task-definition --cli-input-json file://infra/ecs/task-definition.ai-service.json
```

GitHub Actions **Deploy to ECS** workflow updates the container image on each push to `main`; it uses these same task definition files from the repo.

Full setup: [docs/deploy.md](../../docs/deploy.md).
