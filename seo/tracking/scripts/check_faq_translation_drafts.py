"""Check market FAQ translation drafts against their native source copy.

Usage (repo root):
    python seo/tracking/scripts/check_faq_translation_drafts.py seo/portugal/faq-translation-drafts-2026-09-15/de.json [...]
    python seo/tracking/scripts/check_faq_translation_drafts.py --all

Each draft carries `_source` = "frontend/locales/<lang>/faq-markets.json#<market>".
Checks: wrapper keys, same groups/items as the source, no empty strings, no
answer identical to the source, every number/URL in the source item still
present, and every `_keywordsUsed` phrase actually present in the draft text.
Exit 1 on any failure.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WRAPPER = ("_status", "_source", "_locale", "_reviewNotes", "_keywordsUsed")
TOKENS = re.compile(r"https?://\S+|\b\d+(?:[.,:/]\d+)*\b")


def tokens(text):
    return {t.rstrip(".,)").replace(",", "").replace(".", "") for t in TOKENS.findall(text)}


def check(path):
    draft = json.loads(path.read_text(encoding="utf-8"))
    name = str(path.relative_to(ROOT))
    errors = [f"{name}: missing key {k}" for k in WRAPPER if k not in draft]
    market_keys = [k for k in draft if not k.startswith("_")]
    if errors or len(market_keys) != 1:
        return errors or [f"{name}: expected one market key, found {market_keys}"]
    market = market_keys[0]
    src_file, _, src_market = draft["_source"].partition("#")
    if src_market != market:
        return [f"{name}: _source market {src_market} != draft market {market}"]
    src = json.loads((ROOT / src_file).read_text(encoding="utf-8"))[market]["groups"]
    groups = draft[market]["groups"]
    if len(groups) != len(src):
        return [f"{name}: {len(groups)} groups, source has {len(src)}"]
    text_parts = []
    for g, (dg, sg) in enumerate(zip(groups, src)):
        if len(dg["items"]) != len(sg["items"]):
            errors.append(f"{name}: group {g} has {len(dg['items'])} items, source {len(sg['items'])}")
            continue
        for field in ("eyebrow", "title"):
            if not dg[field].strip():
                errors.append(f"{name}: group {g} empty {field}")
            text_parts.append(dg[field])
        for i, (di, si) in enumerate(zip(dg["items"], sg["items"])):
            for field in ("question", "answer"):
                if not di[field].strip():
                    errors.append(f"{name}: {g}.{i} empty {field}")
                text_parts.append(di[field])
            if di["answer"].strip() == si["answer"].strip():
                errors.append(f"{name}: {g}.{i} answer identical to source")
            lost = tokens(si["question"] + " " + si["answer"]) - tokens(di["question"] + " " + di["answer"])
            if lost:
                errors.append(f"{name}: {g}.{i} numbers/URLs missing: {sorted(lost)}")
    text = " ".join(text_parts).lower()
    for kw in draft["_keywordsUsed"]:
        phrase = (kw["keyword"] if isinstance(kw, dict) else kw).lower()
        if phrase not in text:
            errors.append(f"{name}: _keywordsUsed '{phrase}' not found in text")
    words = sum(len((i["question"] + " " + i["answer"]).split()) for g in groups for i in g["items"])
    print(f"{name}: {len(groups)} groups, {sum(len(g['items']) for g in groups)} items, {words} words, "
          f"{len(draft['_reviewNotes'])} notes, {len(draft['_keywordsUsed'])} keywords, {len(errors)} problems")
    return errors


def main():
    args = sys.argv[1:]
    if args == ["--all"]:
        paths = sorted(ROOT.glob("seo/*/faq-translation-drafts-2026-09-15/*.json"))
        paths = [p for p in paths if "ireland" not in p.parts]
    else:
        paths = [Path(a).resolve() for a in args]
    problems = [e for p in paths for e in check(p)]
    for p in problems:
        print("  -", p)
    sys.exit(1 if problems or not paths else 0)


if __name__ == "__main__":
    main()
