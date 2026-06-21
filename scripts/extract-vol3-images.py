"""Extract page-images for Vol 3 and upload to Supabase Storage (book-cases-vol3/)."""
import fitz, os, io, requests, time, sys, re
sys.stdout.reconfigure(encoding='utf-8')

# ── Config ──
PDF = r"E:\电子书\Clinical Cases in Cardiac Electrophysiology Ventricular Arrhythmias vol.3.pdf"

from supabase_env import SUPABASE_KEY, SUPABASE_URL
BUCKET = "case-images"
PREFIX = "book-cases-vol3"

doc = fitz.open(PDF)
total = doc.page_count
print(f"PDF: {total} pages")

# ── Case boundaries ──
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

# ── Build page-to-case mapping ──
page_to_case = {}
for cn, sp, ep in case_ranges:
    for pn in range(sp, ep + 1):
        page_to_case[pn] = cn

# ── Collect image pages ──
image_pages = []  # (page_num, case_num)
for pn in range(total):
    imgs = doc[pn].get_images()
    for img in imgs:
        xref = img[0]
        base = doc.extract_image(xref)
        if base.get("width", 0) > MIN_SIZE and base.get("height", 0) > MIN_SIZE:
            cn = page_to_case.get(pn, 0)
            image_pages.append((pn, cn))
            break  # Count page once

print(f"Image pages to extract: {len(image_pages)}")

# ── Extract and upload ──
headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
}

# First, check existing files
list_resp = requests.post(
    f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
    json={"prefix": PREFIX, "limit": 500, "offset": 0},
    headers=headers,
)
existing = set()
if list_resp.ok:
    for obj in list_resp.json():
        existing.add(obj["name"])
    print(f"Existing files in {PREFIX}/: {len(existing)}")

uploaded = 0
skipped = 0
errors = 0

for idx, (pn, cn) in enumerate(image_pages):
    fname = f"vol3_case_{cn:02d}_page_{pn:03d}.png"

    if fname in existing:
        skipped += 1
        continue

    # Render page at 2x resolution
    page = doc[pn]
    pix = page.get_pixmap(dpi=200)
    img_bytes = pix.tobytes("png")

    # Upload
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{PREFIX}/{fname}"
    resp = requests.post(
        upload_url,
        headers={**headers, "Content-Type": "image/png"},
        data=img_bytes,
    )

    if resp.ok:
        uploaded += 1
        if uploaded % 10 == 0:
            print(f"  Uploaded {uploaded}... ({idx+1}/{len(image_pages)})")
    else:
        errors += 1
        print(f"  ERROR uploading {fname}: {resp.status_code} {resp.text[:200]}")

    time.sleep(0.1)  # rate limit

print(f"\nDone! Uploaded: {uploaded}, Skipped: {skipped}, Errors: {errors}")
doc.close()
