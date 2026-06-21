"""
Verify each case's images correspond to the correct PDF pages.
"""
import json, sys, requests, fitz, re
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

r = requests.get("http://localhost:3000/api/cases", timeout=30)
data = r.json()
cases = data.get('cases', data) if isinstance(data, dict) else data

# ===== VOL 2 =====
print("=" * 80)
print("VOL 2 (AF) — image-to-case mapping verification")
print("=" * 80)

PDF2 = Path(__file__).parent / "svt-case-book.pdf"
doc2 = fitz.open(str(PDF2))

case_boundaries2 = []
for pn in range(doc2.page_count):
    text = doc2[pn].get_text("text")
    if 'The Author(s)' in text and pn > 15:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries2.append((int(m.group(1)), pn))

case_page_map2 = {}
for i, (ci, sp) in enumerate(case_boundaries2):
    ep = case_boundaries2[i + 1][1] if i + 1 < len(case_boundaries2) else doc2.page_count
    for p in range(sp, ep):
        case_page_map2[p] = ci

print(f"PDF: {doc2.page_count} pages, {len(case_boundaries2)} cases")

vol2_ok = vol2_bad = 0
for c in cases:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    source = str(content.get('source', ''))
    if 'Atrial Fibrillation and Atrial Flutter' not in source:
        continue

    m = re.search(r'Case\s+(\d+)', source)
    case_idx = int(m.group(1)) if m else None
    if not case_idx:
        continue

    image_urls = content.get('image_urls', [])
    img_entries = []
    for url in image_urls:
        pm = re.search(r'vol2_case_(\d+)_page_(\d+)', url)
        if pm:
            img_entries.append((int(pm.group(1)), int(pm.group(2))))

    if not img_entries:
        print(f"  Case {case_idx:2d}: NO IMAGES!")
        vol2_bad += 1
        continue

    case_pdf_pages = sorted([p for p, ci in case_page_map2.items() if ci == case_idx])
    case_img_pages = sorted([p for p in case_pdf_pages if doc2[p].get_images()])

    issues = []
    for url_case, url_seq in img_entries:
        if url_case != case_idx:
            issues.append(f"URL case#{url_case} != {case_idx}")
        elif url_seq <= len(case_img_pages):
            actual_pdf = case_img_pages[url_seq - 1]
            actual_case = case_page_map2.get(actual_pdf)
            if actual_case != case_idx:
                issues.append(f"seq{url_seq}->PDF p{actual_pdf} is Case {actual_case}")
        else:
            issues.append(f"seq {url_seq} > {len(case_img_pages)} available")

    if issues:
        print(f"  Case {case_idx:2d}: ⚠ {'; '.join(issues)}")
        vol2_bad += 1
    else:
        print(f"  Case {case_idx:2d}: ✓ {len(img_entries)} imgs, PDF pages {case_img_pages[0]}-{case_img_pages[-1]} (range OK)")
        vol2_ok += 1

print(f"\nVol 2: {vol2_ok}/{vol2_ok+vol2_bad} OK")

# ===== VOL 1 =====
print("\n" + "=" * 80)
print("VOL 1 (SVT) — image-to-case mapping verification")
print("=" * 80)

PDF1 = Path(__file__).parent / "svt-case-book-vol1.pdf"
doc1 = fitz.open(str(PDF1))

case_boundaries1 = []
for pn in range(doc1.page_count):
    text = doc1[pn].get_text("text")
    if 'The Author(s)' in text and pn > 15:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries1.append((int(m.group(1)), pn))

case_page_map1 = {}
for i, (ci, sp) in enumerate(case_boundaries1):
    ep = case_boundaries1[i + 1][1] if i + 1 < len(case_boundaries1) else doc1.page_count
    for p in range(sp, ep):
        case_page_map1[p] = ci

print(f"PDF: {doc1.page_count} pages, {len(case_boundaries1)} cases")

vol1_ok = vol1_bad = 0
for c in cases:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    source = str(content.get('source', ''))
    if 'Supraventricular' not in source:
        continue

    m = re.search(r'Case\s+(\d+)', source)
    case_idx = int(m.group(1)) if m else None
    if not case_idx:
        continue

    image_urls = content.get('image_urls', [])
    img_pages = []
    for url in image_urls:
        pm = re.search(r'page_(\d+)\.png', url)
        if pm:
            img_pages.append(int(pm.group(1)))

    if not img_pages:
        print(f"  Case {case_idx:2d}: NO IMAGES!")
        vol1_bad += 1
        continue

    issues = []
    for pn in img_pages:
        actual_case = case_page_map1.get(pn)
        if actual_case != case_idx:
            issues.append(f"PDF p{pn} is Case {actual_case}, not {case_idx}")

    if issues:
        print(f"  Case {case_idx:2d}: ⚠ {'; '.join(issues[:3])}")
        vol1_bad += 1
    else:
        print(f"  Case {case_idx:2d}: ✓ {len(img_pages)} imgs, PDF p{min(img_pages)}-p{max(img_pages)} (range OK)")
        vol1_ok += 1

print(f"\nVol 1: {vol1_ok}/{vol1_ok+vol1_bad} OK")

doc2.close()
doc1.close()
print("\nDone!")
