# DAST — OWASP ZAP (Passive Baseline)

**Audit date:** 2026-08-02
**Target:** `https://myglobalhealth.up.railway.app/` (`Dev-hassaan` staging deploy)
**Tool:** OWASP ZAP 2.17.0 (official cross-platform distribution, SHA-256 verified against the published release checksum before extraction), run via its Automation Framework (`-autorun`), not Docker (unavailable — see Phase 0)
**Audit mode:** Passive-only DAST. Spider + passive analysis. **No active scan was performed.**

## Safety gate

Per the plan, this phase required explicit confirmation before touching a deployed environment. The user confirmed: the staging deploy uses a separate database and S3 bucket from production, with no real patient data present. On that basis:

- An exclusion list for destructive/irreversible endpoints was built **before the first request was sent** — `/api/account/data-deletion`, `/api/admin/data-deletion-requests`, `/api/admin/patient-anonymize`, `/api/payments/webhook`, every `/api/cron/*` and `/api/internal/*` path, and anything matching `whatsapp`/`wasender` — encoded as `excludePaths` regexes in the ZAP context, so the spider itself never requests them, not just a post-hoc filter on results.
- **Passive scan only, as planned.** No active-scan job was included in the automation plan at all — the scanner never sent a mutating or attack-payload request; every alert below comes from ZAP observing real traffic (the spider's own GET requests) and analyzing responses, exactly like a browser crawling public pages would.
- An active scan against non-destructive read endpoints, mentioned in the plan as a possible follow-on step, was **not performed in this session** and would need its own separate go-ahead — it sends deliberate attack payloads, a materially different risk profile from passive observation.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| Download `ZAP_2.17.0_Crossplatform.zip` from the official GitHub release | Pass | SHA-256 verified locally against the release page's published checksum before extracting — `94c8f767b1c2e94f0db66b3ae56514d5e3f5a728ee1b6c798e0c8fe2d61fbff0` |
| Install OpenJDK 21 (ZAP requires a JRE; none was present) | Pass | |
| `zap.sh -cmd -autorun` with a custom passive-only automation plan (spider → passiveScan-wait → HTML report), `excludePaths` set on the context before any request | Pass | Spider found 12,104 URLs across the site's many country/language route permutations; completed in ~5 min 9 sec |
| Report review | Finding | 12 distinct alert types across Medium/Low/Informational risk — see below. Zero High or Critical. |
| ZAP's own log (`zap.log`) reviewed for scan-level errors | Pass | One benign `UrlCanonicalizer` warning about a non-ASCII test string in a JS chunk filename — not a finding |

## Findings

Zero High or Critical risk. All 12 alerts below are genuine (i.e., not excluded-path artifacts), each with an exact risk/confidence pairing from the report.

### Medium risk, High confidence (5) — all CSP/subresource-integrity related

- **CSP: Wildcard Directive** — `img-src` allows wildcard/overly-broad sources
- **CSP: script-src unsafe-inline**
- **CSP: style-src unsafe-inline**
- **Content Security Policy (CSP) Header Not Set** — on at least one crawled response
- **Sub Resource Integrity Attribute Missing**

These five corroborate, from a live production-adjacent deployment, the `S-CSP` finding already on record in `docs/archive/2026-audit-round-1/security-audit-2026-07-08.md` ("no effective script CSP by default"). This is now confirmed as still live on staging via independent, external observation — not just static source review.

### Medium risk, Low confidence (1)

- **Absence of Anti-CSRF Tokens** on `/login`'s form. **Context that changes the practical severity:** the auth cookie is `httpOnly: true, sameSite: "lax"` (confirmed in `backend/src/utils/auth-session.ts`). `SameSite=Lax` blocks the classic cross-site-form-POST CSRF pattern in modern browsers — it is a real, if partial, mitigation ZAP's rule doesn't know about (it only checks for the presence of a hidden token field). The residual risk is narrower: `SameSite=Lax` still permits the cookie on top-level cross-site GET navigation, which is the mechanism behind "login CSRF" (tricking a victim into being logged into an attacker-controlled account) — a real but different threat than the rule's generic warning implies.

### Low risk, Medium confidence (2)

- **Cookie No HttpOnly Flag** and **Cookie Without Secure Flag**, both on the **same cookie** — confirmed via the raw response headers captured in the report: `Set-Cookie: gh_locale=en; Path=/; ...; SameSite=lax` (no `HttpOnly`, no `Secure` attribute shown). **This is not the session/auth cookie** — `gh_auth` is confirmed elsewhere in code to be `httpOnly`+implicitly secure via `authCookieOptions()`. `gh_locale` only stores a UI language preference (per its own field comment in `prisma/schema.prisma`: seeds this cookie from `User.preferredLocale` on login) and carries no authentication capability — missing `HttpOnly` here is very likely intentional, since client-side JS needs to read it to sync the language switcher. Still, `Secure` costs nothing to add (this deployment is HTTPS-only) and should be set regardless of `HttpOnly` status.

### Informational (4)

- **Authentication Request Identified** (High confidence) — ZAP correctly recognized `/login` as an authentication endpoint; not an issue.
- **Content-Type Header Missing** and **Modern Web Application** (Medium confidence) — standard informational tags, no action needed.
- **Information Disclosure — Suspicious Comments** (Low confidence) — **confirmed false positive.** The report's own "Other info" field shows the exact matched text: `["$","meta","5",{"property":"og:title","content":"Online Doctor Consultations i` — this is Next.js's React Server Components streaming payload syntax (bracket/quote-heavy serialized JSON), which happens to contain the substring pattern (`\bWHERE\b`-adjacent heuristic) ZAP's generic comment-scanner flags. It is normal Next.js framework output, not a leaked SQL query, internal comment, or any other sensitive content.

## What this pass does not tell you

This was spider + passive analysis of unauthenticated, public-facing pages only. It says nothing about:
- Authenticated-portal behavior (patient/doctor/admin/corporate dashboards) — the spider only reached what an anonymous crawler reaches
- Anything an active scan would probe for (injection, broken auth mechanics under adversarial input, etc.)
- Authorization correctness — Phase 5's integration matrix is the right tool for that and already covers it far more precisely than DAST ever could

## Recommended ongoing practice

- Treat the 5 Medium/High-confidence CSP findings as confirmation, not new information — they match `S-CSP` already on record; prioritize accordingly rather than treating this as a fresh discovery.
- Add `Secure` to the `gh_locale` cookie's options (`authCookieOptions()`'s sibling cookie config, wherever `gh_locale` is set) — trivial, no downside on an HTTPS-only deployment.
- Do not act on the "Suspicious Comments" alert — it is a confirmed false positive from this specific scan, not a real information-disclosure issue.
- If an active scan is wanted later, it needs its own explicit go-ahead (separate from this passive-scan confirmation) given the different risk profile of sending deliberate attack payloads, plus its own exclusion list validation before running.
