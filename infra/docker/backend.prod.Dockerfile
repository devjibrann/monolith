# Production Rails API (also used for Sidekiq — override CMD in ECS task definition).
# Build from repo root: docker build -f infra/docker/backend.prod.Dockerfile .

FROM ruby:3.3-slim AS base

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      build-essential libpq-dev postgresql-client curl git pkg-config libyaml-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_WITHOUT="development:test" \
    BUNDLE_PATH=/usr/local/bundle

FROM base AS build

COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle "${BUNDLE_PATH}"/ruby/*/cache

COPY backend/ .

FROM base AS runtime

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends libpq-dev postgresql-client curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app

COPY infra/scripts/entrypoint.prod.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
