# Global Health Platform

Monorepo structure:

- `frontend/`: Next.js public website (current production-facing app)
- `backend/`: Fastify + Prisma API/database scaffold for future runtime adapters

## Quick start

```bash
pnpm install
pnpm dev:frontend
pnpm dev:backend
```

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Backend is scaffold-only for now. Business logic, admin dashboard, auth workflows, and booking logic are intentionally not implemented yet.
