"""Check text blocks on Case 1 image pages to find Fig captions."""
import fitz, re
from pathlib import Path

doc = fitz.open(str(Path("E:/fk claude/ep-mentor/scripts/svt-case-book.pdf")))

for pn in [23, 24, 115, 118, 160]:
    page = doc[pn]
    blocks = page.get_text("dict")["blocks"]
    imgs = page.get_images()
    print(f"=== PAGE {pn} ({len(imgs)} imgs) ===")

    for b in blocks:
        if b["type"] == 0:  # text
            for line in b["lines"]:
                spans_text = []
                for span in line["spans"]:
                    spans_text.append(f"'{span['text']}' (font={span['font'][:20]} size={span['size']:.1f})")
                full = " ".join(spans_text)
                if full.strip():
                    print(f"  y={line['bbox'][1]:.0f}: {full[:200]}")
        elif b["type"] == 1:  # image
            print(f"  [IMAGE] bbox={b['bbox']} size={b.get('width','?')}x{b.get('height','?')}")
    print()

doc.close()
