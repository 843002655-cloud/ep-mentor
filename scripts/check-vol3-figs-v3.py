"""Investigate cases with 0 detected figure numbers."""
import fitz, re, sys
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"
doc = fitz.open(PDF)

# Case boundaries from v1
case_boundaries = [
    (1,24,36), (2,37,50), (3,51,65), (4,66,91), (5,92,107),
    (6,108,122), (7,123,136), (8,137,151), (9,152,168), (10,169,180),
    (11,181,197), (12,198,210), (13,211,223), (14,224,237), (15,238,261),
    (16,262,278), (17,279,292), (18,293,314), (19,315,333), (20,334,353),
]

problem_cases = [3, 11, 18, 19, 20]

for cn, sp, ep in case_boundaries:
    if cn not in problem_cases:
        continue

    print(f"\n{'='*60}")
    print(f"Case {cn}: pages {sp}-{ep}")
    print(f"{'='*60}")

    for pn in range(sp, min(sp + 5, ep + 1)):
        print(f"\n--- Page {pn} ---")
        # Dict mode all spans
        blocks = doc[pn].get_text("dict")["blocks"]

        # Show all spans with their text and color
        span_texts = []
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    t = span["text"].strip()
                    if t and len(t) > 1:
                        color = span.get("color", 0)
                        # Convert color to hex
                        span_texts.append((t, color))

        for t, c in span_texts[:30]:
            color_str = f"#{c:06x}" if isinstance(c, int) else str(c)
            print(f"  [{color_str}] {t[:80]}")

        # Also check plain text for any Figure-like patterns
        plain = doc[pn].get_text("text")
        # Search for any figure pattern
        for m in re.finditer(r'(?i)(fig|figure|Fig)[\s\.]*(\d+)[\s\.]+(\d+)', plain):
            print(f"  >>> FOUND in plain text: {m.group(0)} at pos {m.start()}")

        # Check for any text containing "Fig"
        for line in plain.split('\n'):
            if 'Fig' in line or 'fig' in line.lower():
                print(f"  FIG LINE: {line.strip()[:120]}")

    # Show total embedded images
    img_count = 0
    for pn in range(sp, ep + 1):
        imgs = doc[pn].get_images()
        for img in imgs:
            xref = img[0]
            base = doc.extract_image(xref)
            if base.get("width", 0) > 150 and base.get("height", 0) > 150:
                img_count += 1
    print(f"\n  Total large images: {img_count}")

doc.close()
