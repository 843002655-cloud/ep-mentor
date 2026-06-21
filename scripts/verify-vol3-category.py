"""Verify Vol 3 cases have correct category."""
import json

import requests

from supabase_env import SUPABASE_KEY, SUPABASE_URL
h = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/cases?select=id,title,category,created_at&created_at=gte.2026-06-13&order=created_at",
    headers={**h, "Accept": "application/json"},
)
cases = r.json()
print(f"Cases created on/after 2026-06-13: {len(cases)}")
for c in cases:
    cid = c["id"][:16]
    cat = c["category"]
    title = c["title"][:60]
    created = c["created_at"][:19]
    print(f"  {cid} | cat={cat} | {created} | {title}")
