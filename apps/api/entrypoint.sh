#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
./node_modules/.bin/ts-node --transpile-only --compiler-options '{"module":"CommonJS"}' prisma/seed.ts || true

echo "Starting API..."
exec node dist/main.js
