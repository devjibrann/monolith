FROM ruby:3.3-slim

# Install system dependencies
RUN apt-get update -qq && \
    apt-get install -y build-essential libpq-dev nodejs postgresql-client curl git pkg-config libyaml-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install application gems
COPY backend/Gemfile backend/Gemfile.lock ./
RUN bundle install

# Copy application code
COPY backend/ .

# Add a script to be executed every time the container starts.
COPY infra/scripts/entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
