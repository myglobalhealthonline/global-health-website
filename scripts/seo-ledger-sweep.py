"""Probe every URL the SEO control-state ledger asserts a production state for,
and report disagreements.

Run:  py scripts/seo-ledger-sweep.py

Motivated by SEO-GROWTH-002, which read "CLOSED - VERIFIED BY PRODUCTION CHECK
... returns 200 index, follow" while the URL actually returned 404. That row was
wrong for two days and nothing surfaced it. This asks whether it was one stale
row or a systematic problem with how CLOSED gets written.

Read-only. Prints a report; writes nothing.

────────────────────────────────────────────────────────────────────────────
READ THIS BEFORE TRUSTING A RESULT: the attribution rule
────────────────────────────────────────────────────────────────────────────

The first version of this script reported 20 disagreements and a systematic-rot
finding. All 20 were false. The bug: a ledger row reading

    `/pt/about` -> 308 -> `/about`

asserts 308 about the SOURCE only. It says nothing about `/about`'s own status
code — which is 200, as it should be. Reading "every code mentioned in the row
applies to every path in the row" manufactures a disagreement for every redirect
target in the file.

So: **codes are attributed to redirect sources only.** Rows naming several paths
and one code, with no arrow to disambiguate, are reported AMBIGUOUS and counted
neither way. Do not "simplify" this back.

This is the third instance of one failure shape in this workstream — a plausible
pattern derived from a systematically skewed read. The others were a truncated
GSC pull (1,000 rows sorted by clicks, which produced "Portugal is crawl-starved
at 10% coverage"; the per-country re-pull said ~65%) and diacritic-free Czech
keyword research (`lekar online` returned zero competitors, `lékař online` a full
field). All three would have produced confident wrong findings. All three were
caught by checking the instrument rather than the result.

────────────────────────────────────────────────────────────────────────────
ADJUDICATED RESULTS — 2026-08-14 run, so the next run starts corrected
────────────────────────────────────────────────────────────────────────────

54 distinct URLs across 66 row-claims: 16 AGREE, 2 flagged, 36 AMBIGUOUS, 0
unreachable. **Both flagged rows are attribution artefacts, not ledger errors.**
Verdict: SEO-GROWTH-002 was one stale row, NOT a systematic problem with how
CLOSED gets written. Judgements, so they are not re-derived from scratch:

  /ireland/en/blog (row SEO-GROWTH-009)
      The row's 308 belongs to `/post/*`, the redirect source. The blog hub
      itself correctly serves 200. ROW IS RIGHT.

  /pt/spain-doctors/dr-alfredo-del-valle (row SEO-GROWTH-011)
      The row's "200" describes the five `spain/{locale}` URLs. The same row
      separately calls this legacy path a dead stub. It 308s to a 200.
      ROW IS RIGHT.

  All 36 AMBIGUOUS rows were read individually and every one is consistent with
  production (sources 308, targets 200).

  The only genuine exception in the whole file was
  /czechia/cs/doctors/mudr-libor-hlavaty, 404 pending the deploy of 8189baa6.

SCOPE LIMIT, stated so the result is not over-read: this tests HTTP status codes
and redirect targets ONLY. It does not verify indexability, canonical tags,
sitemap membership or hreflang, and several CLOSED rows rest on exactly those.
SEO-GROWTH-002 failed in the status-code class, so the aim was right — but
"16 AGREE" is not a clean bill of health for every assertion in that document.
"""
import re
import sys
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

import os

LEDGER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "docs", "plans", "seo-control-state.md",
)
ORIGIN = "https://www.myglobalhealth.online"

# A path inside backticks. Skip anything templated - those are rule shapes, not
# URLs: `:slug`, `{lang}`, `…`, `*`, `(en|pt)`.
PATH_RE = re.compile(r"`(/[A-Za-z0-9%._~/<>-]*)`")
TEMPLATE = re.compile(r"[:{}*()|<>\u2026]")
CODE_RE = re.compile(r"\b(200|301|302|307|308|404|410|451|500)\b")


def rows(text):
    """Yield (line_no, line) for every markdown table row."""
    for i, line in enumerate(text.splitlines(), 1):
        s = line.strip()
        if s.startswith("|") and not re.fullmatch(r"\|[\s:|-]+\|", s):
            yield i, s


ARROW_RE = re.compile(
    r"`(/[^`]+)`\s*(?:\u2192|->)\s*(?:(\d{3})\s*(?:\u2192|->)\s*)?`(/[^`]+)`"
)


def claims(text):
    """(line_no, path, asserted_codes, asserted_target, ambiguous) per row.

    Attribution matters more than coverage here. A row reading `A` -> 308 -> `B`
    asserts 308 about A and says nothing about B's own status code, so the naive
    "every code in the row applies to every path in the row" reading manufactures
    disagreements. Codes are attributed to a redirect SOURCE only; when a row
    carries codes but no arrow and names more than one path, the attribution is
    genuinely unknowable from the text and the row is reported as AMBIGUOUS
    rather than counted either way.
    """
    out = []
    for lineno, line in rows(text):
        paths = [p for p in PATH_RE.findall(line) if not TEMPLATE.search(p)]
        if not paths:
            continue
        codes = set(CODE_RE.findall(line))
        arrows = [
            (a, c, b)
            for a, c, b in ARROW_RE.findall(line)
            if not TEMPLATE.search(b) and not TEMPLATE.search(a)
        ]
        if arrows:
            # Source gets the arrow's code (or any code in the row if the arrow
            # is bare); the target's own status is not claimed by this shape.
            targets = {b for _, _, b in arrows}
            for a, c, b in arrows:
                out.append((lineno, a, {c} if c else codes, b, False))
            for p in paths:
                if p not in targets and all(p != a for a, _, _ in arrows):
                    out.append((lineno, p, codes, None, len(paths) > 1))
            continue
        if not codes:
            continue
        ambiguous = len(paths) > 1
        for p in paths:
            out.append((lineno, p, codes, None, ambiguous))
    return out


def probe(path):
    req = urllib.request.Request(ORIGIN + path, method="GET",
                                 headers={"User-Agent": "ledger-sweep/1.0"})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    try:
        r = opener.open(req, timeout=30)
        return r.status, r.headers.get("Location")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location")
    except Exception as e:
        return None, f"ERROR {type(e).__name__}: {e}"


def main():
    text = open(LEDGER, encoding="utf-8").read()
    cl = claims(text)
    # Dedupe by path, keeping every line that claims it.
    by_path = {}
    for lineno, p, codes, target, ambiguous in cl:
        e = by_path.setdefault(
            p, {"lines": [], "codes": set(), "targets": set(), "ambiguous": True}
        )
        e["lines"].append(lineno)
        e["codes"] |= codes
        if target:
            e["targets"].add(target)
        # One unambiguous row is enough to make the path testable.
        if not ambiguous:
            e["ambiguous"] = False

    paths = sorted(by_path)
    print(f"{len(paths)} distinct URLs asserted across {len(cl)} ledger row-claims\n", flush=True)

    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(probe, paths))

    disagree, agree, unknown, ambiguous = [], [], [], []
    for p, (code, loc) in zip(paths, results):
        e = by_path[p]
        rec = {"path": p, "actual": code, "location": loc,
               "asserted_codes": sorted(e["codes"]), "asserted_targets": sorted(e["targets"]),
               "lines": e["lines"]}
        if code is None:
            unknown.append(rec)
        elif e["ambiguous"] and not e["targets"]:
            ambiguous.append(rec)
        elif e["codes"] and str(code) not in e["codes"]:
            rec["why"] = "status code differs from the asserted one"
            disagree.append(rec)
        elif e["targets"] and loc and not any(loc.rstrip("/").endswith(t.rstrip("/")) for t in e["targets"]):
            rec["why"] = "redirect target differs from the asserted destination"
            disagree.append(rec)
        elif e["targets"] and not loc:
            rec["why"] = "asserted a redirect; production does not redirect"
            disagree.append(rec)
        else:
            agree.append(rec)

    print(f"AGREE      {len(agree)}")
    print(f"DISAGREE   {len(disagree)}")
    print(f"AMBIGUOUS  {len(ambiguous)}  (row names several paths and one code; not counted either way)")
    print(f"UNREACHED  {len(unknown)}\n")
    for label, group in (("DISAGREE", disagree), ("UNREACHED", unknown), ("AMBIGUOUS", ambiguous)):
        if not group:
            continue
        print(f"== {label} ==")
        for r in group:
            print(json.dumps(r, ensure_ascii=False))
        print()


if __name__ == "__main__":
    sys.exit(main())
