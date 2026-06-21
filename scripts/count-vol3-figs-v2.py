"""Vol 3: Detailed figure counting with dict-mode text + image rotation check."""
import fitz, re, sys, os
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"
doc = fitz.open(PDF)
total = doc.page_count

# 1. Find case boundaries
case_boundaries = []
for pn in range(total):
    text = doc[pn].get_text("text")
    if 'The Author(s)' in text and pn > 10:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries.append((int(m.group(1)), pn))
case_boundaries.sort(key=lambda x: x[1])

case_ranges = []
for i, (case_num, start_pn) in enumerate(case_boundaries):
    end_pn = case_boundaries[i+1][1]-1 if i < len(case_boundaries)-1 else total-1
    case_ranges.append((case_num, start_pn, end_pn))

# 2. For each case, extract figure numbers using DICT mode (span-level, detects colored text)
print("Using dict-mode text extraction to find colored figure numbers...")
MIN_SIZE = 150

for cn, sp, ep in case_ranges:
    # Collect all unique figure numbers in this case range using dict mode
    fig_set = set()
    img_pages = []
    rotated_pages = []

    for pn in range(sp, ep + 1):
        # Check for embedded images
        imgs = doc[pn].get_images()
        has_large_img = False
        img_rotations = set()
        for img in imgs:
            xref = img[0]
            base_image = doc.extract_image(xref)
            w = base_image.get("width", 0)
            h = base_image.get("height", 0)
            if w > MIN_SIZE and h > MIN_SIZE:
                has_large_img = True
                # Check transform/rotation - img[2] has transform matrix
                # Actually check the image dict for rotation info
                transform = img[2] if len(img) > 2 else None

        if has_large_img:
            img_pages.append(pn)

        # Dict-mode text for figure numbers
        blocks = doc[pn].get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    # Check for figure numbers (colored or not)
                    m = re.match(r'^Fig\.?\s*(\d+)\.(\d+)', text)
                    if m:
                        fig_set.add(f"{m.group(1)}.{m.group(2)}")
                        # Check color
                        color = span.get("color", 0)
                        if color != 0:
                            # Non-black = colored
                            pass

    fig_list = sorted(fig_set, key=lambda x: tuple(map(int, x.split('.'))))
    print(f"  Case {cn:2d}: {len(img_pages):3d} img pages, {len(fig_set):3d} unique figs  → {', '.join(fig_list[:8])}{'...' if len(fig_list)>8 else ''}")

# 3. Check for image rotation on a sample
print("\n--- Checking image rotation on sample pages ---")
for pn in [25, 26, 27, 51, 52, 53]:  # Sample pages from early cases
    imgs = doc[pn].get_images(True)  # full=True for more info
    if imgs:
        for img in imgs[:3]:
            xref, smask, w, h, bpc, colorspace, alt_colorspace, name, filter_, referencer = img
            # Actually get the transform matrix
            # The rotation info: width/height swap might indicate rotation
            base = doc.extract_image(xref)
            rw = base.get("width", 0)
            rh = base.get("height", 0)
            if rw > 100 or rh > 100:
                # Check if transformed (rotation info in the xref)
                trans = doc.xref_get_key(xref, "Transform")
                print(f"  Page {pn}: xref={xref}, size={rw}x{rh}, transform={trans}")
                # Check CSI (image) properties
                rot = doc.xref_get_key(xref, "Rotate")
                print(f"           rotate={rot}")

doc.close()
print("\nDone.")
