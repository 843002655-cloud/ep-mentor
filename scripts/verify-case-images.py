"""Quick verify: check a case's content_json.image_urls and ecg_findings.figures."""
import json, sys
from pathlib import Path
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

env = {}
env_path = Path(__file__).parent.parent / ".env.local"
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

supabase = create_client(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

# Fetch Case 1
resp = supabase.from_("cases").select("id, title, content_json").eq("title", "典型逆钟向心房扑动与起源于右心房（冠状窦口）的局灶性房性心动过速").limit(1).execute()
if resp.data:
    case = resp.data[0]
    content = case.get("content_json") or {}
    if isinstance(content, str):
        content = json.loads(content)

    urls = content.get("image_urls", [])
    ecg = content.get("ecg_findings", {})
    figs = ecg.get("figures", []) if isinstance(ecg, dict) else []

    print(f"Title: {case['title']}")
    print(f"image_urls: {len(urls)} URLs")
    if urls:
        print(f"  First: {urls[0][:80]}...")
        print(f"  Last:  {urls[-1][:80]}...")
    print(f"figures: {len(figs)} structured figures")
    if figs:
        print(f"  First: {figs[0]['figure_number']} -> {figs[0].get('image_url','?')[:80]}...")
        print(f"  Last:  {figs[-1]['figure_number']} -> {figs[-1].get('image_url','?')[:80]}...")
else:
    print("Case 1 not found!")
