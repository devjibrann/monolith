#!/bin/bash
set -e

# Docker Compose bind-mounts ./backend, so Gemfile.lock on the host can be newer than gems
# baked into the image (or stale BuildKit cache). Install missing gems before boot.
if ! bundle check >/dev/null 2>&1; then
  echo "Gemfile.lock not satisfied in this container; running bundle install..."
  bundle install
fi

# Remove a potentially pre-existing server.pid for Rails.
rm -f /app/tmp/pids/server.pid

# Run database migrations/setup if the command is starting the server
if [[ "$*" == *"rails server"* ]] || [[ "$*" == *"rails s"* ]]; then
  echo "Preparing database..."
  bundle exec rails db:prepare
fi

# Then exec the container's main process
exec "$@"
