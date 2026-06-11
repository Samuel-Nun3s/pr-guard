#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx ts-node prisma/seed.ts || true

echo "Starting API..."
exec node dist/main.js
