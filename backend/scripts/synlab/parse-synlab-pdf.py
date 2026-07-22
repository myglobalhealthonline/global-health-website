#!/usr/bin/env python3
"""Parse the Synlab PT price table (pdftotext -raw output) into a CSV."""
import csv
import re
import sys
import unicodedata
from collections import Counter, OrderedDict

SRC = sys.argv[1] if len(sys.argv) > 1 else "synlab_raw.txt"
OUT = sys.argv[2] if len(sys.argv) > 2 else "synlab_exams.csv"

# Scientific groups, longest-first so "IMUNOSEROLOGIA (INFECCIOLOGIA)" wins over "IMUNOLOGIA".
CATEGORIES = OrderedDict([
    ("ALERGOLOGIA", ("GH1", "Alergologia")),
    ("ANATOMIA PATOLÓGICA", ("GH2", "Anatomia Patologica")),
    ("BIOQUIMICA", ("GH3", "Bioquimica")),
    ("ENDOCRINOLOGIA", ("GH4", "Endocrinologia")),
    ("HEMATOLOGIA", ("GH5", "Hematologia")),
    ("IMUNOLOGIA", ("GH6", "Imunologia")),
    ("IMUNOSEROLOGIA (INFECCIOLOGIA)", ("GH7", "Imunoserologia (Infecciologia)")),
    ("MCDT - CARDIOLOGIA", ("GH8", "MCDT - Cardiologia")),
    ("MEDICINA PERSONALIZADA", ("GH9", "Medicina Personalizada")),
    ("MICROBIOLOGIA", ("GH10", "Microbiologia")),
    ("OUTROS PRODUTOS BIOLÓGICOS", ("GH11", "Outros Produtos Biologicos")),
    ("PATOLOGIA MOLECULAR", ("GH12", "Patologia Molecular")),
    ("RASTREIO PRÉ-NATAL", ("GH13", "Rastreio Pre-natal")),
    ("RELATÓRIO DE TESTE GENÉTICO", ("GH14", "Relatorio Teste Genetico")),
    ("URINA E DOSEAMENTOS URINÁRIOS", ("GH15", "Urina e Doseamentos Urinarios")),
])
CAT_ALT = sorted(CATEGORIES, key=len, reverse=True)
CAT_RE = "|".join(re.escape(c) for c in CAT_ALT)

ROW_RE = re.compile(
    r"^(?P<code>\S+)\s+"
    r"(?P<name>.+?)\s+"
    r"(?P<cat>" + CAT_RE + r")\s+"
    r"(?P<days>\d+)\s+"
    r"(?P<price>[\d.,]+)\s*€\s*$"
)

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return re.sub(r"-{2,}", "-", text)

rows, skipped = [], []
with open(SRC, encoding="utf-8") as fh:
    for line in fh:
        line = line.rstrip("\n").strip()
        if not line:
            continue
        m = ROW_RE.match(line)
        if not m:
            skipped.append(line)
            continue
        price_cents = round(float(m["price"].replace(",", "")) * 100)
        rows.append({
            "synlabCode": m["code"].strip(),
            "name": " ".join(m["name"].split()),
            "groupPt": m["cat"],
            "categoryPrefix": CATEGORIES[m["cat"]][0],
            "category": CATEGORIES[m["cat"]][1],
            "turnaroundDays": int(m["days"]),
            "patientPriceCents": price_cents,
            "costCents": round(price_cents * 0.8),
        })

# Sequential GH reference per category, in file order.
seq = Counter()
seen_slug = {}
for r in rows:
    seq[r["categoryPrefix"]] += 1
    r["ghCode"] = f"{r['categoryPrefix']}-{seq[r['categoryPrefix']]:04d}"
    base = slugify(f"synlab-{r['name']}")[:80] or "exam"
    slug = base
    n = 1
    while slug in seen_slug:
        n += 1
        slug = f"{base}-{n}"
    seen_slug[slug] = True
    r["slug"] = slug

fields = ["ghCode", "synlabCode", "name", "slug", "category", "groupPt",
          "turnaroundDays", "costCents", "patientPriceCents"]
with open(OUT, "w", encoding="utf-8", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)

dupes = [c for c, n in Counter(r["synlabCode"] for r in rows).items() if n > 1]
print(f"parsed rows : {len(rows)}")
print(f"skipped     : {len(skipped)}")
for s in skipped:
    print("   SKIP:", s[:120])
print(f"dup synlab codes: {len(dupes)} -> {dupes[:20]}")
print("per category:")
for cat, (pfx, label) in CATEGORIES.items():
    print(f"  {pfx:5} {label:32} {seq[pfx]}")
