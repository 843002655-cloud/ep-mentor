"""Final verification - check a Vol 3 case page renders correctly."""
import json
import re

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
h = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY, "Content-Type": "application/json"}

# Get Vol 3 cases
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&created_at=gte.2026-06-13&select=id,title,content_json,is_published&order=created_at&limit=3",
    headers={**h, "Accept": "application/json"},
)
cases = r.json()
print(f"Vol 3 VT cases: {len(cases)}")
for c in cases:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        cj = json.loads(cj)
    src = cj.get("source", "")
    imgs = cj.get("image_urls", [])
    published = c.get("is_published", False)

    # Simulate cleanSource logic from page.tsx
    clean = src
    clean = re.sub(r"^Clinical Cases in Cardiac Electrophysiology:\s*", "", clean)
    clean = re.sub(r", Lucian Muresan \(ed\.\), Springer \d{4}", "", clean)
    clean = re.sub(r"\. Cardiotext Publishing, \d{4}\.", "", clean)
    clean = re.sub(r"^Bogun FM\.\s*", "", clean)

    print(f"\n  Title:  {c['title'][:60]}")
    print(f"  Published: {published}")
    print(f"  Source (raw):    {src[:120]}")
    print(f"  Source (clean):  {clean}")
    print(f"  Images: {len(imgs)}")
    if imgs:
        print(f"  First image URL: {imgs[0][:100]}")

# Check if cases are published
print("\n\n⚠️  Checking is_published status...")
r2 = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&created_at=gte.2026-06-13&is_published=eq.true&select=id",
    headers={**h, "Accept": "application/json"},
)
published_count = len(r2.json())
print(f"  Published Vol 3 cases: {published_count}/20")
if published_count < 20:
    print("  ⚠️  Some cases are NOT published! They won't show on the main page!")
    # Show unpublished
    r3 = requests.get(
        f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&created_at=gte.2026-06-13&is_published=eq.false&select=id,title",
        headers={**h, "Accept": "application/json"},
    )
    for c in r3.json():
        print(f"    Unpublished: {c['title'][:60]}")
