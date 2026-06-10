#!/bin/sh
set -e

echo "Running database migrations..."
npx --workspace=apps/api prisma migrate deploy

echo "Seeding database..."
npx --workspace=apps/api ts-node apps/api/prisma/seed.ts || true

echo "Starting API..."
exec node apps/api/dist/main.js
