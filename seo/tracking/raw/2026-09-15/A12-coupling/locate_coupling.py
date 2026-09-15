#!/usr/bin/env python
"""A12-locate: find single-market coupling in shared templates/modules.

Read-only audit script. Run from anywhere; paths are resolved relative to the
repo root (four levels up from this file: seo/tracking/raw/<date>/A12-coupling/).

Usage: python locate_coupling.py
Outputs (written next to this script):
    hits.csv, modules.csv, scripts.csv, summary.json

ponytail: single-pass line scanner with regex heuristics, not an AST parser.
Good enough for a locate/count pass an Opus agent will classify afterwards;
upgrade to a real TS parser only if precision on context_kind starts mattering.
"""
import csv
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))

SCAN_ROOTS = [
    "frontend/app",
    "frontend/lib",
    "frontend/components",
    "frontend/proxy.ts",
    "frontend/next.config.ts",
    "backend/src",
    "backend/scripts",
]

CODE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".cts", ".json"}
EXCLUDE_DIRS = {"node_modules", ".next", "dist", "build", "coverage", ".git", ".turbo"}

CODES = ["ie", "cz", "pt", "es", "ro", "br"]
SLUGS = ["ireland", "czechia", "portugal", "spain", "romania", "brazil"]
SLUG_TO_CODE = dict(zip(SLUGS, CODES))
CODE_TO_SLUG = dict(zip(CODES, SLUGS))
LANG_AMBIGUOUS_CODES = {"pt", "es", "ro"}  # also ISO language codes

TEST_RE = re.compile(r"(\.test\.|\.spec\.)")
TEST_DIR_RE = re.compile(r"(^|[\\/])(__tests__|tests)([\\/]|$)")

# ---------------------------------------------------------------------------
# Regexes (also dumped verbatim into summary.json)
# ---------------------------------------------------------------------------
REGEXES = {
    "case": r"""\bcase\s+(['"])(ie|cz|pt|es|ro|br|ireland|czechia|portugal|spain|romania|brazil)\1\s*:""",
    "compare": r"""(===|!==|==)\s*(['"])(ie|cz|pt|es|ro|br)\2|(['"])(ie|cz|pt|es|ro|br)\4\s*(===|!==|==)""",
    "array_bracket": r"""\[[^\[\]\n]*\]""",
    "array_code_token": r"""(['"])(ie|cz|pt|es|ro|br)\1""",
    "ident": r"""\b(?:is|prefer|only|for|use)?(?:Ireland|Czech(?:ia)?|Portugal|Spain|Romania|Brazil)(?:Only|Extras|Copy|Faq|Faqs|Seo|Override|Bundle)?\b""",
    "slug_literal": r"""(['"])(ireland|czechia|portugal|spain|romania|brazil)\1""",
    "objkey": r"""(?:^|[{,]\s*)(['"]?)(ie|cz|pt|es|ro|br)\1\s*:(?!:)""",
    "import_path": r"""(?:from\s+|require\(\s*)(['"])([^'"]*(?:ireland|czechia|portugal|spain|romania|brazil)[^'"]*)\1""",
    "countrynames": r"""countryNames\??\.\[[^\]]*\]|countryNames\[[^\]]*\]""",
    "route_check": r"""\.startsWith\(\s*(['"])\/(ireland|czechia|portugal|spain|romania|brazil)""",
}
RX = {k: re.compile(v) for k, v in REGEXES.items()}

FUNC_DECL_RE = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)"
)
CLASS_DECL_RE = re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z0-9_$]+)")
CONST_DECL_RE = re.compile(
    r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*[:=]"
)


def is_test_path(relpath):
    return bool(TEST_RE.search(relpath) or TEST_DIR_RE.search(relpath))


def iter_files():
    for root_rel in SCAN_ROOTS:
        abs_root = os.path.join(REPO_ROOT, root_rel)
        if os.path.isfile(abs_root):
            yield root_rel.replace("\\", "/")
            continue
        if not os.path.isdir(abs_root):
            continue
        for dirpath, dirnames, filenames in os.walk(abs_root):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for fn in filenames:
                ext = os.path.splitext(fn)[1]
                if ext not in CODE_EXTS:
                    continue
                abspath = os.path.join(dirpath, fn)
                relpath = os.path.relpath(abspath, REPO_ROOT).replace("\\", "/")
                yield relpath


def read_lines(relpath):
    abspath = os.path.join(REPO_ROOT, relpath)
    try:
        with open(abspath, "r", encoding="utf-8", errors="replace") as f:
            return f.read().splitlines()
    except OSError:
        return []


def build_symbol_index(lines):
    """line_no (1-based) -> nearest enclosing symbol name declared above it."""
    decls = []  # (line_no, name)
    for i, line in enumerate(lines, start=1):
        m = FUNC_DECL_RE.match(line) or CLASS_DECL_RE.match(line) or CONST_DECL_RE.match(line)
        if m:
            decls.append((i, m.group(1)))
    return decls


def nearest_symbol(decls, line_no):
    name = ""
    for ln, nm in decls:
        if ln <= line_no:
            name = nm
        else:
            break
    return name


def route_or_template(relpath):
    parts = relpath.split("/")
    if parts[0] == "frontend" and len(parts) > 1 and parts[1] == "app":
        route_parts = parts[2:]
        base = route_parts[-1] if route_parts else ""
        leaf_files = {
            "page.tsx", "page.ts", "route.ts", "layout.tsx", "layout.ts",
            "loading.tsx", "error.tsx", "not-found.tsx", "metadata.ts",
        }
        if base in leaf_files:
            route_dir = "/".join(route_parts[:-1]) or "/"
            return "app/%s (%s route template)" % (route_dir, base)
        return "app/%s (app component)" % "/".join(route_parts)
    if "lib" in parts:
        idx = parts.index("lib")
        return "%s/lib/%s (module)" % (parts[0], "/".join(parts[idx + 1:]))
    if "components" in parts:
        idx = parts.index("components")
        return "%s/components/%s (component)" % (parts[0], "/".join(parts[idx + 1:]))
    if parts[0] == "backend" and "scripts" in parts:
        return "backend/scripts/%s (script)" % "/".join(parts[2:])
    if parts[0] == "backend" and "src" in parts:
        idx = parts.index("src")
        return "backend/src/%s (module)" % "/".join(parts[idx + 1:])
    if relpath == "frontend/proxy.ts":
        return "proxy.ts (edge middleware)"
    if relpath == "frontend/next.config.ts":
        return "next.config.ts (build config)"
    return relpath


def find_next_config_redirect_span(lines):
    """Return (start_idx, end_idx) 0-based, inclusive, of the redirects()
    function body in next.config.ts, or None."""
    start = None
    for i, line in enumerate(lines):
        if re.search(r"\basync\s+redirects\s*\(|^\s*redirects\s*\(", line):
            start = i
            break
    if start is None:
        return None
    depth = 0
    seen_open = False
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == "{":
                depth += 1
                seen_open = True
            elif ch == "}":
                depth -= 1
        if seen_open and depth <= 0:
            return (start, i)
    return (start, len(lines) - 1)


def markets_in_text(text):
    found = []
    low = text.lower()
    for code, slug in CODE_TO_SLUG.items():
        # word-boundary-ish check for the bare code inside quotes, and slug name
        if re.search(r"""(['"])%s\1""" % code, text) or slug in low:
            found.append(code)
    # de-dup, keep stable order
    seen = set()
    out = []
    for c in found:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def classify_context(line, kind_hint, match_start, match_end):
    tail = line[match_end:]
    if kind_hint == "case":
        return "switch_case"
    if kind_hint == "array":
        return "array_literal"
    if kind_hint == "countrynames":
        return "object_key"
    if kind_hint == "import":
        return "import_path"
    if re.search(r"case\s+['\"]", line):
        return "switch_case"
    if re.search(r"cache", line, re.IGNORECASE) and re.search(r"[`'\"]", line):
        return "cache_key"
    if kind_hint == "compare" or re.search(r"(===|!==|==)", line):
        if "?" in tail and ":" in tail.split("?", 1)[-1]:
            return "ternary"
        return "condition"
    if kind_hint == "route_check":
        return "string_compare"
    if re.search(r"\.(includes|startsWith|endsWith|indexOf)\s*\(", line):
        return "string_compare"
    if re.search(r"(?:^|[{,]\s*)['\"]?(ie|cz|pt|es|ro|br|ireland|czechia|portugal|spain|romania|brazil)['\"]?\s*:(?!:)", line):
        return "object_key"
    if re.search(r"from\s+['\"]|require\(", line):
        return "import_path"
    if re.search(r"=\s*['\"](ireland|czechia|portugal|spain|romania|brazil|ie|cz|pt|es|ro|br)['\"]\s*[,)]", line):
        return "default_value"
    if kind_hint in ("ident", "slug_literal", "objkey"):
        if re.search(r"\bif\s*\(|&&|\|\|", line):
            return "condition"
    return "other"


def scan_hits():
    """Returns (hit_rows, tests_excluded_count, redirect_rule_count)."""
    hit_rows = []
    tests_excluded = 0
    redirect_rules = 0
    coupling_seq = 0

    files = sorted(iter_files())
    for relpath in files:
        lines = read_lines(relpath)
        if not lines:
            continue
        test_file = is_test_path(relpath)
        decls = build_symbol_index(lines)

        redirect_span = None
        if relpath == "frontend/next.config.ts":
            redirect_span = find_next_config_redirect_span(lines)

        for line_no, line in enumerate(lines, start=1):
            if len(line) > 4000:
                continue  # skip minified/huge lines, not template logic
            candidates = []  # (start, end, token, kind)

            for m in RX["case"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(2), "case"))

            for m in RX["compare"].finditer(line):
                tok = m.group(3) or m.group(5)
                candidates.append((m.start(), m.end(), tok, "compare"))

            for bm in RX["array_bracket"].finditer(line):
                content = bm.group(0)
                codes_here = sorted(set(RX["array_code_token"].findall(content)),
                                     key=lambda t: t[1])
                distinct = sorted(set(c[1] for c in codes_here))
                if len(distinct) >= 2:
                    candidates.append((bm.start(), bm.end(), content[:200], "array"))

            for m in RX["ident"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(0), "ident"))

            for m in RX["slug_literal"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(2), "slug_literal"))

            for m in RX["objkey"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(2), "objkey"))

            for m in RX["import_path"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(2), "import"))

            for m in RX["countrynames"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(0)[:200], "countrynames"))

            for m in RX["route_check"].finditer(line):
                candidates.append((m.start(), m.end(), m.group(2), "route_check"))

            if not candidates:
                continue

            # priority: earlier-declared kinds win on exact span overlap
            priority = {"case": 0, "compare": 1, "array": 2, "countrynames": 3,
                        "import": 4, "objkey": 5, "slug_literal": 6, "ident": 7,
                        "route_check": 8}
            candidates.sort(key=lambda c: (c[0], priority.get(c[3], 99)))
            kept = []
            occupied = []
            for start, end, tok, kind in candidates:
                if any(not (end <= os_ or start >= oe) for os_, oe in occupied):
                    continue
                occupied.append((start, end))
                kept.append((start, end, tok, kind))

            if not kept:
                continue

            in_redirect_block = (
                redirect_span is not None and redirect_span[0] <= (line_no - 1) <= redirect_span[1]
            )

            for start, end, tok, kind in kept:
                if in_redirect_block:
                    redirect_rules += 1
                    continue
                if test_file:
                    tests_excluded += 1
                    continue

                context_kind = classify_context(line, kind, start, end)
                markets = markets_in_text(line)
                lang_amb = "yes" if tok.lower() in LANG_AMBIGUOUS_CODES else "no"
                coupling_seq += 1
                hit_rows.append({
                    "coupling_id": "CC-%04d" % coupling_seq,
                    "file": relpath,
                    "line": line_no,
                    "expression": line.strip()[:200],
                    "match_token": tok,
                    "context_kind": context_kind,
                    "enclosing_symbol": nearest_symbol(decls, line_no),
                    "route_or_template": route_or_template(relpath),
                    "markets_named": "|".join(markets),
                    "language_ambiguity": lang_amb,
                    "is_test": "no",
                })
    return hit_rows, tests_excluded, redirect_rules


# ---------------------------------------------------------------------------
# modules.csv
# ---------------------------------------------------------------------------
def filename_market_match(basename):
    stem = os.path.splitext(basename)[0].lower()
    segments = re.split(r"[-_.]", stem)
    for seg in segments:
        if seg in SLUGS:
            return True
    # code-prefix (e.g. "cz-approved-tool-seo.json") needs a real prefix, not
    # the bare code alone -- a lone "es.json"/"pt.json"/"ro.json" is a locale
    # file (es/pt/ro double as language codes), not a market-keyed module.
    if len(segments) > 1 and segments[0] in CODES:
        return True
    return False


def kind_of(ext):
    ext = ext.lstrip(".")
    if ext == "ts":
        return "ts"
    if ext == "json":
        return "json"
    if ext == "mjs":
        return "mjs"
    return "other"


_IMPORT_CACHE = {}  # root_rel -> list[(relpath, lines)], built once, tests excluded


def _import_index(root_rel):
    if root_rel in _IMPORT_CACHE:
        return _IMPORT_CACHE[root_rel]
    abs_root = os.path.join(REPO_ROOT, root_rel)
    entries = []
    if os.path.isdir(abs_root):
        for dirpath, dirnames, filenames in os.walk(abs_root):
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            for fn in filenames:
                ext = os.path.splitext(fn)[1]
                if ext not in CODE_EXTS:
                    continue
                abspath = os.path.join(dirpath, fn)
                relpath = os.path.relpath(abspath, REPO_ROOT).replace("\\", "/")
                if is_test_path(relpath):
                    continue
                entries.append((relpath, read_lines(relpath)))
    _IMPORT_CACHE[root_rel] = entries
    return entries


def grep_importers(module_relpath, search_roots):
    """Find files under search_roots (excluding tests) that import/require
    module_relpath by its module stem, or read it by filename (fs.readFileSync
    style). Returns list of relpaths. Uses a cached per-root file index so the
    whole tree isn't re-walked for every module/script (was the ~8min cost)."""
    stem = os.path.splitext(os.path.basename(module_relpath))[0]
    pattern = re.compile(r"\b" + re.escape(stem) + r"\b")
    hits = []
    for root_rel in search_roots:
        for relpath, lines in _import_index(root_rel):
            if relpath == module_relpath:
                continue
            for line in lines:
                if pattern.search(line) and (
                    "import" in line or "require(" in line or "readFileSync" in line
                    or "readFile(" in line or "from \"" in line or "from '" in line
                ):
                    hits.append(relpath)
                    break
    return hits


def gating_expression_for(importers):
    combined_rx = [RX["case"], RX["compare"], RX["objkey"], RX["slug_literal"], RX["ident"]]
    for imp in importers:
        lines = read_lines(imp)
        for line in lines:
            if "import" in line or "require(" in line:
                continue
            if any(rx.search(line) for rx in combined_rx):
                return line.strip()[:200]
    return ""


def scan_modules():
    # backend/scripts is covered exhaustively by scripts.csv (with its own
    # applied/-dir and last-commit-date fields); scanning it again here would
    # just duplicate those rows under a different schema.
    rows = []
    module_files = [f for f in iter_files() if not f.startswith("backend/scripts/")]
    for relpath in sorted(module_files):
        base = os.path.basename(relpath)
        if not filename_market_match(base) or is_test_path(relpath):
            continue
        ext = os.path.splitext(base)[1]
        abspath = os.path.join(REPO_ROOT, relpath)
        try:
            size = os.path.getsize(abspath)
        except OSError:
            size = 0
        importers = grep_importers(relpath, ["frontend", "backend/src"])
        ref = "yes:%s" % "|".join(importers) if importers else "no"
        gating = gating_expression_for(importers)
        markets = markets_in_text(base)
        rows.append({
            "file": relpath,
            "size_bytes": size,
            "kind": kind_of(ext),
            "referenced_from_runtime": ref,
            "gating_expression": gating,
            "markets_named": "|".join(markets),
        })
    return rows


# ---------------------------------------------------------------------------
# scripts.csv
# ---------------------------------------------------------------------------
def git_last_commit_date(relpath):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ci", "--", relpath],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=15,
        )
        return out.stdout.strip()
    except Exception:
        return ""


def first_purpose_line(relpath):
    lines = read_lines(relpath)
    comment = []
    for line in lines[:5]:
        s = line.strip()
        if s.startswith("//") or s.startswith("#") or s.startswith("*") or s.startswith("/*"):
            comment.append(s.lstrip("/*# ").strip())
        elif comment:
            break
    if comment:
        return " ".join(comment)[:200]
    for line in lines[:2]:
        if line.strip():
            return line.strip()[:200]
    return ""


def scan_scripts():
    rows = []
    root_rel = "backend/scripts"
    abs_root = os.path.join(REPO_ROOT, root_rel)
    if not os.path.isdir(abs_root):
        return rows
    package_json_texts = []
    for pj in ["package.json", "backend/package.json", "frontend/package.json"]:
        p = os.path.join(REPO_ROOT, pj)
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8", errors="replace") as f:
                package_json_texts.append((pj, f.read()))

    for dirpath, dirnames, filenames in os.walk(abs_root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if not filename_market_match(fn):
                continue
            abspath = os.path.join(dirpath, fn)
            relpath = os.path.relpath(abspath, REPO_ROOT).replace("\\", "/")
            if is_test_path(relpath):
                continue
            in_applied = "yes" if "/applied/" in ("/" + relpath) else "no"
            try:
                size = os.path.getsize(abspath)
            except OSError:
                size = 0
            last_commit = git_last_commit_date(relpath)
            stem = os.path.splitext(fn)[0]
            importers = []
            for src_root in ["backend/src"]:
                importers.extend(grep_importers(relpath, [src_root]))
            in_pkg_scripts = [pj for pj, text in package_json_texts if stem in text]
            ref_parts = importers + ["package.json:%s" % pj for pj in in_pkg_scripts]
            ref = "yes:%s" % "|".join(ref_parts) if ref_parts else "no"
            purpose = first_purpose_line(relpath)
            rows.append({
                "path": relpath,
                "in_applied_dir": in_applied,
                "size_bytes": size,
                "last_commit_date": last_commit,
                "referenced_from_runtime": ref,
                "one_line_purpose": purpose,
            })
    return rows


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main():
    hit_rows, tests_excluded, redirect_rules = scan_hits()
    module_rows = scan_modules()
    script_rows = scan_scripts()

    write_csv(
        os.path.join(HERE, "hits.csv"),
        hit_rows,
        ["coupling_id", "file", "line", "expression", "match_token", "context_kind",
         "enclosing_symbol", "route_or_template", "markets_named",
         "language_ambiguity", "is_test"],
    )
    write_csv(
        os.path.join(HERE, "modules.csv"),
        module_rows,
        ["file", "size_bytes", "kind", "referenced_from_runtime",
         "gating_expression", "markets_named"],
    )
    write_csv(
        os.path.join(HERE, "scripts.csv"),
        script_rows,
        ["path", "in_applied_dir", "size_bytes", "last_commit_date",
         "referenced_from_runtime", "one_line_purpose"],
    )

    by_file = Counter(r["file"] for r in hit_rows)
    by_context = Counter(r["context_kind"] for r in hit_rows)
    by_markets = Counter(r["markets_named"] for r in hit_rows)

    summary = {
        "total_hits": len(hit_rows),
        "hits_by_file": dict(sorted(by_file.items(), key=lambda x: -x[1])),
        "hits_by_context_kind": dict(sorted(by_context.items(), key=lambda x: -x[1])),
        "hits_by_markets_named": dict(sorted(by_markets.items(), key=lambda x: -x[1])),
        "tests_excluded_count": tests_excluded,
        "redirect_rule_count_next_config": redirect_rules,
        "modules_count": len(module_rows),
        "modules_unreferenced_count": sum(1 for r in module_rows if r["referenced_from_runtime"] == "no"),
        "scripts_count": len(script_rows),
        "scripts_outside_applied_count": sum(1 for r in script_rows if r["in_applied_dir"] == "no"),
        "regexes_used": REGEXES,
        "scan_roots": SCAN_ROOTS,
        "markets": {"codes": CODES, "slugs": SLUGS, "language_ambiguous_codes": sorted(LANG_AMBIGUOUS_CODES)},
    }
    with open(os.path.join(HERE, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("hits: %d (tests_excluded=%d, redirect_rules_excluded=%d)" % (
        len(hit_rows), tests_excluded, redirect_rules))
    print("modules: %d (unreferenced=%d)" % (
        len(module_rows), summary["modules_unreferenced_count"]))
    print("scripts: %d (outside applied/=%d)" % (
        len(script_rows), summary["scripts_outside_applied_count"]))


def demo():
    """ponytail self-check: the classifier and market-name matcher on a
    handful of known line shapes, not a full test suite."""
    assert classify_context('if (country === "br") {', "compare", 15, 21) == "condition"
    assert classify_context('case "ie":', "case", 0, 8) == "switch_case"
    assert classify_context('const x = cond ? "br" : "ie";', "compare", 0, 0) in ("ternary", "condition")
    assert markets_in_text('const x = "brazil";') == ["br"]
    assert markets_in_text('["ie","cz"]') == ["ie", "cz"]
    span = find_next_config_redirect_span(["async redirects() {", "  return [", "  ];", "}"])
    assert span == (0, 3)
    print("demo self-check OK")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        demo()
    else:
        main()
