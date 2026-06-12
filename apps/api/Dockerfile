FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (all workspaces)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# Build shared types
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npm run build

# Generate Prisma client
COPY apps/api/prisma/ ./apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Build API — cd into workspace so nest-cli.json is found correctly
COPY apps/api/ ./apps/api/
RUN cd apps/api && npm run build

# Verify build output exists
RUN test -f apps/api/dist/main.js || (echo "ERROR: nest build did not produce dist/main.js" && exit 1)

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev

# Copy compiled output and Prisma artefacts from builder
COPY --from=builder /app/apps/api/dist          ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma   ./node_modules/.prisma
COPY apps/api/prisma/                            ./apps/api/prisma/

# Knowledge packs are read at runtime
COPY knowledge/ ./knowledge/
ENV KNOWLEDGE_ROOT=/app/knowledge

COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
