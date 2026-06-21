"""Map Vol 3 image URLs to the 20 newly imported Muresan VT cases."""
import json
import re
from collections import defaultdict

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
BUCKET = "case-images"
PREFIX = "book-cases-vol3"
SOURCE_BOOK = "Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias — Volume 3, Lucian Muresan (ed.), Springer 2024"

headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

# 1. List all Vol 3 images
print("Listing Vol 3 images...")
r = requests.post(
    f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
    json={"prefix": PREFIX, "limit": 500, "offset": 0},
    headers=headers,
)
r.raise_for_status()
files = r.json()
print(f"  {len(files)} images found")

# 2. Group by case number
case_images = defaultdict(list)
for f in files:
    name = f["name"]
    # vol3_case_XX_page_YYY.png
    parts = name.replace("vol3_case_", "").replace(".png", "").split("_page_")
    if len(parts) == 2:
        case_num = int(parts[0])
        page_num = int(parts[1])
        url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{PREFIX}/{name}"
        case_images[case_num].append((page_num, url))

for cn in case_images:
    case_images[cn].sort(key=lambda x: x[0])

print(f"  Cases with images: {sorted(case_images.keys())}")
for cn in sorted(case_images):
    if cn > 0:
        print(f"    Case {cn}: {len(case_images[cn])} images")
print(f"    Case 0 (unassigned/cover): {len(case_images.get(0, []))} images")

# 3. Get Vol 3 cases from DB
print("\nFetching Vol 3 cases from database...")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&select=id,title,content_json,created_at",
    headers={**headers, "Accept": "application/json"},
)
r.raise_for_status()
all_vt = r.json()
print(f"  {len(all_vt)} VT cases total")

# Filter: must have Muresan Vol 3 source AND a valid case number (cn > 0)
# This excludes the 30 Bogun cases that were corrupted by the first buggy run
# (those have cn=0 because "Case N" doesn't appear in their source)
vol3_cases = []
skipped = []
for c in all_vt:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try:
            cj = json.loads(cj)
        except:
            cj = {}
    src = cj.get("source", "")
    if src and src.startswith(
        "Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias"
    ):
        m = re.search(r"Case\s+(\d+)", src)
        cn = int(m.group(1)) if m else 0
        if cn > 0:
            vol3_cases.append((cn, c["id"], c["title"], c.get("created_at", "")))
        else:
            skipped.append((c["id"][:8], c.get("created_at", "")[:19], c["title"][:60]))

vol3_cases.sort(key=lambda x: x[0])

print(f"\n  Matched Vol 3 cases (cn > 0): {len(vol3_cases)}")
for cn, cid, title, created in vol3_cases:
    print(f"    Case {cn:2d}: {title[:60]}")

print(f"\n  Skipped (cn=0, corrupted from first run): {len(skipped)}")
for cid, created, title in skipped[:5]:
    print(f"    {cid} | {created} | {title}")
if len(skipped) > 5:
    print(f"    ... and {len(skipped) - 5} more")

# 4. Update each valid case with image URLs
print("\nUpdating cases...")
updated = 0
for cn, cid, title, created in vol3_cases:
    if cn not in case_images:
        print(f"  WARN Case {cn}: no images in storage, skipping")
        continue

    # Get current content_json
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}&select=content_json",
        headers={**headers, "Accept": "application/json"},
    )
    if not r.ok:
        print(f"  FAIL Case {cn}: fetch error {r.status_code}")
        continue
    data = r.json()
    if not data:
        print(f"  FAIL Case {cn}: not found")
        continue
    cj = data[0].get("content_json", {})
    if isinstance(cj, str):
        try:
            cj = json.loads(cj)
        except:
            cj = {}

    # Get image URLs for this case
    imgs = case_images[cn]
    img_urls = [url for _, url in imgs]

    # Update content_json
    cj["image_urls"] = img_urls
    cj["source"] = f"{SOURCE_BOOK}, Case {cn}"

    # Update in DB
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}",
        json={"content_json": cj},
        headers={**headers, "Prefer": "return=minimal"},
    )
    if r.ok:
        updated += 1
        print(f"  OK Case {cn:2d}: {len(img_urls):3d} images | {title[:60]}")
    else:
        print(f"  FAIL Case {cn}: {r.status_code} {r.text[:100]}")

print(f"\nDone! Updated {updated}/{len(vol3_cases)} cases with Vol 3 image URLs")
