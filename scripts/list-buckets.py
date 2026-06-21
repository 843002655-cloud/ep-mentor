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

resp = requests.get(
    f"{SUPABASE_URL}/storage/v1/bucket",
    headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
)
print(f"Buckets ({resp.status_code}):")
data = resp.json() if resp.ok else []
for b in data:
    if isinstance(b, dict):
        print(f"  - {b.get('name', '?')} (public={b.get('public', True)})")
    else:
        print(f"  - {b}")
if not data:
    print("  (none found)")
