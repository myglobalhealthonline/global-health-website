# syntax=docker/dockerfile:1
# Railway: set service Root Directory to `frontend` so this Dockerfile is used.
# Ensures `next build` output (.next/) is in the same image as `next start`
# (fixes production-start-no-build-id when the builder omitted artifacts).

FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Keep devDependencies for `next build`; set production only after the build.

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate \
  && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

ENV NODE_ENV=production

EXPOSE 3000

# Railway sets PORT; Next reads it. Host 0.0.0.0 for container networking.
CMD ["sh", "-c", "exec pnpm exec next start -H 0.0.0.0 -p \"${PORT:-3000}\""]
