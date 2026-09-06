# Frontend accessibility backlog

Findings raised while working on something else, deliberately **not** fixed in
the batch that found them. Each entry names the file, the standard, and why it
was deferred rather than folded in.

---

## A11Y-001 — `<html lang>` is hard-coded to `en` on every authenticated route

**Status: RESOLVED 2026-09-06 (Batch 15, closed out by Batch 15b)** for every
portal and authentication document — see *Resolution* at the end of this entry.
Batch 15 fixed the layout; Batch 15b fixed the `proxy.ts` bypass that had kept
`/admin/patients/{email}` and `/doctor/patients/{email}` out of reach of any
pathname-based rule (and, more seriously, out of reach of the portal CSP). One
thing is knowingly left: a deliberate residual limitation in `global-error.tsx`,
described below. The investigation below is kept as written; the measurement it
asked for was run and it changed the answer, which is worth preserving.

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

### Resolution (2026-09-06, Batch 15)

**None of the three options above was taken.** The measurement the entry asked
for — "it needs measuring against P-001" — found that the P-001 objection does
not apply to this root, so the fix is the one-file change options 2 and 3 were
proposed to avoid.

**What shipped.** `app/(portal)/layout.tsx` became an async server component
that resolves the document language per request:

```
pathname = (await headers()).get("x-gh-pathname") ?? "/"
lang     = /^\/(?:admin|unauthorized)(?:\/|$)/.test(pathname)
             ? "en"
             : toHtmlLang(await getPortalLocale())
```

It reuses the existing resolver (`getPortalLocale` → `getSelectedLocale`) and
the existing `toHtmlLang` mapper. No second locale resolver, no new cookie or
header, no locale in portal URLs, nothing added to the JWT, no change to the
language switcher's persistence. `RootDocument` is unchanged and still the one
shared document component; `cookieBanner={false}` is unchanged.

**Why the initial server HTML is correct without JavaScript.** The attribute is
computed during the server render and emitted in the response bytes. There is
no client component, no `useEffect`, and no inline script that patches
`documentElement.lang` — so `curl`, a crawler, a social unfurler and a screen
reader at first paint all read the real language. This is the same property
`app/[country]/[lang]/layout.tsx` already had.

**Why public static generation is unaffected.**

- The public trees P-001 is about live under *different root layouts*:
  `app/[country]/[lang]/layout.tsx` and `app/(global)/layout.tsx`. Neither was
  touched. The country/lang root still derives `<html lang>` from its own
  route param (`toHtmlLang(lang)`), never from request headers, and never
  imports `next/headers` — so its `generateStaticParams()` country × locale
  prerender is unchanged, as are the `generateStaticParams()` exports on
  `[country]/[lang]/{page,book,doctors,pricing,prescriptions,…}`.
- Sitemap and public SEO metadata generation are likewise outside this root
  and were not modified.
- Inside `(portal)`, every subtree was **already** request-dynamic before this
  change: the `(admin)/admin`, `account`, `doctor` and `corporate` layouts each
  call `getServerAuthUser()`/`cookies()`, and `/login`, `/register`, `/print/**`
  and `/share/**` are `force-dynamic`. An audit of all 168 `page.tsx`/
  `layout.tsx` files under `(portal)` found exactly one page that was
  statically generable and is now dynamic: `/unauthorized`, a `noindex` 403
  landing with fixed English copy and no data fetching. No route under
  `(portal)` declares `force-static`, `revalidate` or `dynamicParams`, so
  nothing conflicts.

**Why no extra backend request.** `getPortalLocale()` resolves through
`getSignedInLocale`, which is `React.cache`-wrapped and calls the
`React.cache`-wrapped `getServerAuthUser()` that the child portal layouts
already call. Same request → same memo, so the root layout's locale lookup
rides the round-trip the child layout was making anyway. It also short-circuits
on the absence of the auth cookie, so an anonymous visitor on `/login` pays no
backend call at all.

**Why `/admin` and `/unauthorized` stay English.** Neither loads a locale
bundle, so their copy genuinely is English-only; announcing English words under
`lang="cs"` is the defect, not the fix. `/unauthorized` matters more than it
looks — it is the 403 landing that `(admin)/admin/layout.tsx`,
`(doctor)/doctor/layout.tsx` and `lib/admin/require-admin-action.ts` redirect a
role-mismatched user to, so a Czech-preference patient who deep-links to
`/admin` lands there routinely. The accessibility review caught this: the first
cut of the fix pinned only `/admin` and would have introduced a *new* SC 3.1.1
mismatch on that page.

The branch keys off the proxy-stamped `x-gh-pathname` header, which `proxy.ts`
**sets** (never merges) on every request it processes, and no client-controlled
query parameter is consulted. The predicate
`^\/(?:admin|unauthorized)(?:\/|$)` is anchored and closed on a segment
boundary: `/administrator`, `/admin-tools`, `/adminish`, `/account/admin`,
`/doctor/admin-notes` and `/unauthorized-appeal` are all correctly excluded.

On `/admin` the locale resolver is not consulted at all.

**The gap this batch found, and Batch 15b closed — `proxy.ts` `PUBLIC_FILE`.**
Batch 15 keyed off `x-gh-pathname` and then discovered the header is not always
stamped. The proxy short-circuited for any pathname matching
`PUBLIC_FILE = /\.(.*)$/` — a dot **anywhere**, not a file extension.
`/admin/patients/{email}` and `/doctor/patients/{email}` link with
`encodeURIComponent(email)`, which does not encode `.`, so those two real routes
hit the short-circuit: no `x-gh-pathname`, no `x-gh-locale`/`x-gh-country`, no
set-or-delete of the client-controllable `x-gh-role`/`x-gh-email`, the edge role
gate skipped, and — the serious half — **no CSP header at all** on the two
routes that render PHI. The layouts' own `getServerAuthUser()` checks still
authorized every render, so it was never an access-control hole; it was a
missing portal nonce policy plus a silently absent request context. See
*Batch 15b* below for the fix.

**Language contract, by route family.**

| Route family | `<html lang>` |
| --- | --- |
| `/account/**`, `/doctor/**`, `/corporate/**` | signed-in `User.preferredLocale` → `gh_locale` / `x-gh-locale` → `Accept-Language` → `en` |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/corporate-invite/**` | same chain — matches the bundle those pages already load via `getPageLocale()` |
| `/pay/**`, `/print/**`, `/share/**` | same chain |
| `/admin`, `/admin/**`, `/unauthorized` | always `en` (hard-coded English copy) |
| `/admin/patients/{email}` | always `en` — `/admin/**`, reachable since Batch 15b |
| `/doctor/patients/{email}` | the locale chain — reachable since Batch 15b |
| `/{country}/{lang}/**` | unchanged: the `[lang]` route param |
| `/` and the other `(global)` pages | unchanged |

The signed-in preference still wins over the shared public-site `gh_locale`
cookie — that ordering lives in `getSelectedLocale()` and was not altered, so
the bug where browsing a `/{country}/{lang}` URL flipped the portal's language
mid-session stays fixed.

**Residual limitation — `app/global-error.tsx` keeps `lang="en"` (deliberate,
and it is a real defect, not a non-issue).** `publicErrorCopy()`
(`app/_components/error-recovery.ts:96-101`) reads `gh_locale` from
`document.cookie`, so this boundary already renders Czech, German, Spanish,
Portuguese or Romanian error copy — inside `<html lang="en">`. SC 3.1.1 fails
here, and stating it as "cannot reach a locale" would be too generous: it
reaches one, just not in time or in a form the attribute can safely use.

It stays this way because every fix is worse than the defect. Reaching this
boundary means the whole document was replaced, taking the router and every
server context with it, so there is no request state to read; the cookie is
legible only once the component is already running on the client. On the SSR
path (a root layout that threw) the server would emit `en` and the client would
then have to rewrite the attribute — post-hydration DOM mutation on `<html>`,
precisely the approach this batch rejected for the portal, on the one screen a
user only reaches when everything else has already failed. Weakening the
boundary's recovery behaviour to localize an error message is not a good trade.
The reasoning is recorded in a comment at `frontend/app/global-error.tsx`; if
it is ever revisited, the honest fix is a server-rendered error path, not a
client-side `lang` patch.

`app/(redirect)/layout.tsx` also keeps `lang="en"`, verified rather than
assumed: `/{country}` only ever throws a `redirect()` to `/{country}/{lang}`
and serves no readable content, so there is no language for a user agent to
announce.

**Tests.** `frontend/tests/unit/portal-document-lang.test.tsx` — 66 test cases
covering the six-locale mapping, case-insensitive matching, unsupported and
missing-value fallback, every portal and auth route family, the English-only
boundary including `/administrator`, `/admin-tools`, `/account/admin` and
`/unauthorized-appeal`, the public root staying params-based, the single shared
document component, and the absence of any client-side or inline-script
language patching. Captured RED first: 31 failures against the pre-fix layout,
then 6 more (LANG-6) against the pre-fix proxy.

### Batch 15b (2026-09-06) — the `proxy.ts` dotted-path bypass

**Root cause.** `PUBLIC_FILE = /\.(.*)$/` tested the *pathname*. A pathname
cannot answer "is this a file": a patient address ends `.com`, `.pt` or `.org`,
and a slug can be `record.v2`, so narrowing the regex to a trailing extension
would not have fixed it either. What does answer it is the request itself.

**The rule now.** One predicate at the early-return boundary,
`isStaticAssetRequest(request)`, which bypasses only when `Sec-Fetch-Dest` is
one of `image`, `font`, `style`, `audio`, `video`, `track`. The browser sets
that header from the fetch that initiated the request and script cannot forge it
(it is a forbidden header name). It is fail-safe by construction: a client that
sends none — curl, a crawler, an older browser — matches nothing and gets the
full treatment, at the cost of a locale resolve and a local JWT verify on a
handful of `/public` files. `/_next/static`, `/_next/image`, `/favicon.ico` and
`/api/**` are unchanged, still excluded by the matcher and the explicit prefix
checks. Nothing else in the proxy moved: no change to the role matrix, the
410-Gone list, the trailing-slash collapse, the Memed appointment CSP exception,
or the Server Action passthrough.

**Two things the review pass caught, and the fix now carries.**

1. *The skip path never scrubbed the trusted headers.* `Sec-Fetch-Dest` is
   browser-set and forbidden to script, but a non-browser client can put any
   value on it, so "only assets take the skip path" is a browser-context
   guarantee and not a server-side one — `curl -H 'Sec-Fetch-Dest: image'` takes
   it for any path. On that path `x-gh-pathname`/`x-gh-role`/`x-gh-email`/
   `x-nonce`/`Content-Security-Policy` reached the render unmodified. That was
   equally true of the old code (for `/_next`, `/api`, `favicon.ico` and every
   dotted path), and it has no authorization consequence today — the portal
   layouts verify the session against the backend and nothing downstream reads
   `x-gh-role` for a decision — but it contradicts the stated invariant. The
   skip path now returns through `passThrough()`, which deletes any of those
   headers the client sent (and allocates nothing when none were sent).
2. *`Set-Cookie` could land on a shared-cacheable asset response.* Because every
   `/public` path carries a dot, the old shortcut is the only reason the
   `gh_locale` / `gh-auth-hint` writes at the end of `proxy()` never met one.
   With the shortcut narrowed, a metadata-less client reaches them for a real
   asset — and `next.config.ts` stamps
   `/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)` with
   `public, max-age=3600, must-revalidate`, no `private`, no `Vary: Cookie`,
   behind a CDN. Both writes are now skipped for `CACHEABLE_ASSET_PATH`. That is
   an extension test used deliberately, in the one place it is the right
   instrument: it has to agree with an extension-based config rule (a test reads
   that rule out of `next.config.ts` and asserts the two match), and it decides
   caching, never authorization — the CSP, the role gate and the header scrub
   have all already run by that point. Accepted consequence: a patient whose
   address ends in one of those extensions gets no cookie refresh on their own
   record page; both cookies are cosmetic.

**Behaviour change, stated exactly.** A request that is not a declared
subresource fetch is now processed even when its path contains a dot. Three
consequences beyond the intended fix, all deliberate: a direct navigation to a
`/public` URL (e.g. pasting an `.svg` address into the address bar) is now
processed and collects a CSP; a `/public` file fetched by a client that sends no
`Sec-Fetch-Dest` is likewise processed rather than short-circuited (both still
serve the file); and a client that puts a `x-gh-*` / `x-nonce` / CSP header on a
skipped request now has it deleted rather than forwarded.

**Tests.** `frontend/tests/unit/proxy-static-asset-bypass.test.ts` — 108 test
cases over eight invariants: dotted documents processed on document/RSC/
prefetch/Server-Action/no-`Sec-Fetch-Dest` requests; only declared subresource
fetches bypassing; dotted-versus-dotless role parity across ADMIN,
SUPER_ADMIN, LOCAL_ADMIN, DOCTOR, PATIENT, CORPORATE_ADMIN, unauthenticated, an
unparseable cookie and the production missing-key fail-closed path; the portal
nonce CSP and a fresh nonce per request; spoofed `x-gh-*` / `x-nonce` / CSP
request headers overwritten or deleted on the processed path AND scrubbed on the
skip path; no `Set-Cookie` on a shared-cacheable asset response, with the
extension list checked against `next.config.ts`; and real `/public` assets never
becoming login redirects. All fixtures synthetic (`example.test`); no PHI, no
network. Captured RED first: 63 failures in that file plus 6 in the language
file, 69 in total, against the pre-fix proxy — then 19 more for the two
review-pass closures above.

**Still open after this batch:** the `global-error.tsx` residual limitation
above (accepted, not scheduled). Nothing else.
