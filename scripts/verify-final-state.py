"""Final verification of VT cases."""
import json
import re

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
h = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&select=id,title,content_json,created_at&order=created_at",
    headers={**h, "Accept": "application/json"},
)
all_vt = r.json()

bogun_good = []
corrupted = []
vol3 = []
no_source = []

for c in all_vt:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try:
            cj = json.loads(cj)
        except:
            cj = {}
    src = cj.get("source", "")
    imgs = cj.get("image_urls", [])

    if "Clinical Cases in Cardiac" in src and "Muresan" in src:
        m = re.search(r"Case\s+(\d+)", src)
        cn = int(m.group(1)) if m else 0
        if cn > 0:
            vol3.append(c)
        else:
            corrupted.append(c)
    elif "Bogun" in src:
        bogun_good.append(c)
    elif not src:
        no_source.append(c)

print(f"Good Bogun: {len(bogun_good)}")
print(f"Corrupted (still Muresan cn=0): {len(corrupted)}")
print(f"Vol 3: {len(vol3)}")
print(f"No source (restored): {len(no_source)}")
print(f"Total: {len(all_vt)}")
print()

# Vol 3 cases summary
print("=== Vol 3 Cases ===")
for c in vol3[:3]:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        cj = json.loads(cj)
    title = c["title"]
    src = cj.get("source", "")
    imgs = cj.get("image_urls", [])
    print(f"  {title[:60]}")
    print(f"  src: {src[:100]}")
    print(f"  imgs: {len(imgs)}")
    print()
print(f"  ... and {len(vol3) - 3} more")
print()

# Restored cases summary
if no_source:
    print("=== Restored Cases ===")
    for c in no_source[:3]:
        cj = c.get("content_json", {})
        if isinstance(cj, str):
            cj = json.loads(cj)
        title = c["title"]
        imgs = cj.get("image_urls", [])
        print(f"  {title[:60]}")
        print(f"  src: (empty)")
        print(f"  imgs: {len(imgs)}")
        print()
    print(f"  ... and {len(no_source) - 3} more")
