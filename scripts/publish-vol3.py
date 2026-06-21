"""Publish all 20 Vol 3 cases."""
import json

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
h = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

# Get all Vol 3 cases
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&created_at=gte.2026-06-13&select=id,title,is_published&order=created_at",
    headers={**h, "Accept": "application/json"},
)
cases = r.json()
print(f"Vol 3 cases: {len(cases)}")

published = 0
for c in cases:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/cases?id=eq.{c['id']}",
        json={"is_published": True},
        headers={**h, "Prefer": "return=minimal"},
    )
    if r.ok:
        published += 1
        if published <= 5:
            print(f"  Published: {c['title'][:60]}")
    else:
        print(f"  FAIL: {c['id'][:8]} - {r.status_code}")

print(f"\nPublished {published}/{len(cases)} cases")
