"""
Restore Vol 1 image URLs. Vol 1 images are in book-cases/ named page_XXX.png.
"""
import json, sys, requests, fitz, re
from pathlib import Path
from collections import defaultdict
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

env = {}
with open(Path(__file__).parent.parent / ".env.local", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = "case-images"
BASE_URL = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"
headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}

# Step 1: List all files in book-cases/
print("=== Listing files in book-cases/ ===")
all_files = []
offset = 0
while True:
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
        json={"prefix": "book-cases", "limit": 100, "offset": offset,
              "sortBy": {"column": "name", "order": "asc"}},
        headers=headers
    )
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}")
        break
    data = resp.json()
    if not data:
        break
    all_files.extend(data)
    offset += len(data)
    if len(data) < 100:
        break

print(f"Total files: {len(all_files)}")
vol1_pages = set()
for f in all_files:
    name = f.get('name', '')
    m = re.match(r'page_(\d+)\.png', name)
    if m:
        vol1_pages.add(int(m.group(1)))
vol1_pages_sorted = sorted(vol1_pages)
print(f"Page PNGs: {len(vol1_pages)}, range: {min(vol1_pages_sorted)}-{max(vol1_pages_sorted)}")

# Step 2: Map Vol 1 PDF pages to cases
print("\n=== Mapping Vol 1 PDF to cases ===")
VOL1_PDF = Path(__file__).parent / "svt-case-book-vol1.pdf"
doc = fitz.open(str(VOL1_PDF))
print(f"Pages: {doc.page_count}")

# Case boundaries: "© The Author(s)" pages with Case N
case_boundaries = []
for pn in range(doc.page_count):
    text = doc[pn].get_text("text")
    if 'The Author(s)' in text and pn > 15:
        m = re.search(r'Case\s+(\d+)', text)
        if m:
            case_boundaries.append((int(m.group(1)), pn))

print(f"Case boundaries: {len(case_boundaries)}")
for ci, sp in case_boundaries[:5]:
    print(f"  Case {ci} starts at page {sp}")

case_page_map = {}
for i, (ci, sp) in enumerate(case_boundaries):
    ep = case_boundaries[i + 1][1] if i + 1 < len(case_boundaries) else doc.page_count
    for p in range(sp, ep):
        case_page_map[p] = ci

print(f"Pages mapped: {len(case_page_map)}")

# For each storage PNG, find which case it belongs to
case_img_pages = defaultdict(list)

for pdf_pn in sorted(vol1_pages):
    ci = case_page_map.get(pdf_pn)
    if ci is None:
        print(f"  WARNING: page {pdf_pn} in storage but not mapped to any case!")
        continue
    filename = f"page_{pdf_pn:03d}.png"
    case_img_pages[ci].append((pdf_pn, filename))

print(f"Storage pages mapped to cases: {sum(len(v) for v in case_img_pages.values())}")
print()

for ci in sorted(case_img_pages):
    pages = case_img_pages[ci]
    print(f"  Case {ci:2d}: {len(pages)} pages: {[p for p,_ in pages]}")

doc.close()

total = sum(len(v) for v in case_img_pages.values())
print(f"\nTotal: {total} page-images across {len(case_img_pages)} cases")

if total == 0:
    print("No matches! Exiting.")
    sys.exit(1)

# Step 3: Update DB
print("\n=== Updating Vol 1 DB records ===")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
resp = supabase.from_('cases').select('id, title, category, content_json').order('created_at').execute()
cases = resp.data

updated = 0
for c in cases or []:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}

    source = str(content.get('source', ''))
    if 'Volume 1' not in source:
        continue

    m = re.search(r'Case\s+(\d+)', source, re.IGNORECASE)
    if not m:
        source_book = str(content.get('source_book', ''))
        m = re.search(r'Case\s+(\d+)', source_book, re.IGNORECASE)
    if not m:
        m = re.match(r'病例\s*(\d+)', c.get('title', ''))

    case_idx = int(m.group(1)) if m else None

    if case_idx is None or case_idx not in case_img_pages:
        continue

    pages = case_img_pages[case_idx]
    image_urls = [f"{BASE_URL}/book-cases/{fn}" for _, fn in pages]

    content['image_urls'] = image_urls
    figures_data = []
    for pdf_pn, fn in pages:
        figures_data.append({
            'figure_number': f'Page {pdf_pn}',
            'title': f'Page {pdf_pn}',
            'description': '',
            'teaching_points': '请观察图中的心电图/腔内图/CARTO标测特征',
            'key_question': '你在这张图中观察到了什么？请描述关键特征。',
            'image_url': f"{BASE_URL}/book-cases/{fn}",
        })
    ecg = content.get('ecg_findings') or {}
    if isinstance(ecg, dict):
        ecg['figures'] = figures_data
        content['ecg_findings'] = ecg

    try:
        result = supabase.from_('cases').update({'content_json': content}).eq('id', c['id']).execute()
        if hasattr(result, 'error') and result.error:
            print(f"  FAIL Case {case_idx}: {result.error.message}")
        else:
            print(f"  OK   Case {case_idx:2d}: {len(pages)} images -> {c['title'][:55]}")
            updated += 1
    except Exception as e:
        print(f"  FAIL Case {case_idx}: {e}")

print(f"\nUpdated: {updated} Vol 1 cases")
print("Done!")
