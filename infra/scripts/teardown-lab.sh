#!/usr/bin/env bash
# Tear down billable lab resources in us-east-1.
# Keeps by default: VPC, security groups, IAM, ECR, Secrets Manager, task definition revisions.
#
# Usage:
#   cp infra/scripts/lab.conf.example infra/scripts/lab.conf
#   # edit lab.conf if your service names differ
#   ./infra/scripts/clean-lab.sh               # park: ECS=0, stop RDS, delete Redis (keeps ALB)
#   ./infra/scripts/teardown-lab.sh              # interactive confirm
#   ./infra/scripts/teardown-lab.sh --yes        # no prompt
#   ./infra/scripts/teardown-lab.sh --delete-rds # delete RDS instead of stop
#   ./infra/scripts/teardown-lab.sh --delete-logs

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
DELETE_RDS=false
DELETE_LOGS=false
DELETE_CLUSTER=false

for arg in "$@"; do
  case "$arg" in
    --yes) AUTO_YES=true ;;
    --delete-rds) DELETE_RDS=true ;;
    --delete-logs) DELETE_LOGS=true ;;
    --delete-cluster) DELETE_CLUSTER=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

aws_cmd() { aws --region "$AWS_REGION" "$@"; }

echo "=== Monlith lab TEARDOWN ==="
echo "Region:      $AWS_REGION"
echo "Cluster:     $ECS_CLUSTER"
echo "ALB:         $ALB_NAME"
echo "RDS:         $RDS_INSTANCE_ID ($([ "$DELETE_RDS" = true ] && echo DELETE || echo STOP))"
echo "Redis:       $REDIS_REPLICATION_GROUP_ID (DELETE)"
echo "Keeps:       VPC, SGs, IAM, ECR, secret '$SECRET_NAME'"
echo ""

if [[ "$AUTO_YES" != true ]]; then
  read -r -p "Continue? [y/N] " ans
  [[ "$ans" =~ ^[yY] ]] || exit 0
fi

# --- ECS: scale to 0 and delete services ---
if aws_cmd ecs describe-clusters --clusters "$ECS_CLUSTER" --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
  echo ">> ECS: listing services on $ECS_CLUSTER"
  mapfile -t SERVICES < <(aws_cmd ecs list-services --cluster "$ECS_CLUSTER" --query 'serviceArns[]' --output text | tr '\t' '\n' | sed '/^$/d' || true)

  for arn in "${SERVICES[@]:-}"; do
    name="$(basename "$arn")"
    echo "   scaling $name to 0"
    aws_cmd ecs update-service --cluster "$ECS_CLUSTER" --service "$name" --desired-count 0 >/dev/null || true
  done

  if [[ ${#SERVICES[@]} -gt 0 ]]; then
    echo "   waiting for tasks to stop..."
    sleep 15
  fi

  for arn in "${SERVICES[@]:-}"; do
    name="$(basename "$arn")"
    echo "   deleting service $name"
    aws_cmd ecs delete-service --cluster "$ECS_CLUSTER" --service "$name" --force >/dev/null || true
  done
else
  echo ">> ECS cluster $ECS_CLUSTER not found (skip)"
fi

if [[ "$DELETE_CLUSTER" = true ]]; then
  echo ">> deleting ECS cluster $ECS_CLUSTER"
  aws_cmd ecs delete-cluster --cluster "$ECS_CLUSTER" >/dev/null || true
fi

# --- ALB ---
if aws_cmd elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null | grep -q arn; then
  ALB_ARN="$(aws_cmd elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text)"
  echo ">> deleting ALB $ALB_NAME"
  aws_cmd elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN"
  echo "   waiting for ALB deletion..."
  sleep 20
else
  echo ">> ALB $ALB_NAME not found (skip)"
fi

for tg in "$TG_FRONTEND" "$TG_BACKEND"; do
  if aws_cmd elbv2 describe-target-groups --names "$tg" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null | grep -q arn; then
    TG_ARN="$(aws_cmd elbv2 describe-target-groups --names "$tg" --query 'TargetGroups[0].TargetGroupArn' --output text)"
    echo ">> deleting target group $tg"
    aws_cmd elbv2 delete-target-group --target-group-arn "$TG_ARN" || true
  fi
done

# --- RDS ---
if aws_cmd rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null | grep -q .; then
  if [[ "$DELETE_RDS" = true ]]; then
    echo ">> deleting RDS $RDS_INSTANCE_ID (final snapshot skipped — add --db-snapshot-identifier in script if needed)"
    aws_cmd rds delete-db-instance --db-instance-identifier "$RDS_INSTANCE_ID" --skip-final-snapshot || true
  else
    echo ">> stopping RDS $RDS_INSTANCE_ID (auto-restarts after ~7 days)"
    aws_cmd rds stop-db-instance --db-instance-identifier "$RDS_INSTANCE_ID" || true
  fi
else
  echo ">> RDS $RDS_INSTANCE_ID not found (skip)"
fi

# --- ElastiCache (no stop API) ---
if aws_cmd elasticache describe-replication-groups --replication-group-id "$REDIS_REPLICATION_GROUP_ID" --query 'ReplicationGroups[0].Status' --output text 2>/dev/null | grep -q .; then
  echo ">> deleting Redis replication group $REDIS_REPLICATION_GROUP_ID"
  aws_cmd elasticache delete-replication-group \
    --replication-group-id "$REDIS_REPLICATION_GROUP_ID" \
    --no-retain-primary-cluster || true
else
  echo ">> Redis $REDIS_REPLICATION_GROUP_ID not found (skip)"
fi

# --- CloudWatch logs (optional) ---
if [[ "$DELETE_LOGS" = true ]]; then
  for lg in /ecs/orgo-backend /ecs/orgo-sidekiq /ecs/orgo-frontend /ecs/orgo-ai-service; do
    echo ">> deleting log group $lg"
    aws_cmd logs delete-log-group --log-group-name "$lg" 2>/dev/null || true
  done
fi

echo ""
echo "=== Teardown complete ==="
echo "Still running (may incur small charges):"
echo "  - Secrets Manager: $SECRET_NAME"
echo "  - ECR images in $ECR_REGISTRY"
echo "  - RDS storage (if stopped, not deleted)"
echo "  - VPC / security groups (free)"
echo ""
echo "To recreate: ./infra/scripts/create-lab.sh"
