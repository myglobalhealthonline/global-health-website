"""Check the Ireland FAQ translation drafts against the English source.

Usage (repo root):  python seo/ireland/faq-translation-drafts-2026-09-15/check_drafts.py [es pt cs ro de]

Checks per draft: wrapper keys present, same groups/items as the source, no
empty strings, no answer identical to English, and every number and URL in the
English item still present in the translation. Exit 1 on any failure.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = json.loads((ROOT / "frontend/locales/en/faq-markets.json").read_text(encoding="utf-8"))["ie"]
TOKENS = re.compile(r"https?://\S+|\b\d+(?:[.,:]\d+)*\b")


def tokens(text):
    # Normalise 1,000 / 1.000 so locale number formatting is not a failure.
    return {t.rstrip(".,)") .replace(",", "").replace(".", "") for t in TOKENS.findall(text)}


def check(locale):
    path = HERE / f"{locale}.json"
    if not path.exists():
        return [f"{locale}: missing ({path.name})"]
    draft = json.loads(path.read_text(encoding="utf-8"))
    errors = [f"{locale}: missing key {k}" for k in ("_status", "_source", "_locale", "_reviewNotes", "ie") if k not in draft]
    if errors:
        return errors
    groups, src = draft["ie"]["groups"], SOURCE["groups"]
    if len(groups) != len(src):
        return [f"{locale}: {len(groups)} groups, source has {len(src)}"]
    for g, (dg, sg) in enumerate(zip(groups, src)):
        if len(dg["items"]) != len(sg["items"]):
            errors.append(f"{locale}: group {g} has {len(dg['items'])} items, source {len(sg['items'])}")
            continue
        for field in ("eyebrow", "title"):
            if not dg[field].strip():
                errors.append(f"{locale}: group {g} empty {field}")
        for i, (di, si) in enumerate(zip(dg["items"], sg["items"])):
            for field in ("question", "answer"):
                if not di[field].strip():
                    errors.append(f"{locale}: {g}.{i} empty {field}")
            if di["answer"].strip() == si["answer"].strip():
                errors.append(f"{locale}: {g}.{i} answer identical to English")
            lost = tokens(si["question"] + " " + si["answer"]) - tokens(di["question"] + " " + di["answer"])
            if lost:
                errors.append(f"{locale}: {g}.{i} numbers/URLs missing: {sorted(lost)}")
    words = sum(len((i["question"] + " " + i["answer"]).split()) for g in groups for i in g["items"])
    print(f"{locale}: {len(groups)} groups, {sum(len(g['items']) for g in groups)} items, {words} words, "
          f"{len(draft['_reviewNotes'])} review notes, {len(errors)} problems")
    return errors


def main():
    locales = sys.argv[1:] or ["es", "pt", "cs", "ro", "de"]
    problems = [e for loc in locales for e in check(loc)]
    for p in problems:
        print("  -", p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
