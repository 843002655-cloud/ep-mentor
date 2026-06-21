"""Check source format in API responses."""
import json, requests

r = requests.get("http://localhost:3000/api/cases", timeout=15)
data = r.json()
cases = data.get('cases', data) if isinstance(data, dict) else data

# Check if content_json is included in API response
c0 = cases[0] if cases else {}
has_content = 'content_json' in c0
print(f"API returns content_json: {has_content}")

# Check source formats
sources = set()
for c in cases[:5]:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    src = content.get('source', 'N/A')
    sources.add(src)
    print(f"  [{c.get('category','?')}] {c.get('title','')[:40]}")
    print(f"    source: {src[:120]}")

# Also check caseService format
print(f"\nAPI field keys: {list(c0.keys())}")
