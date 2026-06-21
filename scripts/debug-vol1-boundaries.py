"""Debug Vol 1 case boundaries."""
import fitz, re
from pathlib import Path

doc = fitz.open(str(Path("E:/fk claude/ep-mentor/scripts/svt-case-book-vol1.pdf")))
print(f"Pages: {doc.page_count}")

# Check for case patterns on each page
for pn in range(15, min(50, doc.page_count)):
    text = doc[pn].get_text("text")
    # Try multiple patterns
    for pat_name, pat in [
        ("Case\\n", r'Case\s+(\d+)\s*\n'),
        ("Case space", r'Case\s+(\d+)'),
        ("digit\\nCase", r'^\d+\s*\nCase\s+(\d+)\s*\n'),
    ]:
        m = re.search(pat, text, re.MULTILINE)
        if m:
            ctx = text[max(0,m.start()-5):m.end()+60].replace('\n','|')
            print(f"  p{pn}: [{pat_name}] -> {ctx}")
            break

# Also check TOC pages
print("\n=== Checking pages 2-15 (TOC) ===")
for pn in range(2, 15):
    text = doc[pn].get_text("text")[:300]
    if 'Case' in text:
        print(f"  p{pn}: {text[:200].replace(chr(10),'|')}")

# Check the copyright boundary pattern
print("\n=== Looking for copyright/author boundaries ===")
for pn in range(15, 50):
    text = doc[pn].get_text("text")
    if 'Author(s)' in text or 'Springer' in text:
        idx = text.find('Author') if 'Author' in text else text.find('Springer')
        ctx = text[max(0,idx-30):idx+80].replace('\n','|')
        print(f"  p{pn}: {ctx}")

doc.close()
