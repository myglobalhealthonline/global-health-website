# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY lib ./lib

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate \
  && pnpm install --no-frozen-lockfile \
  && pnpm run build

EXPOSE 4000

CMD ["sh", "-c", "pnpm db:deploy && exec pnpm start"]
