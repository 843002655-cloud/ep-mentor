"""Vol 3 v4: Extract colored figure numbers from dict-mode text + plain text Fig. references."""
import fitz, re, sys
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"
doc = fitz.open(PDF)
total = doc.page_count

# Find case boundaries
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

MIN_SIZE = 150

print("Counting: img pages, colored figure numbers, plain-text Fig. references")
print(f"{'Case':<6} {'ImgPgs':<8} {'ColoredNums':<14} {'PlainText':<12} {'Merged':<10} {'Figures'}")
print("-" * 90)

total_img_pages = 0
for cn, sp, ep in case_ranges:
    img_pages = []
    colored_figs = set()  # From dict-mode blue numbers
    plain_figs = set()    # From plain text Fig. X.Y

    for pn in range(sp, ep + 1):
        # Count images
        imgs = doc[pn].get_images()
        has_large_img = False
        for img in imgs:
            xref = img[0]
            base = doc.extract_image(xref)
            if base.get("width", 0) > MIN_SIZE and base.get("height", 0) > MIN_SIZE:
                has_large_img = True
                break
        if has_large_img:
            img_pages.append(pn)

        # Method 1: Colored numbers from dict mode (blue = 0x0000ff or 0x0000fa)
        blocks = doc[pn].get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    color = span.get("color", 0)
                    # Blue-ish colors: exact blue (0x0000ff) or near-blue (0x0000fa)
                    if color not in (0x0000ff, 0x0000fa):
                        continue
                    text = span["text"].strip()
                    # Match X.Y pattern (possibly preceded by "Fig. " in previous span)
                    m = re.match(r'^(\d+)\.(\d+)$', text)
                    if m:
                        case_num = int(m.group(1))
                        if case_num == cn:  # Belongs to this case
                            colored_figs.add(text)

        # Method 2: Plain text Fig. references
        plain = doc[pn].get_text("text")
        for m in re.finditer(r'Fig\.?\s*(\d+)\.(\d+)', plain):
            case_num = int(m.group(1))
            if case_num == cn:
                plain_figs.add(f"{m.group(1)}.{m.group(2)}")

    merged = colored_figs | plain_figs
    merged_sorted = sorted(merged, key=lambda x: tuple(map(int, x.split('.'))))

    print(f"Case {cn:<2}  {len(img_pages):<8} {len(colored_figs):<14} {len(plain_figs):<12} {len(merged):<10} {', '.join(merged_sorted[:8])}{'...' if len(merged_sorted)>8 else ''}")

    total_img_pages += len(img_pages)

print("-" * 90)
print(f"Total: {total_img_pages} image pages across {len(case_ranges)} cases")

doc.close()
