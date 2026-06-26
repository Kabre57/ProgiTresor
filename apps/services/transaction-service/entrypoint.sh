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
npx prisma generate

echo "Synchronizing database schema..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Running Prisma seed..."
  npx prisma db seed
fi

echo "Starting transaction-service..."
exec node dist/apps/services/transaction-service/src/index.js
