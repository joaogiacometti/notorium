#!/usr/bin/env bash
set -e

export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/notorium_e2e"
export REDIS_URL="redis://localhost:6380"
export BETTER_AUTH_URL="http://127.0.0.1:3001"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:3001"

cleanup() {
  echo "Cleaning up E2E infrastructure..."
  docker compose -f compose.e2e.yml down -v
}

trap cleanup EXIT

echo "Starting E2E infrastructure..."
docker compose -f compose.e2e.yml up -d --wait

echo "Running database migrations..."
bun run db:migrate

echo "Running Playwright tests..."
playwright test "$@"
