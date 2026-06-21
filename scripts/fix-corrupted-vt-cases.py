"""Restore 30 corrupted Bogun VT cases: clear incorrect Vol 3 image URLs and source."""
import json
import re

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL

headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&select=id,title,content_json,created_at&order=created_at",
    headers={**headers, "Accept": "application/json"},
)
r.raise_for_status()
all_vt = r.json()

# Find corrupted: Muresan Vol 3 source prefix + cn=0
corrupted_ids = []
for c in all_vt:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try: cj = json.loads(cj)
        except: cj = {}
    src = cj.get("source", "")
    if src and src.startswith("Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias"):
        m = re.search(r"Case\s+(\d+)", src)
        cn = int(m.group(1)) if m else 0
        if cn == 0:
            corrupted_ids.append((c["id"], c["title"], cj))

print(f"Found {len(corrupted_ids)} corrupted cases to fix")
print()

# Restore: clear image_urls and set source to empty (can't recover original)
fixed = 0
for cid, title, cj in corrupted_ids:
    img_count = len(cj.get("image_urls", []))
    cj["image_urls"] = []
    cj.pop("source", None)  # Remove corrupted source

    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}",
        json={"content_json": cj},
        headers={**headers, "Prefer": "return=minimal"},
    )
    if r.ok:
        fixed += 1
        if fixed <= 5:
            print(f"  Fixed: {title[:60]} (was {img_count} wrong imgs)")
    else:
        print(f"  FAIL: {cid[:8]} - {r.status_code}")

print(f"\nRestored {fixed}/{len(corrupted_ids)} corrupted cases")
