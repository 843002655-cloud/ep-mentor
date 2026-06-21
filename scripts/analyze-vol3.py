"""Analyze Vol 3 PDF structure: pages, cases, figures."""
import fitz, re, sys, os
sys.stdout.reconfigure(encoding='utf-8')

PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"
doc = fitz.open(PDF)
total = doc.page_count
print(f"Total pages: {total}")

# 1. Find case boundaries
# Vol 1 used "© The Author(s)". Check if Vol 3 uses the same.
case_boundaries = []
for pn in range(total):
    text = doc[pn].get_text("text")
    if 'The Author(s)' in text and pn > 10:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries.append((int(m.group(1)), pn, m.group(0)))
            print(f"  Case {m.group(1)} boundary at page {pn}: {m.group(0)}")

print(f"\nTotal case boundaries found: {len(case_boundaries)}")

# 2. Sample text from first few pages to understand structure
print("\n--- Page 1 text (first 500 chars) ---")
print(doc[0].get_text("text")[:500])

print("\n--- Page 2 text (first 500 chars) ---")
print(doc[1].get_text("text")[:500])

# 3. Check figure format
print("\n--- Checking figure format ---")
fig_count = 0
for pn in range(min(50, total)):
    text = doc[pn].get_text("text")
    figs = re.findall(r'Fig\w*\.?\s*\d+\.\d+', text)
    if figs:
        print(f"  Page {pn}: {figs[:5]}")
        fig_count += len(figs)
print(f"\nTotal figure mentions in first 50 pages: {fig_count}")

# 4. Check for TOC
print("\n--- Looking for TOC / case listing ---")
for pn in range(min(20, total)):
    text = doc[pn].get_text("text")
    if 'Case' in text and ('Contents' in text or 'Introduction' in text or pn < 5):
        print(f"Page {pn} (first 600 chars):")
        print(text[:600])
        print("---")

# 5. Look at first few case starts
if case_boundaries:
    for case_num, start_pn, _ in case_boundaries[:5]:
        print(f"\n--- Case {case_num} start at page {start_pn} ---")
        text = doc[start_pn].get_text("text")
        print(text[:400])

doc.close()
