"""Debug script: simulate EXACT browser fetch + processing for source attribution"""
import requests, json, re

# Test with both SVT and AF cases
case_ids = []

# Get list of cases
r = requests.get('http://localhost:3000/api/cases', timeout=15)
cases = r.json().get('cases', [])
for cat in ['AF', 'SVT', 'VT']:
    for c in cases:
        if c.get('category') == cat:
            case_ids.append((cat, c['id']))
            break

for cat, cid in case_ids:
    print(f"\n{'='*60}")
    print(f"Testing {cat} case: {cid}")

    # Simulate EXACT client-side fetch
    r = requests.get(f'http://localhost:3000/api/cases/{cid}', timeout=10,
                     headers={'Content-Type': 'application/json'})
    data = r.json()
    c = data.get('case', {})

    # This is EXACTLY what the client code does
    content_json = c.get('content_json')
    print(f"  content_json is None: {content_json is None}")
    print(f"  content_json type: {type(content_json).__name__}")

    if content_json is not None and isinstance(content_json, dict):
        source = content_json.get('source')
        print(f"  source exists: {source is not None}")
        print(f"  source type: {type(source).__name__}")
        print(f"  source value: {source[:100] if source else 'EMPTY STRING'}")

        # EXACTLY replicate the TypeScript logic:
        # const cleanSource = (c.content_json?.source as string || "").replace(...)
        raw_source = source if source is not None else None
        ts_source = raw_source or ""  # (value as string || "")

        # Now apply the regex chain
        clean = ts_source
        clean = re.sub(r'^Clinical Cases in Cardiac Electrophysiology:\s*', '', clean)
        clean = re.sub(r', Lucian Muresan \(ed\.\), Springer \d{4}', '', clean)
        clean = re.sub(r'\. Cardiotext Publishing, \d{4}\.', '', clean)
        clean = re.sub(r'^Bogun FM\.\s*', '', clean)

        print(f"  cleanSource: [{len(clean)} chars] '{clean[:120]}'")
        print(f"  cleanSource is truthy: {bool(clean)}")
        print(f"  Would show in welcome: {'YES' if clean else 'NO'}")

        # Test what happens if content_json is present but source is missing
        if not source:
            print(f"  *** PROBLEM: source field missing from content_json!")
            print(f"  *** Available keys: {list(content_json.keys())[:15]}")
    elif content_json is None:
        print(f"  *** PROBLEM: content_json is None!")
        print(f"  *** Case keys: {list(c.keys())}")
    else:
        print(f"  *** PROBLEM: content_json is {type(content_json).__name__}, not dict!")
        print(f"  *** Value: {str(content_json)[:200]}")
