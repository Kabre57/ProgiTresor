#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

echo "Waiting for database..."
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
  sleep 2
done

echo "Generating Prisma client..."
pnpm exec prisma generate

echo "Synchronizing database schema..."
pnpm exec prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Running Prisma seed..."
  pnpm exec prisma db seed
fi

echo "Starting order-service..."
exec node dist/apps/services/order-service/src/index.js
