"""Check storage state and fix Vol 1 overwrite."""
import json, sys
sys.path.insert(0, '.')
import requests
from supabase import create_client
from pathlib import Path

env = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line: continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = 'case-images'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. List storage folders to see what exists
print("=== STORAGE FOLDERS ===")
headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}
# Try listing root
for prefix in ['book-cases', 'book-cases-vol2', '']:
    resp = requests.get(
        f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
        params={"prefix": prefix, "limit": 5, "offset": 0},
        headers=headers
    )
    if resp.status_code == 200:
        items = resp.json()
        print(f"  '{prefix}/': {len(items)} items")
        for item in items[:3]:
            print(f"    {item.get('name', item)[:80]}")
    else:
        print(f"  '{prefix}/': {resp.status_code} - {resp.text[:80]}")

# 2. Get actual Vol 2 AF cases (not VT from other batches)
print("\n=== VOL 2 AF CASES ===")
resp = supabase.from_('cases').select('id, title, category, content_json, created_at').order('created_at').execute()
cases = resp.data

vol2_af = []
for c in cases:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    source = str(content.get('source', ''))
    # Match the specific Vol 2 AF book
    if 'Atrial Fibrillation and Atrial Flutter' in source and 'Volume 2' in source:
        vol2_af.append(c)

print(f"Found {len(vol2_af)} Vol 2 AF cases")
for c in vol2_af[:5]:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    imgs = content.get('image_urls', [])
    print(f"  {c['category']} | {c['title'][:60]}")
    print(f"    image_urls: {len(imgs)}")
    if imgs:
        print(f"    first: {imgs[0][:120]}")
    print()

# 3. Check Vol 1 count in storage
print("=== VOL 1 STORAGE CHECK ===")
# Try to list all book-cases files
resp = requests.get(
    f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
    params={"prefix": "book-cases", "limit": 100, "offset": 0},
    headers=headers
)
if resp.status_code == 200:
    items = resp.json()
    vol1_files = [i for i in items if 'vol2' not in str(i.get('name','')).lower() and 'case_' in str(i.get('name','')).lower()]
    print(f"  Total items in book-cases/: {len(items)}")
    print(f"  Vol 1 style files: {len(vol1_files)}")
    for item in vol1_files[:5]:
        print(f"    {item.get('name', str(item))[:80]}")
else:
    print(f"  List failed: {resp.status_code}")
