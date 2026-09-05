# Frontend accessibility backlog

Findings raised while working on something else, deliberately **not** fixed in
the batch that found them. Each entry names the file, the standard, and why it
was deferred rather than folded in.

---

## A11Y-001 — `<html lang>` is hard-coded to `en` on every authenticated route

**Found:** 2026-09-05, during the frontend reliability batch (duplicate-submit
guards on the doctor/service admin editors). Not fixed there — it is a routing
and locale-resolution change, not a form-reliability one, and it touches a ROOT
layout that the whole portal renders under.

**Standard:** WCAG 2.2 §3.1.1 *Language of Page* (Level A).

**Where:**

| File | Line | Value |
| --- | --- | --- |
| `frontend/app/(portal)/layout.tsx` | 29 | `<RootDocument lang="en" …>` |
| `frontend/app/(redirect)/layout.tsx` | 19 | `<RootDocument lang="en">` |
| `frontend/app/global-error.tsx` | 58 | `<html lang="en" …>` |

`app/[country]/[lang]/layout.tsx` is already correct — it passes the resolved
`htmlLang` — so this is specific to the non-public roots.

**Why it matters:** the portal root covers `/admin`, `/doctor`, `/account`,
`/corporate`, `/login`, `/pay`, `/print`, `/share`. The doctor, account and
corporate portals render in the signed-in user's `User.preferredLocale`, which
today can be any of `en`, `cs`, `de`, `es`, `pt`, `ro`. A screen reader takes
its speech synthesizer from `<html lang>`, so a Czech or Romanian portal is
announced with English pronunciation rules — the page is read, but much of it
is not intelligible. It also mis-signals the language to translation tooling
and to the browser's own spellchecker in every free-text field the portals
render.

`/admin` itself is genuinely English-only (the admin layout loads no locale
bundle), so it is the one part of this root the current value is right for.

**Why it is not a one-line fix.** The existing comment on
`app/(portal)/layout.tsx:10` is accurate and load-bearing:

> Reading it server-side would need `cookies()`/`headers()` in a ROOT layout,
> the exact thing that un-statics everything below it (P-001).

So the fix has to pick a route that does not make the whole portal tree
dynamic. Options to weigh when the accessibility batch runs:

1. **Set it on the client after hydration** from the same preference the
   portals already read — smallest change, but the first paint is still
   announced as English and it does nothing for a no-JS reader.
2. **Split the root** so the locale-bearing portals (`/doctor`, `/account`,
   `/corporate`) sit under a layout that may read the preference, leaving
   `/admin`, `/login`, `/pay`, `/print`, `/share` on a static English root.
   Correct at first paint; the larger refactor.
3. **Put the locale in the URL** for those portals, as the public site does.
   Most consistent with the rest of the app and the biggest change.

Option 2 is the likely answer — it matches how `portal.css` is already scoped
per route group — but it needs measuring against P-001 before anyone commits
to it.

**Also check in the same pass:** `global-error.tsx` renders its own `<html>`
and cannot reach any locale context at all, so it may have to stay `en`; if so
that should be a stated decision with a comment, not an omission.
