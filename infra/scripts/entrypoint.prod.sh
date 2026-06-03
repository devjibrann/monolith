#!/bin/bash
set -e

rm -f /app/tmp/pids/server.pid

if [[ "$*" == *"rails server"* ]] || [[ "$*" == *"rails s"* ]]; then
  echo "Preparing database..."
  bundle exec rails db:prepare
fi

exec "$@"
