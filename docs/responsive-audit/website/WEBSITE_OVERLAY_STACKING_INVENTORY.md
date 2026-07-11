# Website Overlay & Stacking Inventory

Audit date: 2026-07-11 · Static analysis. "Fails?" verdicts: **Yes** = mechanism confirmed in code; **Latent** = safe today, breaks on foreseeable change; **No** = verified safe; **Unverified** = needs runtime repro.

Proposed layer tokens referenced below are defined in `../shared/RESPONSIVE_DESIGN_SYSTEM_PLAN.md` §1.2.

| ID | Scope | Route | File | Component | Overlay type | Portalled? | Effective layer / z-index | Clipping ancestor(s) | Stacking-context creator(s) | Fails? | Reproduction | Root cause | Fix (token/portal/structure) | Severity |
|----|-------|-------|------|-----------|--------------|------------|---------------------------|----------------------|------------------------------|--------|--------------|------------|-------------------------------|----------|
| WO-01 | Website | all | components/layout/MobileNav.tsx:153-349 | MobileNav | Drawer (Radix Dialog) | Yes (Dialog.Portal :164) | z-50 overlay+content (:165-166) | none (body-mounted) | escapes header contexts via portal | No | — | — | map to `--z-drawer`; keep | Low |
| WO-02 | Website | in-country | components/layout/SectionNav.tsx:95-152 | Services dropdown | DropdownMenu (Radix) | Yes (Portal :107) | z-50 (:113-114) | none | dropdown content itself uses gh2-glass (backdrop-filter) — harmless inside portal | No | — | — | map to `--z-dropdown` | Low |
| WO-03 | Website | all | components/layout/CountrySwitcher.tsx:114-176 | Country switcher | Custom dropdown | **No** (absolute sibling) | z-50 (:117) | none TODAY — SiteHeader chain verified free of overflow-hidden | header backdrop-filter (HeaderScrollShell.tsx:44-46) creates context; dropdown is inside it (works because same context) | Latent | add any `overflow-hidden`/rounded-clip to a header wrapper → clipped | manual absolute positioning, no portal, no collision handling | migrate to AppMenu (Radix, portalled, `--z-dropdown`) | Medium |
| WO-04 | Website | all | components/layout/LanguageSwitcher.tsx:109-199 | Language switcher | Custom dropdown | **No** | z-50 (:112) | same as WO-03 | same | Latent | same | same (independent duplicate implementation) | same as WO-03 | Medium |
| WO-05 | Website | homepage | components/sections/SameDayBooking.tsx:277,300-344 | Booking language listbox | Custom dropdown | **No** | z-50 | **`.gh-sameday` card `overflow-hidden` (Tailwind class, :277)** — clips absolute descendants regardless of z-index | card glass (backdrop-filter via gh-sameday) | **Yes (static-confirmed mechanism)** | homepage, open language dropdown when list (≤240px, :317 `max-h-[240px]`) extends past card bottom — e.g. many languages, short card, narrow width | overlay not portalled + ancestor `overflow:hidden` | portal listbox via AppMenu at `--z-dropdown`, or scope the overflow-hidden to decorative child only | **High** |
| WO-06 | Website | /doctors + directories | components/sections/DoctorFilters.tsx:78-100 + globals.css:3111-3119 | Filter panels | Native `<details>` dropdown | **No** | z-20 (globals.css:3115); wrapper z-30 (:58) | section wrappers (none with overflow-hidden found; viewport edge is the clip) | none needed — failure is positioning | **Yes (static-confirmed mechanism)** | 640–1024px: wrapped filter chip near right edge → `absolute left-0` panel extends past viewport right; also: no outside-click/Escape close, multiple panels can stack open | `position:absolute; left:0` with zero collision detection, non-portalled, below other overlay layers (z-20) | AppMenu (Radix Popover, collision-aware, portalled, `--z-dropdown`) | **High** |
| WO-07 | Website | all | globals.css:669-674 + HeaderScrollShell.tsx:37-77 | Sticky header | Sticky container | n/a | z-40 | n/a | `position:sticky`+z-index; scroll-toggled backdrop-filter → containing block for any future `fixed` descendant | Latent | placing a `position:fixed` element inside header while blurred → positions relative to header, not viewport | backdrop-filter containing-block rule | rule: no fixed descendants inside header; map to `--z-header` | Low |
| WO-08 | Website | mobile | components/sections/StickyBookingCTA.tsx:25 | Book CTA bar | Fixed bar | No (fine — viewport-level) | z-40 | n/a | none above it | No | — | — | `--z-fixed-bar`; fix substring route-match (:12,22) | Low |
| WO-09 | Website | cart/checkout mobile | components/cart/MobileOrderTotalBar.tsx:47-53 | Order total bar | Fixed bar | No (fine) | z-40 | n/a | own backdrop-filter (self-contained, is itself fixed) | No | — | — | `--z-fixed-bar` | Low |
| WO-10 | Website | all | components/compliance/CookieBanner.tsx:60-65 | Cookie banner | Fixed banner | No (fine) | z-50 | n/a | none | No — bottom-24/bottom-4 offset vs CTA bar is intentional | — | — | `--z-fixed-bar`; keep offset | Low |
| WO-11 | Website | all | components/cart/CartIcon.tsx | Cart badge | In-flow badge | n/a | absolute micro-layer | none | none | No | — | — | none | Low |
| WO-12 | Website | homepage/services | ServiceCatalog.tsx:300,344 | Tile actions vs overlay link | In-card layering | n/a | z-10 over z-[1] | card overflow (contains only in-card content) | card glass | No | — | — | map to `--z-raised`/`--z-base` for scale hygiene | Low |
| WO-13 | Website | `/` gate | CountryEntryGate.module.css:7,229,244 | Entry gate bg + panel | Fixed background layer | n/a | bg fixed behind content | n/a | `backdrop-filter` panel + `translateZ(0)` globe (documented deliberate GPU isolation) | No | — | — | none | Low |
| WO-14 | Website | /faq | FAQTabs.tsx:17 | Tab strip | Scroll strip (not overlay) | n/a | — | strip itself scrolls; no menu triggers inside | none | No | — | — | none (affordance issue only, see WS-21) | Low |
| WO-15 | Website | auth | GH2PagePrimitives.tsx (GH2AuthShell aside `overflow-hidden`) | Auth brand aside | Decorative clip | n/a | — | decorative only, no overlay triggers inside | — | No | — | — | none | Low |

## Public-site stacking-context creator map (summary)

| Creator | Where | Contains / must be beaten by |
|---|---|---|
| `.gh-header-sticky` sticky+z-40 (globals.css:669-674) | header | switcher dropdowns (inside), portalled nav content (escapes) |
| Scroll-toggled backdrop-filter (HeaderScrollShell.tsx:44-46,72-73) | header shell ×2 | latent containing-block trap for fixed descendants |
| Glass classes `gh2-glass-*` (38 backdrop-filter uses in globals.css) | cards/sections/dropdown skins | safe when overlay content is portalled; clipping trap when combined with overflow-hidden + non-portalled overlays (WO-05 is the live instance) |
| `.gh-medical-pattern` `overflow:clip` (globals.css:2564-2571) | pattern sections | precedent: `clip` chosen over `hidden` to keep `position:sticky` descendants working — follow this pattern |
| `isolate` on PageHero section | hero | in-hero decoration only |
| `@media (pointer:coarse)` fallback (globals.css:3587-3698, 2105) | touch devices | kills backdrop-filter (Android matrix-glitch fix) — layer semantics must not depend on blur being present |

## Verification steps (runtime, pending)

1. WO-05: homepage at 360–480px, open language dropdown with ≥6 languages configured → assert listbox fully visible (`document.elementFromPoint` on last item center).
2. WO-06: /doctors at 680px, 768px, 1024px; open right-most filter chip panel → assert `getBoundingClientRect().right <= innerWidth`; open two panels sequentially → assert first closes (currently will not).
3. WO-03/04: no active repro; add regression assertion after any header wrapper change.
4. All: 200% zoom repeat of 1–2.
