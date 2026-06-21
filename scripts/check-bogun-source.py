import json, requests, re
r = requests.get('http://localhost:3000/api/cases', timeout=15)
cases = r.json().get('cases', r.json())

# Check Bogun VT and Vol 2 cases
for label, check_fn in [
    ("Bogun VT", lambda c: 'Bogun' in str((c.get('content_json') or {}).get('source','') if isinstance(c.get('content_json'), dict) else '')),
    ("Vol 2 AF", lambda c: 'Atrial Fibrillation and Atrial Flutter' in str((c.get('content_json') or {}).get('source','') if isinstance(c.get('content_json'), dict) else '')),
]:
    for c in cases:
        content = c.get('content_json') or {}
        if isinstance(content, str):
            content = json.loads(content)
        src = str(content.get('source', ''))
        if not check_fn(c):
            continue

        source_book = str(content.get('source_book', ''))
        title = c.get('title', '')[:60]
        print(f"--- {label} ---")
        print(f"  Title: {title}")
        print(f"  Source: {src[:150]}")
        print(f"  Source_book: {source_book[:80]}")
        print()
        break  # just first one
