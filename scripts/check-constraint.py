import sys, requests, json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

env = {}
env_path = Path("E:/fk claude/ep-mentor/.env.local")
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

# Query the constraint via SQL
url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
headers = {
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Try to get constraint info
sql = """SELECT conname, pg_get_constraintdef(oid) as def
FROM pg_constraint
WHERE conrelid = 'public.cases'::regclass AND contype = 'c';"""

resp = requests.post(url, headers=headers, json={"query": sql})
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")

# Also try: test insert with explicit AFL
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Check a recently saved case
resp2 = supabase.from_("cases").select("id, category").eq("category", "AFL").limit(3).execute()
print(f"\nAFL cases: {len(resp2.data)}")
for c in resp2.data:
    print(f"  {c['id'][:8]}... {c['category']}")

resp3 = supabase.from_("cases").select("id, category").eq("category", "AF").limit(3).execute()
print(f"AF cases: {len(resp3.data)}")
for c in resp3.data:
    print(f"  {c['id'][:8]}... {c['category']}")
