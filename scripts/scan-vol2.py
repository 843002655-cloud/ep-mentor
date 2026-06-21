"""Scan Volume 2 PDF to understand its structure."""
import fitz, re, sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"
doc = fitz.open(str(PDF_PATH))
print(f"Pages: {doc.page_count}")

# Dump first 30 pages of text to understand TOC structure
full_text = ""
for pn in range(min(30, doc.page_count)):
    full_text += f"\n=== PAGE {pn} ===\n"
    full_text += doc[pn].get_text("text")

print(full_text[:8000])
print("\n... (truncated)")

# Also scan all pages for case boundary patterns
print("\n\n=== CASE BOUNDARY SCAN ===")
for pn in range(doc.page_count):
    text = doc[pn].get_text("text")
    # Look for various header patterns
    m = re.search(r'^\d+\s*\nCase\s+(\d+)', text, re.MULTILINE)
    if m:
        print(f"  Page {pn}: 'Case {m.group(1)}' at {m.start()}")
    # Also check for TOC entries
    tocs = re.findall(r'Case\s+(\d+)[:\s]', text)
    unique_tocs = list(set(tocs))
    if unique_tocs and pn < 10:
        print(f"  Page {pn} TOC refs: {sorted(unique_tocs, key=int)}")

# Count total case references in full document
print("\n\n=== FULL DOCUMENT CASE SCAN ===")
all_text = ""
for pn in range(doc.page_count):
    all_text += doc[pn].get_text("text")

# Find "Case N" headers
headers = re.findall(r'^\d+\s*\nCase\s+(\d+)', all_text, re.MULTILINE)
print(f"Case headers found: {sorted(set(headers), key=int)}")
print(f"Total header occurrences: {len(headers)}")

# Find TOC entries
toc_entries = re.findall(r'Case\s+(\d+):\s+([^\n]+)', all_text)
toc_unique = {}
for n, title in toc_entries:
    if int(n) not in toc_unique:
        toc_unique[int(n)] = title.strip()
print(f"\nTOC entries: {len(toc_unique)}")
for n in sorted(toc_unique):
    print(f"  Case {n}: {toc_unique[n][:100]}")

doc.close()
