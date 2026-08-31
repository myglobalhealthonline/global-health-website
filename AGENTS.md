# AGENTS.md

Global Health — a telemedicine platform serving six markets (Ireland, Czechia,
Portugal, Spain, Romania, Brazil) in six languages.

- `frontend/` — Next.js 16 (App Router), React, Tailwind + hand-authored CSS
- `backend/` — Fastify 5, Prisma 7, PostgreSQL
- Package manager: `pnpm`. Type-check **per package**, not from the repo root.

## Read this before working here

**`CLAUDE.md` holds the repo conventions and is not loaded automatically — read it.**
It covers the two-file CSS split, the UI primitives to use instead of hand-rolling
dropdowns and tables, dependency-override mirroring, and the security-scanning rules.

For SEO work, start at `seo/README.md`. It routes agents to the canonical global
ledger and the relevant country evidence package. Read `docs/plans/seo-handover-codex.md`
for process; `docs/plans/seo-control-state.md` remains the only operational ledger,
roadmap and indexation watchlist.

## Conventions that are easy to get wrong

- **The Next middleware convention file here is `proxy.ts`, NOT `middleware.ts`.**
  Check framework conventions before adding any framework-level file.
- **Redirects live in `frontend/next.config.ts` and run BEFORE middleware.** Rule order
  matters: a broad rule above a precise one silently kills the precise one.
- **CSS is split in two.** `frontend/app/globals.css` is tokens, resets and the public
  site; `frontend/app/portal.css` is authenticated-portal-only. A selector belongs to
  exactly one of them, never both.
- **`backend/.env` points at PRODUCTION.** Dry-run and confirm before running any
  script that writes.
- **Type-check per package** — `pnpm --filter frontend`, `pnpm --filter backend`.

## Working in this clone

This clone is shared with concurrent sessions, as a standing condition rather than an
incident. Another session's uncommitted work can appear in the working tree without
warning.

- Run `git status` before staging, and **stage by explicit path**.
- Never `git add -A` or `git add .` here.
- `git log` is the source of truth for what shipped — a session's own account of what
  it committed can be wrong.
- Do not merge or push `main` unprompted.
