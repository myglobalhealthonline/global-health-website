# syntax=docker/dockerfile:1
# Railway: set service Root Directory to `frontend` so this Dockerfile is used.
# Multi-stage build: only the standalone Next.js output reaches the final image,
# stripping devDependencies, source files, and build cache.

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

# Reproducible install — --frozen-lockfile fails the build if lockfile drifts.
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate \
  && pnpm install --frozen-lockfile --ignore-workspace

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate \
  && pnpm run build

# Next can emit standalone server.js at either:
# - .next/standalone/server.js
# - .next/standalone/<dir>/server.js (e.g. app/, frontend/) in monorepos.
# Normalize both layouts so runtime always has /app/server.js.
RUN STANDALONE=/app/.next/standalone; \
  SERVER_JS="$(find "$STANDALONE" -maxdepth 2 -type f -name server.js | head -n 1)"; \
  if [ -z "$SERVER_JS" ]; then \
    echo "ERROR: server.js not found in standalone output"; \
    find "$STANDALONE" -maxdepth 4 -name server.js 2>/dev/null || true; \
    ls -laR "$STANDALONE" 2>/dev/null || true; \
    exit 1; \
  fi; \
  SERVER_DIR="$(dirname "$SERVER_JS")"; \
  cp -a "$SERVER_DIR"/. /app/standalone_out

# ── Stage 3: production runner (minimal) ─────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone_out is normalized in the builder stage so server.js is always
# at the image root regardless of monorepo nesting.
COPY --from=builder --chown=nextjs:nodejs /app/standalone_out ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Railway sets PORT; the standalone server.js reads it automatically.
CMD ["sh", "-c", "exec node server.js"]
