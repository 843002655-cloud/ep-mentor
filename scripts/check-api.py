"""Check API response for Vol 3 cases."""
import urllib.request
import json

# Fetch VT cases via local API
req = urllib.request.Request("http://localhost:3000/api/cases?category=VT&limit=5")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
except Exception as e:
    print(f"Error: {e}")
    exit(1)

print(f"Response type: {type(data).__name__}")

if isinstance(data, list):
    print(f"List of {len(data)} items")
    for item in data[:3]:
        cid = item.get("id", "")[:16]
        title = item.get("title", "")[:60]
        cj = item.get("content_json", {})
        if isinstance(cj, str):
            cj = json.loads(cj)
        src = cj.get("source", "") if isinstance(cj, dict) else "?"
        imgs = cj.get("image_urls", []) if isinstance(cj, dict) else []
        print(f"  {cid} | {title}")
        print(f"    source: {src[:100]}")
        print(f"    imgs: {len(imgs)}")
elif isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    # Try common patterns
    for key in ["cases", "data", "results"]:
        if key in data:
            items = data[key]
            print(f"  {key}: {len(items)} items")
            for item in items[:3]:
                cid = item.get("id", "")[:16]
                title = item.get("title", "")[:60]
                print(f"    {cid} | {title}")
