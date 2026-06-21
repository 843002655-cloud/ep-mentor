"""Count embedded images per case for Vol 3 using actual image extraction (like vol2 v4)."""
import fitz, re, sys, os
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"
doc = fitz.open(PDF)
total = doc.page_count

# 1. Find case boundaries (© The Author(s))
case_boundaries = []
for pn in range(total):
    text = doc[pn].get_text("text")
    if 'The Author(s)' in text and pn > 10:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries.append((int(m.group(1)), pn))

print(f"Found {len(case_boundaries)} case boundaries")
case_boundaries.sort(key=lambda x: x[1])

# Convert boundaries to page ranges
case_ranges = []
for i, (case_num, start_pn) in enumerate(case_boundaries):
    if i < len(case_boundaries) - 1:
        end_pn = case_boundaries[i + 1][1] - 1
    else:
        end_pn = total - 1
    case_ranges.append((case_num, start_pn, end_pn))

print("\nCase page ranges:")
for cn, sp, ep in case_ranges:
    print(f"  Case {cn:2d}: pages {sp:3d}-{ep:3d} ({ep-sp+1} pages)")

# 2. Count actual embedded images per case (size > 150px)
print("\nCounting embedded images (>150px) per case...")
MIN_SIZE = 150

# First, collect all image pages
image_pages = set()
for pn in range(total):
    imgs = doc[pn].get_images()
    for img in imgs:
        xref = img[0]
        base_image = doc.extract_image(xref)
        w = base_image.get("width", 0)
        h = base_image.get("height", 0)
        if w > MIN_SIZE and h > MIN_SIZE:
            image_pages.add(pn)
            break  # Count page once

# Assign image pages to cases
case_img_pages = {cn: [] for cn, _, _ in case_ranges}
unassigned = []

for pn in sorted(image_pages):
    assigned = False
    for cn, sp, ep in case_ranges:
        if sp <= pn <= ep:
            case_img_pages[cn].append(pn)
            assigned = True
            break
    if not assigned:
        unassigned.append(pn)

# Count unique figure numbers per case
print("\nUnique figure numbers per case:")
for cn, sp, ep in case_ranges:
    figs = set()
    for pn in range(sp, ep + 1):
        text = doc[pn].get_text("text")
        # Match Fig. X.Y where X is the case number
        for m in re.finditer(r'Fig\.\s*(\d+)\.(\d+)', text):
            figs.add(f"{m.group(1)}.{m.group(2)}")

    img_count = len(case_img_pages[cn])
    fig_list = sorted(figs, key=lambda x: tuple(map(int, x.split('.'))))
    print(f"  Case {cn:2d}: {img_count:3d} image pages, {len(figs):3d} unique figure numbers")
    if fig_list[:3]:
        print(f"          figures: {', '.join(fig_list[:5])}{'...' if len(fig_list) > 5 else ''}")

print(f"\nUnassigned image pages: {len(unassigned)}")

# Summary
total_imgs = sum(len(v) for v in case_img_pages.values())
print(f"\nTotal: {total_imgs} image pages across {len(case_ranges)} cases")
doc.close()
