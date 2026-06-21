"""
Vol 2 figure counter v4 — counts actual embedded images per page,
filters tiny images (logos/icons), and associates figure numbers
by spatial proximity in dict-mode text blocks.
"""
import fitz, re
from pathlib import Path
from collections import defaultdict

doc = fitz.open(str(Path("E:/fk claude/ep-mentor/scripts/svt-case-book.pdf")))

# --- Map pages to cases ---
case_boundaries = []
for pn in range(doc.page_count):
    text = doc[pn].get_text("text")
    m = re.search(r'^\d+\s*\nCase\s+(\d+)\s*\n', text, re.MULTILINE)
    if m and pn > 15:
        case_boundaries.append((int(m.group(1)), pn))

case_page_map = {}
for i, (ci, sp) in enumerate(case_boundaries):
    ep = case_boundaries[i + 1][1] if i + 1 < len(case_boundaries) else doc.page_count
    for p in range(sp, ep):
        case_page_map[p] = ci

print(f"Cases: {len(case_boundaries)}, mapped pages: {len(case_page_map)}")

# --- Analyze each page ---
MIN_IMG_SIZE = 150  # pixels — skip images smaller than this in both dimensions

case_large_images = defaultdict(list)  # case -> [(page, img_idx, w, h)]
case_image_pages = defaultdict(set)    # case -> set of pages with images

page_fig_numbers = {}  # page -> [(fig_num, source)]

for pn in range(doc.page_count):
    page = doc[pn]
    ci = case_page_map.get(pn)

    # --- Count embedded images, filtering by size ---
    img_list = page.get_images(full=True)
    large_imgs = []
    for img_info in img_list:
        xref = img_info[0]
        try:
            base = doc.extract_image(xref)
            w, h = base.get("width", 0), base.get("height", 0)
            if w >= MIN_IMG_SIZE and h >= MIN_IMG_SIZE:
                large_imgs.append((xref, w, h))
        except Exception:
            # If we can't extract metadata, count it conservatively
            large_imgs.append((xref, 0, 0))

    if ci is not None and large_imgs:
        for idx, (xref, w, h) in enumerate(large_imgs):
            case_large_images[ci].append((pn, idx, w, h))
        case_image_pages[ci].add(pn)

    # --- Find figure numbers spatially near images ---
    if not large_imgs or ci is None:
        continue

    # Get dict blocks for spatial analysis
    blocks = page.get_text("dict")["blocks"]
    img_blocks = [b for b in blocks if b["type"] == 1]  # image blocks
    text_blocks = [b for b in blocks if b["type"] == 0]  # text blocks

    # For each large image, find nearby text that looks like a figure number
    for img_idx, (xref, w, h) in enumerate(large_imgs):
        # Find image block matching this xref (approximate)
        img_bbox = None
        for ib in img_blocks:
            if ib.get("xref") == xref or abs(ib.get("number", 0) - img_idx) <= 1:
                img_bbox = ib["bbox"]
                break

        if img_bbox is None:
            continue

        # Search nearby text blocks for figure-like numbers
        ix0, iy0, ix1, iy1 = img_bbox
        nearby_nums = []

        for tb in text_blocks:
            tx0, ty0, tx1, ty1 = tb["bbox"]

            # Text must be near the image (within 100pt vertically or horizontally)
            v_dist = min(abs(ty1 - iy0), abs(iy1 - ty0), abs(ty0 - iy0))
            h_overlap = max(0, min(tx1, ix1) - max(tx0, ix0))
            v_overlap = max(0, min(ty1, iy1) - max(ty0, iy0))

            # Text above/below image (horizontal overlap, vertical proximity)
            near_vertical = h_overlap > 20 and v_dist < 80
            # Text beside image (vertical overlap, horizontal proximity)
            near_horizontal = v_overlap > 10 and min(abs(tx1 - ix0), abs(ix1 - tx0)) < 80

            if not (near_vertical or near_horizontal):
                continue

            for line in tb["lines"]:
                line_text = " ".join(s['text'].strip() for s in line['spans'])
                # Look for Fig/Figure references
                for pat in [r'Fig\.?\s*(\d+)\.(\d+)', r'Figure\s+(\d+)\.(\d+)',
                            r'Figs?\.?\s*(\d+)\.(\d+)']:
                    for m in re.finditer(pat, line_text, re.IGNORECASE):
                        cn, fn = int(m.group(1)), int(m.group(2))
                        if cn == ci:
                            nearby_nums.append((fn, 'caption'))
                # Also look for colored standalone numbers
                for span in line['spans']:
                    stext = span['text'].strip()
                    num_match = re.match(rf'^({ci})\.(\d+)\s*$', stext)
                    if num_match:
                        fn = int(num_match.group(2))
                        color = span.get('color', 0)
                        if color != 0:  # colored = likely figure number
                            nearby_nums.append((fn, f'colored({color})'))

        if nearby_nums:
            if pn not in page_fig_numbers:
                page_fig_numbers[pn] = []
            page_fig_numbers[pn].extend(nearby_nums)

# --- Output ---
print(f"\n{'='*70}")
print(f"EMBEDDED IMAGE COUNT (filtered: min {MIN_IMG_SIZE}px)")
print(f"{'='*70}")
print(f"{'Case':<6} {'Img Pages':<11} {'Large Imgs':<12} {'Fig Nums Found':<18} {'Details'}")
print("-" * 70)

total_pages = 0
total_imgs = 0
for ci in sorted(set(list(case_large_images.keys()) + [i for i, _ in case_boundaries])):
    imgs = case_large_images.get(ci, [])
    img_pages = case_image_pages.get(ci, set())
    total_pages += len(img_pages)
    total_imgs += len(imgs)

    # Unique figure numbers detected on this case's pages
    fig_nums = set()
    for pn in img_pages:
        for fn, src in page_fig_numbers.get(pn, []):
            fig_nums.add(fn)
    fig_nums_str = f"{min(fig_nums)}-{max(fig_nums)}" if fig_nums else "—"

    # Which pages have how many images
    page_counts = defaultdict(int)
    for pn, idx, w, h in imgs:
        page_counts[pn] += 1
    page_detail = ", ".join(f"p{pn}({cnt})" for pn, cnt in sorted(page_counts.items())[:8])
    if len(page_counts) > 8:
        page_detail += f" ... +{len(page_counts)-8} more"

    print(f"Case {ci:2d}  {len(img_pages):3d} pages   {len(imgs):3d} images    {len(fig_nums):2d} nums ({fig_nums_str})   {page_detail}")

print("-" * 70)
print(f"TOTAL   {total_pages:3d} pages   {total_imgs:3d} images")
print()

# Per-page breakdown for cases with >10 images
print(f"\n{'='*70}")
print("PER-PAGE BREAKDOWN")
print(f"{'='*70}")
for ci in sorted(case_large_images.keys()):
    imgs = case_large_images[ci]
    if len(imgs) <= 10:
        continue
    page_counts = defaultdict(list)
    for pn, idx, w, h in imgs:
        page_counts[pn].append((idx, w, h))
    print(f"\nCase {ci} ({len(imgs)} images across {len(page_counts)} pages):")
    for pn in sorted(page_counts):
        imgs_on_page = page_counts[pn]
        figs_on_page = page_fig_numbers.get(pn, [])
        fn_list = sorted(set(fn for fn, _ in figs_on_page))
        size_info = ", ".join(f"{w}x{h}" for _, w, h in imgs_on_page[:5])
        if len(imgs_on_page) > 5:
            size_info += f" +{len(imgs_on_page)-5} more"
        fn_str = f"figs: {fn_list}" if fn_list else "no fig nums found"
        print(f"  p{pn}: {len(imgs_on_page)} imgs [{size_info}] — {fn_str}")

doc.close()
