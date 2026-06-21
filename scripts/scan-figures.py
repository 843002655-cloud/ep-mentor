"""Scan PDF for Fig.X.Y captions — dry run, no extraction."""
import fitz
import re
from pathlib import Path
from collections import defaultdict

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"

doc = fitz.open(str(PDF_PATH))
print(f"Pages: {doc.page_count}")

# Map pages to cases
case_page_map = {}
case_boundaries = []
for page_num in range(doc.page_count):
    text = doc[page_num].get_text("text")
    m = re.search(r'^\d+\s*\nCase\s+(\d+)\s*\n', text, re.MULTILINE)
    if m and page_num > 15:
        case_boundaries.append((int(m.group(1)), page_num))

case_boundaries.sort(key=lambda x: x[1])
for i, (case_idx, start_page) in enumerate(case_boundaries):
    end_page = case_boundaries[i + 1][1] if i + 1 < len(case_boundaries) else doc.page_count
    for p in range(start_page, end_page):
        case_page_map[p] = case_idx

print(f"Case chapters: {len(case_boundaries)}")
for ci, pg in case_boundaries:
    print(f"  Case {ci:2d} -> page {pg}")

# Scan each page for Fig.X.Y
all_figs = []
for page_num in range(doc.page_count):
    text = doc[page_num].get_text("text")
    for m in re.finditer(r'Fig\.\s*(\d+)\.(\d+)\b', text):
        case_idx = int(m.group(1))
        fig_num = int(m.group(2))
        page_case = case_page_map.get(page_num)
        all_figs.append({
            "case": case_idx,
            "fig": fig_num,
            "page": page_num,
            "page_case": page_case,
            "match": page_case is not None and case_idx == page_case,
        })

# Deduplicate
seen = set()
unique = []
for f in all_figs:
    key = (f["case"], f["fig"])
    if key not in seen:
        seen.add(key)
        unique.append(f)

unique.sort(key=lambda x: (x["case"], x["fig"]))

print(f"\nTotal Fig refs: {len(all_figs)}, Unique: {len(unique)}")
print(f"Matched to correct page/case: {sum(1 for f in unique if f['match'])}")

# Group by case
by_case = defaultdict(list)
for f in unique:
    by_case[f["case"]].append(f)

print("\nFigures per case (unique, all pages):")
for ci in sorted(by_case):
    figs = by_case[ci]
    pages = set(f["page"] for f in figs)
    matched = sum(1 for f in figs if f["match"])
    print(f"  Case {ci:2d}: {len(figs):3d} figs across {len(pages):3d} pages, matched={matched}")

doc.close()
