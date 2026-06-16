#!/usr/bin/env bash
# Recreate lab ECS + ALB stack. Expects VPC, SGs, IAM, ECR images, and Secrets Manager secret to exist.
#
# Usage:
#   cp infra/scripts/lab.conf.example infra/scripts/lab.conf
#   # set ALB_DNS / NEXT_PUBLIC_API_URL after first run if ALB name changes
#   # after clean-lab.sh: start RDS and recreate Redis first
#   ./infra/scripts/create-lab.sh
#   ./infra/scripts/create-lab.sh --skip-build   # skip docker build/push
#   ./infra/scripts/create-lab.sh --yes
#
# After create:
#   1. Update secret monolith: CORS_ORIGINS=http://<alb-dns>
#   2. If Redis was recreated: REDIS_URL=rediss://clustercfg....
#   3. After ai-service is up: AI_SERVICE_URL (or set up Service Connect later)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CONF="${LAB_CONF:-$SCRIPT_DIR/lab.conf}"
if [[ ! -f "$CONF" ]]; then
  echo "Missing $CONF" >&2
  echo "Run: cp infra/scripts/lab.conf.example infra/scripts/lab.conf" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$CONF"

AUTO_YES=false
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --yes) AUTO_YES=true ;;
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

aws_cmd() { aws --region "$AWS_REGION" "$@"; }

need_cmd() {
  command -v "$1" >/dev/null || { echo "Required: $1" >&2; exit 1; }
}

echo "=== Monlith lab CREATE ==="
echo "Region:  $AWS_REGION"
echo "Cluster: $ECS_CLUSTER"
echo ""

if [[ "$AUTO_YES" != true ]]; then
  read -r -p "Continue? [y/N] " ans
  [[ "$ans" =~ ^[yY] ]] || exit 0
fi

need_cmd aws
need_cmd docker

# --- Prerequisites ---
echo ">> checking IAM roles"
for role in "$EXECUTION_ROLE" "$TASK_ROLE"; do
  aws_cmd iam get-role --role-name "$role" >/dev/null
done

echo ">> checking secret $SECRET_NAME"
aws_cmd secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null

# --- CloudWatch log groups ---
for lg in /ecs/orgo-backend /ecs/orgo-sidekiq /ecs/orgo-frontend /ecs/orgo-ai-service; do
  aws_cmd logs create-log-group --log-group-name "$lg" 2>/dev/null || true
done

# --- Register task definitions ---
echo ">> registering task definitions"
for f in backend sidekiq frontend ai-service; do
  aws_cmd ecs register-task-definition \
    --cli-input-json "file://$REPO_ROOT/infra/ecs/task-definition.$f.json" >/dev/null
done

# --- ECS cluster ---
if ! aws_cmd ecs describe-clusters --clusters "$ECS_CLUSTER" --query 'clusters[0].status' --output text | grep -q ACTIVE; then
  echo ">> creating cluster $ECS_CLUSTER"
  aws_cmd ecs create-cluster --cluster-name "$ECS_CLUSTER" >/dev/null
fi

# --- Build & push images ---
if [[ "$SKIP_BUILD" != true ]]; then
  echo ">> docker login ECR"
  aws_cmd ecr get-login-password | docker login --username AWS --password-stdin "$ECR_REGISTRY"

  echo ">> building backend (also used by sidekiq)"
  docker build -f "$REPO_ROOT/infra/docker/backend.prod.Dockerfile" \
    -t "$ECR_REGISTRY/$ECR_BACKEND:latest" "$REPO_ROOT"
  docker push "$ECR_REGISTRY/$ECR_BACKEND:latest"

  echo ">> building frontend (NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL)"
  docker build -f "$REPO_ROOT/infra/docker/frontend.prod.Dockerfile" \
    --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    -t "$ECR_REGISTRY/$ECR_FRONTEND:latest" "$REPO_ROOT"
  docker push "$ECR_REGISTRY/$ECR_FRONTEND:latest"

  echo ">> building ai-service"
  docker build -f "$REPO_ROOT/infra/docker/ai-service.prod.Dockerfile" \
    -t "$ECR_REGISTRY/$ECR_AI:latest" "$REPO_ROOT"
  docker push "$ECR_REGISTRY/$ECR_AI:latest"
else
  echo ">> skipping docker build (--skip-build)"
fi

# --- Target groups ---
create_tg() {
  local name="$1" path="$2"
  if aws_cmd elbv2 describe-target-groups --names "$name" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null | grep -q arn; then
    aws_cmd elbv2 describe-target-groups --names "$name" --query 'TargetGroups[0].TargetGroupArn' --output text
    return
  fi
  aws_cmd elbv2 create-target-group \
    --name "$name" \
    --protocol HTTP --port 3000 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path "$path" \
    --health-check-interval-seconds 30 \
    --query 'TargetGroups[0].TargetGroupArn' --output text
}

echo ">> target groups"
FE_TG="$(create_tg "$TG_FRONTEND" "/")"
BE_TG="$(create_tg "$TG_BACKEND" "/up")"

# --- ALB ---
if aws_cmd elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null | grep -q arn; then
  ALB_ARN="$(aws_cmd elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text)"
  echo ">> ALB $ALB_NAME exists"
else
  echo ">> creating ALB $ALB_NAME"
  ALB_ARN="$(aws_cmd elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets "$SUBNET_PUBLIC_1" "$SUBNET_PUBLIC_2" \
    --security-groups "$SG_ALB" \
    --scheme internet-facing \
    --type application \
    --query 'LoadBalancers[0].LoadBalancerArn' --output text)"
  sleep 10
fi

ALB_DNS="$(aws_cmd elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --query 'LoadBalancers[0].DNSName' --output text)"
echo "   ALB DNS: http://$ALB_DNS"

# Listener: default -> frontend only; rule /api/* -> backend
LISTENERS="$(aws_cmd elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`80`].ListenerArn' --output text)"
if [[ -z "$LISTENERS" || "$LISTENERS" == "None" ]]; then
  echo ">> creating HTTP:80 listener"
  LISTENER_ARN="$(aws_cmd elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP --port 80 \
    --default-actions "Type=forward,TargetGroupArn=$FE_TG" \
    --query 'Listeners[0].ListenerArn' --output text)"
else
  LISTENER_ARN="$LISTENERS"
  echo ">> updating default listener -> frontend only"
  aws_cmd elbv2 modify-listener \
    --listener-arn "$LISTENER_ARN" \
    --default-actions "Type=forward,TargetGroupArn=$FE_TG" >/dev/null
fi

# /api/* rule
RULE_EXISTS="$(aws_cmd elbv2 describe-rules --listener-arn "$LISTENER_ARN" \
  --query 'Rules[?Priority==`10`].RuleArn' --output text 2>/dev/null || true)"
if [[ -z "$RULE_EXISTS" || "$RULE_EXISTS" == "None" ]]; then
  echo ">> creating /api/* rule -> backend"
  aws_cmd elbv2 create-rule \
    --listener-arn "$LISTENER_ARN" \
    --priority 10 \
    --conditions "Field=path-pattern,Values=/api/*" \
    --actions "Type=forward,TargetGroupArn=$BE_TG" >/dev/null
fi

network_config() {
  local sg="$1"
  printf 'awsvpcConfiguration={subnets=[%s],securityGroups=[%s],assignPublicIp=ENABLED}' "$SUBNETS" "$sg"
}

create_service() {
  local name="$1" family="$2" sg="$3" desired="${4:-1}"
  local lb_container="${5:-}"
  local lb_tg="${6:-}"
  local net
  net="$(network_config "$sg")"

  if aws_cmd ecs describe-services --cluster "$ECS_CLUSTER" --services "$name" \
    --query 'services[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
    echo "   service $name exists - force new deployment"
    aws_cmd ecs update-service --cluster "$ECS_CLUSTER" --service "$name" --force-new-deployment >/dev/null
    return
  fi

  local rev
  rev="$(aws_cmd ecs describe-task-definition --task-definition "$family" \
    --query 'taskDefinition.revision' --output text)"

  if [[ -n "$lb_container" ]]; then
    aws_cmd ecs create-service \
      --cluster "$ECS_CLUSTER" \
      --service-name "$name" \
      --task-definition "${family}:${rev}" \
      --desired-count "$desired" \
      --launch-type FARGATE \
      --network-configuration "$net" \
      --load-balancers "targetGroupArn=$lb_tg,containerName=$lb_container,containerPort=3000" \
      >/dev/null
  else
    aws_cmd ecs create-service \
      --cluster "$ECS_CLUSTER" \
      --service-name "$name" \
      --task-definition "${family}:${rev}" \
      --desired-count "$desired" \
      --launch-type FARGATE \
      --network-configuration "$net" \
      >/dev/null
  fi
  echo "   created service $name"
}

echo ">> ECS services (public subnets only)"
create_service "$ECS_SERVICE_FRONTEND" "$TASK_FAMILY_FRONTEND" "$SG_ECS_FRONTEND" 1 "frontend" "$FE_TG"
create_service "$ECS_SERVICE_BACKEND" "$TASK_FAMILY_BACKEND" "$SG_ECS_BACKEND" 1 "backend" "$BE_TG"
create_service "$ECS_SERVICE_SIDEKIQ" "$TASK_FAMILY_SIDEKIQ" "$SG_ECS_SIDEKIQ" 1
create_service "$ECS_SERVICE_AI" "$TASK_FAMILY_AI" "$SG_ECS_AI" 1

echo ""
echo "=== Create complete ==="
echo "ALB URL:     http://$ALB_DNS"
echo ""
echo "Manual steps:"
echo "  1. Secrets Manager → $SECRET_NAME:"
echo "       CORS_ORIGINS=http://$ALB_DNS"
echo "  2. If Redis was recreated, set REDIS_URL (rediss://clustercfg....)"
echo "  3. If RDS was stopped: start it in RDS console"
echo "  4. After ai-service task is RUNNING, set AI_SERVICE_URL to http://<private-ip>:8000"
echo "     (or add ECS Service Connect later for a stable name)"
echo "  5. Force redeploy backend + sidekiq after secret updates"
echo ""
echo "Verify:"
echo "  curl -s -o /dev/null -w '%{http_code}' http://$ALB_DNS/"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE_FRONTEND $ECS_SERVICE_BACKEND --region $AWS_REGION"
