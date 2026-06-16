#!/usr/bin/env bash
# Park the lab to cut compute + data-store charges while keeping infra for a quick restart.
#
# - ECS: scale all services to 0 (keeps service definitions)
# - RDS: stop instance (storage still billed; auto-restarts after ~7 days)
# - ElastiCache: delete replication group (no pause API — recreate before next create-lab)
#
# Lighter than teardown-lab.sh (keeps ALB, ECS services, target groups, cluster).
#
# Usage:
#   cp infra/scripts/lab.conf.example infra/scripts/lab.conf
#   ./infra/scripts/clean-lab.sh
#   ./infra/scripts/clean-lab.sh --yes
#
# Bring back: start RDS → recreate Redis → ./infra/scripts/create-lab.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONF="${LAB_CONF:-$SCRIPT_DIR/lab.conf}"
if [[ ! -f "$CONF" ]]; then
  echo "Missing $CONF" >&2
  echo "Run: cp infra/scripts/lab.conf.example infra/scripts/lab.conf" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$CONF"

AUTO_YES=false
for arg in "$@"; do
  case "$arg" in
    --yes) AUTO_YES=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

aws_cmd() { aws --region "$AWS_REGION" "$@"; }

wait_for_ecs_tasks() {
  local cluster="$1" attempts="${2:-24}"
  local i=0
  while (( i < attempts )); do
    local running
    running="$(aws_cmd ecs list-tasks --cluster "$cluster" --desired-status RUNNING \
      --query 'length(taskArns)' --output text 2>/dev/null || echo 0)"
    if [[ "$running" == "0" || "$running" == "None" ]]; then
      return 0
    fi
    echo "   waiting for $running task(s) to stop..."
    sleep 10
    (( i++ )) || true
  done
  echo "   warning: tasks may still be stopping" >&2
}

echo "=== Monlith lab CLEAN (park) ==="
echo "Region:  $AWS_REGION"
echo "Cluster: $ECS_CLUSTER"
echo "RDS:     $RDS_INSTANCE_ID (STOP)"
echo "Redis:   $REDIS_REPLICATION_GROUP_ID (DELETE)"
echo ""
echo "Keeps:   ECS services (desired=0), ALB, cluster, secrets, ECR, VPC"
echo ""

if [[ "$AUTO_YES" != true ]]; then
  read -r -p "Continue? [y/N] " ans
  [[ "$ans" =~ ^[yY] ]] || exit 0
fi

# --- ECS: scale to 0 ---
if aws_cmd ecs describe-clusters --clusters "$ECS_CLUSTER" --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
  echo ">> ECS: scaling services on $ECS_CLUSTER to 0"
  mapfile -t SERVICES < <(aws_cmd ecs list-services --cluster "$ECS_CLUSTER" --query 'serviceArns[]' --output text \
    | tr '\t' '\n' | sed '/^$/d' || true)

  for arn in "${SERVICES[@]:-}"; do
    name="$(basename "$arn")"
    echo "   $name -> desired 0"
    aws_cmd ecs update-service --cluster "$ECS_CLUSTER" --service "$name" --desired-count 0 >/dev/null || true
  done

  if [[ ${#SERVICES[@]} -gt 0 ]]; then
    wait_for_ecs_tasks "$ECS_CLUSTER"
  fi
else
  echo ">> ECS cluster $ECS_CLUSTER not found (skip)"
fi

# --- RDS: stop (pause) ---
RDS_STATUS="$(aws_cmd rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE_ID" \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || true)"

if [[ -z "$RDS_STATUS" || "$RDS_STATUS" == "None" ]]; then
  echo ">> RDS $RDS_INSTANCE_ID not found (skip)"
elif [[ "$RDS_STATUS" == "stopped" || "$RDS_STATUS" == "stopping" ]]; then
  echo ">> RDS $RDS_INSTANCE_ID already $RDS_STATUS (skip)"
else
  echo ">> stopping RDS $RDS_INSTANCE_ID (was: $RDS_STATUS)"
  echo "   note: stopped RDS auto-restarts after ~7 days; storage is still billed"
  aws_cmd rds stop-db-instance --db-instance-identifier "$RDS_INSTANCE_ID" >/dev/null
fi

# --- ElastiCache: delete (no stop/pause API) ---
REDIS_STATUS="$(aws_cmd elasticache describe-replication-groups --replication-group-id "$REDIS_REPLICATION_GROUP_ID" \
  --query 'ReplicationGroups[0].Status' --output text 2>/dev/null || true)"

if [[ -z "$REDIS_STATUS" || "$REDIS_STATUS" == "None" ]]; then
  echo ">> Redis $REDIS_REPLICATION_GROUP_ID not found (skip)"
elif [[ "$REDIS_STATUS" == "deleting" ]]; then
  echo ">> Redis $REDIS_REPLICATION_GROUP_ID already deleting (skip)"
else
  echo ">> deleting Redis replication group $REDIS_REPLICATION_GROUP_ID (was: $REDIS_STATUS)"
  aws_cmd elasticache delete-replication-group \
    --replication-group-id "$REDIS_REPLICATION_GROUP_ID" \
    --no-retain-primary-cluster >/dev/null || true
  echo "   deletion is async (typically a few minutes)"
fi

echo ""
echo "=== Clean complete ==="
echo "Still incurring charges:"
echo "  - ALB ($ALB_NAME) if it exists"
echo "  - RDS storage while stopped"
echo "  - Secrets Manager, ECR images"
echo ""
echo "To bring the lab back:"
echo "  1. RDS console → Start DB instance: $RDS_INSTANCE_ID"
echo "  2. Recreate ElastiCache Redis ($REDIS_REPLICATION_GROUP_ID) in the same VPC/subnet group"
echo "  3. Update secret $SECRET_NAME → REDIS_URL=rediss://..."
echo "  4. ./infra/scripts/create-lab.sh"
echo ""
echo "Full teardown (delete ALB/services): ./infra/scripts/teardown-lab.sh"
