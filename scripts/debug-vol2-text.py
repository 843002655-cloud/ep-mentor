"""Debug Vol 2 text extraction - check for Fig captions."""
import fitz, re
from pathlib import Path

doc = fitz.open(str(Path("E:/fk claude/ep-mentor/scripts/svt-case-book.pdf")))

# Check Case 1 pages with images
for pn in [19, 20, 21, 22, 23, 24]:
    page = doc[pn]
    text = page.get_text("text")
    imgs = page.get_images()
    print(f"=== PAGE {pn} ({len(imgs)} imgs) ===")

    # Search for Fig patterns
    for pattern in [r"Fig", r"Fig\.", r"Figure", r"fig\.", r"FIGURE"]:
        matches = [(m.start(), text[max(0,m.start()-5):m.end()+40]) for m in re.finditer(pattern, text)]
        if matches:
            print(f"  Pattern '{pattern}': {len(matches)} matches")
            for pos, ctx in matches[:3]:
                print(f"    @{pos}: ...{ctx.strip()}...")

    # Also search for number patterns near "Fig"
    fig_nums = re.findall(r'(?:Fig|Figure|fig)\.?\s*(\d+\.?\d*)', text)
    if fig_nums:
        print(f"  Fig numbers: {fig_nums}")

    # Show first 500 chars
    print(f"  Text preview: {text[:400]}")
    print()

# Global stats with more patterns
all_figs = []
for pn in range(doc.page_count):
    text = doc[pn].get_text("text")
    for pattern in [
        r'Fig\.\s*(\d+)\.(\d+)',
        r'Fig\.\s*(\d+)\s*\.\s*(\d+)',
        r'Fig\s+(\d+)\.(\d+)',
        r'Fig\s*\.\s*(\d+)[\.\-](\d+)',
        r'FIGURE\s+(\d+)\.(\d+)',
        r'Figure\s+(\d+)\.(\d+)',
    ]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            all_figs.append((pn, int(m.group(1)), int(m.group(2))))

seen = set()
unique = []
for pn, cn, fn in all_figs:
    k = (cn, fn)
    if k not in seen:
        seen.add(k)
        unique.append((pn, cn, fn))
unique.sort(key=lambda x: (x[1], x[2]))

from collections import defaultdict
by_case = defaultdict(list)
for pn, cn, fn in unique:
    by_case[cn].append(fn)

print(f"\n=== GLOBAL RESULTS ===")
print(f"Total refs: {len(all_figs)}, Unique: {len(unique)}")
for ci in sorted(by_case):
    figs = sorted(by_case[ci])
    print(f"  Case {ci:2d}: {len(figs):3d} figs ({min(figs)}-{max(figs)})")

doc.close()
