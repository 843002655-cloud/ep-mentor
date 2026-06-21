"""Restore Bogun VT cases that were incorrectly overwritten with Vol 3 image URLs."""
import json

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
BUCKET = "case-images"

headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

# Get all VT cases
r = requests.get(f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&select=id,title,content_json",
                headers={**headers, "Accept": "application/json"})
r.raise_for_status()
all_vt = r.json()

# Find Bogun cases that have been overwritten (content_json.source contains "Bogun" but image_urls contain "book-cases-vol3")
bogun_overwritten = []
for c in all_vt:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try: cj = json.loads(cj)
        except: continue
    src = cj.get("source", "")
    img_urls = cj.get("image_urls", [])
    if "Bogun" in src and any("book-cases-vol3" in (url or "") for url in img_urls):
        bogun_overwritten.append((c["id"], c["title"][:60], len(img_urls)))

print(f"Bogun cases overwritten with Vol 3 URLs: {len(bogun_overwritten)}")
for cid, title, n in bogun_overwritten[:5]:
    print(f"  {cid[:8]}: {title} ({n} urls)")

# Restore: set image_urls to empty array (Bogun cases don't have extracted images)
restored = 0
for cid, title, _ in bogun_overwritten:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}",
        json={"content_json": {"image_urls": []}},  # Will merge since jsonb
        headers={**headers, "Prefer": "return=minimal"},
    )
    # Actually need full content_json, let's read and update properly
    # Get current content_json
    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}&select=content_json",
                     headers={**headers, "Accept": "application/json"})
    if r2.ok and r2.json():
        cj = r2.json()[0].get("content_json", {})
        if isinstance(cj, str):
            try: cj = json.loads(cj)
            except: cj = {}
        cj["image_urls"] = []
        r3 = requests.patch(
            f"{SUPABASE_URL}/rest/v1/cases?id=eq.{cid}",
            json={"content_json": cj},
            headers={**headers, "Prefer": "return=minimal"},
        )
        if r3.ok:
            restored += 1

print(f"Restored {restored}/{len(bogun_overwritten)} Bogun cases")
