"""Audit VT cases - understand source fields and why 50 cases match the Vol3 filter."""
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
    f"{SUPABASE_URL}/rest/v1/cases?category=eq.VT&select=id,title,content_json,created_at",
    headers={**headers, "Accept": "application/json"},
)
r.raise_for_status()
all_vt = r.json()

print(f"Total VT cases: {len(all_vt)}")
print()

# Filter by created_at to find the 20 most recent
all_vt.sort(key=lambda c: c.get("created_at", ""), reverse=True)
print("=== 30 most recent VT cases ===")
for c in all_vt[:30]:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try: cj = json.loads(cj)
        except: cj = {}
    src = cj.get("source", "")
    created = c.get("created_at", "")[:19]

    # Detect source type
    if "Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias" in src:
        m = re.search(r"Case\s+(\d+)", src)
        cn = f"Case {m.group(1)}" if m else "NO-CASE-MATCH"
        stype = "Muresan-Vol3"
    elif "Bogun" in src:
        cn = "N/A"
        stype = "Bogun"
    else:
        cn = "N/A"
        stype = "OTHER"

    print(f"  [{created}] {stype} {cn} | {c['title'][:70]}")

print()
print("=== 30 OLDEST VT cases ===")
all_vt.sort(key=lambda c: c.get("created_at", ""))
for c in all_vt[:30]:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try: cj = json.loads(cj)
        except: cj = {}
    src = cj.get("source", "")
    created = c.get("created_at", "")[:19]

    if "Clinical Cases in Cardiac Electrophysiology: Ventricular Arrhythmias" in src:
        m = re.search(r"Case\s+(\d+)", src)
        cn = f"Case {m.group(1)}" if m else "NO-CASE-MATCH"
        stype = "Muresan-Vol3"
    elif "Bogun" in src:
        cn = "N/A"
        stype = "Bogun"
    else:
        cn = "N/A"
        stype = src[:60]

    print(f"  [{created}] {stype} {cn} | {c['title'][:70]}")

# Now check: are the cn=0 cases the same timestamp as cn=1-20?
print()
print("=== Checking: which cases were imported together? ===")
# Group by created_at (to minute resolution)
from collections import defaultdict
time_groups = defaultdict(list)
for c in all_vt:
    cj = c.get("content_json", {})
    if isinstance(cj, str):
        try: cj = json.loads(cj)
        except: cj = {}
    src = cj.get("source", "")
    created = c.get("created_at", "")[:16]  # minute level
    time_groups[created].append((src, c["title"][:60]))

for t, cases in sorted(time_groups.items()):
    if len(cases) >= 5:
        print(f"\n  Time: {t} ({len(cases)} cases)")
        for src, title in cases[:3]:
            sshort = src[:80] if src else "(empty)"
            print(f"    {title} | src={sshort}")
        if len(cases) > 3:
            print(f"    ... and {len(cases)-3} more")
