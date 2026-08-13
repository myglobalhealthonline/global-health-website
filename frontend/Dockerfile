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

# NEXT_PUBLIC_* vars are inlined by `next build` (webpack/SWC DefinePlugin),
# so they must exist in THIS build stage's env, not just the runtime
# container's. Railway auto-populates ARGs from service variables of the
# same name — without these, next.config.ts's images.remotePatterns silently
# builds with no backend-media host (only unsplash/pexels), which only broke
# visibly once <Image> stopped hardcoding unoptimized for our own media.
# Every NEXT_PUBLIC_* the app reads needs a line here. A var set on the
# Railway service but missing from this list is NOT a runtime fallback — the
# client bundle keeps a `process.env.X` lookup that resolves to undefined in
# the browser, so the feature is dead with nothing logged anywhere. That is
# exactly how GA4 and Clarity shipped dark from 2026-07-28: both ids folded
# to "" at build, and the components render null before consent is ever read.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS=$NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_CLARITY_PROJECT_ID=$NEXT_PUBLIC_CLARITY_PROJECT_ID

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

# `/api/og` renders every Open Graph card and needs sharp, whose libvips
# shared object lives in a separate `@img/sharp-libvips-linux-x64` package
# that standalone tracing missed — the route 500'd in production for every
# crawler while building and booting cleanly. next.config.ts now force-traces
# `@img*`; this asserts the copy in the image can actually dlopen before the
# build is allowed to ship.
# A plain `node -e "require('sharp')"` here would pass even when broken: node
# walks up to the builder's own /app/node_modules, which the runner never
# gets. Assert on the copied tree instead — the .so itself has to be there.
RUN LIBVIPS="$(find /app/standalone_out/node_modules -name 'libvips-cpp.so*' -print -quit)"; \
  if [ -z "$LIBVIPS" ]; then \
    echo "ERROR: libvips missing from standalone output — /api/og would 500 on every OG card"; \
    ls /app/standalone_out/node_modules/.pnpm 2>/dev/null | grep -i img || true; \
    exit 1; \
  fi; \
  echo "sharp/libvips present: $LIBVIPS"

# ── Stage 3: production runner (minimal) ─────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Railway injects HOSTNAME; Next standalone uses it for bind address.
# Force all-interface binding so the edge proxy can reach the container.
ENV HOSTNAME=0.0.0.0

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
