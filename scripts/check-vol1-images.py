"""Check storage — find Vol 1 images and list folders."""
import requests, json
from pathlib import Path

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

headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}

# Try POST for listing (correct Supabase API)
print("=== Listing storage folders (POST) ===")
for prefix in ["book-cases", "book-cases-vol2", ""]:
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
        json={"prefix": prefix, "limit": 10, "offset": 0, "sortBy": {"column": "name", "order": "asc"}},
        headers=headers
    )
    print(f"  prefix='{prefix}': {resp.status_code}")
    if resp.status_code in (200, 201):
        data = resp.json()
        if isinstance(data, list):
            print(f"    {len(data)} items")
            for item in data[:5]:
                name = item.get('name', str(item))
                print(f"    - {name}")
        else:
            print(f"    {data}")
    else:
        print(f"    {resp.text[:100]}")

print()

# Check specific Vol 1 file patterns via HEAD
print("=== Checking Vol 1 image URLs ===")
base = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"
# Try the naming from extract-pdf-images.py logic
# Vol 1 extracted pages would be in book-cases/ with naming...
vol1_patterns = [
    f"{base}/book-cases/1781112939938-c01_f01_p011_embedded_0.png",  # from pdf-batch-v4
    f"{base}/book-cases/case_01_page_01.png",
    f"{base}/book-cases/case-01-page-01.png",
    f"{base}/book-cases/c01_p01.png",
]
for url in vol1_patterns:
    r = requests.head(url)
    print(f"  {r.status_code} - {url.split('/')[-1][:60]}")
