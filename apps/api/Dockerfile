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

# Build API — set WORKDIR so nest-cli.json and tsconfig.json are found correctly
COPY apps/api/ ./apps/api/
WORKDIR /app/apps/api
RUN npm run build
RUN ls -la dist/ && echo "Build succeeded"

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
