FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (all workspaces)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# Build shared types
COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

# Generate Prisma client
COPY apps/api/prisma/ ./apps/api/prisma/
RUN npx --workspace=apps/api prisma generate

# Build API
COPY apps/api/ ./apps/api/
RUN npm run build -w apps/api

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
