"""Check how many cases have source field populated."""
import json, requests

r = requests.get("http://localhost:3000/api/cases", timeout=15)
data = r.json()
cases = data.get('cases', data) if isinstance(data, dict) else data

print(f"Total cases: {len(cases)}")

has_source = 0
no_source = 0
by_category = {}

for c in cases:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    src = content.get('source', '')
    cat = c.get('category', '?')

    if src:
        has_source += 1
    else:
        no_source += 1
        print(f"  NO SOURCE: [{cat}] {c.get('title','')[:60]}")

    by_category[cat] = by_category.get(cat, {'total': 0, 'with_source': 0})
    by_category[cat]['total'] += 1
    if src:
        by_category[cat]['with_source'] += 1

print(f"\nHas source: {has_source}")
print(f"No source: {no_source}")
print(f"\nBy category:")
for cat in sorted(by_category):
    info = by_category[cat]
    print(f"  {cat}: {info['with_source']}/{info['total']} have source")

# Check a Vol 2 case detail
for c in cases:
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    src = content.get('source', '')
    if 'Atrial Fibrillation' in src:
        print(f"\nSample Vol 2 case:")
        print(f"  Title: {c.get('title','')[:60]}")
        print(f"  Source: {src[:120]}")
        print(f"  Cleaned: {src.replace('Clinical Cases in Cardiac Electrophysiology: ', '').replace(', Lucian Muresan (ed.), Springer 2023', '')}")
        break
