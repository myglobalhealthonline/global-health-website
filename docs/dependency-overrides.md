# Dependency overrides — the mirroring rule

## Why root `pnpm.overrides` is NOT enough

This is a pnpm workspace, but each service (`frontend`, `backend`) is built and
deployed **standalone** — the deploy installs with `--ignore-workspace`, so the
child package is resolved on its own and the **root `package.json` `pnpm.overrides`
block is not applied**. A version pin that lives only in the root does nothing for
the deployed artifact.

**Rule:** any security-motivated version pin (transitive-CVE fix, forced-minimum,
etc.) MUST be mirrored into the `pnpm.overrides` block of **all three**
`package.json` files:

- `package.json` (root)
- `frontend/package.json`
- `backend/package.json`

Put a pin in whichever service actually pulls the vulnerable transitive dep, and
keep the root copy as the source of truth. If a pin is only relevant to one
service, it still belongs in that service's block — the root alone will not carry
it into the standalone deploy.

## Current override blocks (2026-07-25)

| Key | root | frontend | backend |
|-----|:----:|:--------:|:-------:|
| `sanitize-html` `^2.17.4` | ✓ | ✓ | ✓ |
| `hono` `4.12.25` | ✓ | — | ✓ |
| `@hono/node-server` `1.19.13` | ✓ | — | ✓ |
| `postcss` `8.5.23` | ✓ | ✓ | ✓ |
| `brace-expansion@5` `5.0.6` | ✓ | ✓ | ✓ |
| `esbuild` `0.28.1` | ✓ | ✓ | ✓ |
| `ws@7` `7.5.11` | ✓ | — | ✓ |
| `form-data` `4.0.6` | ✓ | — | ✓ |
| `vite` `8.0.16` | ✓ | ✓ | — |
| `@babel/core` `7.29.6` | ✓ | ✓ | ✓ |
| `js-yaml` `4.2.0` | ✓ | ✓ | ✓ |
| `fast-uri` `3.1.4` | ✓ | — | ✓ |
| `axios` `^1.18.1` | ✓ | — | ✓ |
| `find-my-way` `^9.7.0` | ✓ | — | ✓ |
| `sharp` `^0.35.3` | ✓ | ✓ | ✓ |

### 2026-07-25 CVE response

Eleven `high` advisories cleared (30 → 5 total, 0 high). Notes:

- `postcss` was pinned at `8.5.10` — below the `>=8.5.18` fix for
  GHSA-r28c-9q8g-f849. **The pin itself was holding the vulnerable version in
  place.** Bumped to `8.5.23` and mirrored into `backend` (its lockfile resolved
  `8.5.15`, under the floor — caught by `check-override-drift.mjs`).
- `sharp` needs a floor override, not just a dependency bump: `next` bundles its
  own copy, so `frontend>next>sharp` stayed on the vulnerable tree until the
  override forced it.
- `fast-uri` stays on the `3.x` line (`3.1.4`) — `ajv` requires `^3`, so the
  `4.x` latest would break it.

A `—` is intentional only when that service does not resolve the dependency at
all. If a service pulls the dep transitively, the pin must be present.

## CI check

CI should diff the security-relevant override keys across the three
`package.json` files and fail when a key present in root is missing (or set to a
different version) in a service that resolves it. This catches the failure mode
where a pin is added to root during a CVE response but never mirrored into the
service that actually ships.
