import sys
from pathlib import Path
from supabase import create_client

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

supabase = create_client(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

# Test inserting AFL
tests = [
    ("AFL", "AFL"),
    ("AF", "AF"),
    ("SVT", "SVT"),
    ("VT", "VT"),
    ("AFL", " AFL"),
    ("AFL", "AFL "),
]

for cat_val, cat_display in tests:
    try:
        r = supabase.from_("cases").insert({
            "title": f"TEST DELETE ME {cat_display}",
            "category": cat_val,
            "difficulty": "基础",
            "description": "test",
            "ecg_findings": [],
            "question": "test?",
            "hint": "hint",
            "key_points": [],
            "is_published": False,
            "content_json": {},
        }).execute()
        print(f"OK: category='{cat_display}'")
        # Delete test
        if r.data:
            supabase.from_("cases").delete().eq("id", r.data[0]["id"]).execute()
    except Exception as e:
        print(f"FAIL: category='{cat_display}' -> {str(e)[:200]}")
