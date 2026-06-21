"""
Audit all cases for data quality issues.
"""
import json, sys, requests
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

# Fetch cases from API
r = requests.get("http://localhost:3000/api/cases", timeout=30)
data = r.json()
cases = data.get('cases', data) if isinstance(data, dict) else data
if isinstance(cases, dict):
    cases = list(cases.values())
print(f"Total cases: {len(cases)}")

# 1. Basic stats
cats = Counter(c.get('category', '?') for c in cases)
diffs = Counter(c.get('difficulty', '?') for c in cases)

print("\n=== Category Distribution ===")
for cat, count in cats.most_common():
    print(f"  {cat}: {count}")

print("\n=== Difficulty Distribution ===")
for d, count in diffs.most_common():
    print(f"  {d}: {count}")

# 2. Per-case audit
print(f"\n=== Per-Case Audit ===")
issues_by_case = defaultdict(list)
all_issues = Counter()

for i, c in enumerate(cases):
    case_issues = []
    title = (c.get('title') or '')[:60]
    cat = c.get('category', '?')
    diff = c.get('difficulty', '?')
    desc = (c.get('description') or '')
    published = c.get('is_published', False)
    cid = c.get('id', '')

    # Image count
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}

    image_urls = content.get('image_urls', [])
    figures = (content.get('ecg_findings') or {}).get('figures', [])
    img_count = len(image_urls) or len(figures)

    # Checks
    if len(desc) < 30:
        case_issues.append('DESC_TOO_SHORT')
    if not published:
        case_issues.append('UNPUBLISHED')
    if img_count == 0:
        case_issues.append('NO_IMAGES')
    if not content.get('key_points'):
        kp = c.get('key_points', [])
        if not kp or len(kp) < 3:
            case_issues.append('FEW_KEY_POINTS')
    if not content.get('final_diagnosis'):
        case_issues.append('NO_DIAGNOSIS')
    if not content.get('tags'):
        case_issues.append('NO_TAGS')
    if not content.get('learning_stages'):
        case_issues.append('NO_LEARNING_STAGES')

    # Volume detection
    source = str(content.get('source', ''))
    if 'Volume 1' in source:
        vol = 'V1'
    elif 'Volume 2' in source:
        vol = 'V2'
    else:
        vol = 'OTHER'

    # Category check against source
    expected_cat = None
    if vol == 'V1':
        expected_cat = 'SVT'
    elif vol == 'V2':
        expected_cat = 'AF'
    if expected_cat and cat != expected_cat:
        case_issues.append(f'CAT_MISMATCH({cat} vs expected {expected_cat})')

    for iss in case_issues:
        all_issues[iss] += 1
    issues_by_case[cid] = case_issues

    status = '⚠ ' + ','.join(case_issues) if case_issues else '✓'
    print(f"  {i+1:3d}. [{vol}] {cat:<4} {diff:<6} {img_count:2d}🖼  {title:<55} {status}")

# 3. Summary
print(f"\n=== Issues Summary ===")
total_issues = sum(1 for v in issues_by_case.values() if v)
print(f"Cases with issues: {total_issues}/{len(cases)}")
print()
for iss, count in all_issues.most_common():
    print(f"  {count:3d} - {iss}")

# 4. Image health spot-check
print(f"\n=== Image Health (spot check first image per case) ===")
broken = 0
for i, c in enumerate(cases):
    content = c.get('content_json') or {}
    if isinstance(content, str):
        try: content = json.loads(content)
        except: content = {}
    imgs = content.get('image_urls', [])
    if imgs:
        try:
            resp = requests.head(imgs[0], timeout=5)
            if resp.status_code != 200:
                print(f"  BROKEN({resp.status_code}): case {i+1} - {imgs[0][:100]}")
                broken += 1
        except Exception as e:
            print(f"  UNREACHABLE: case {i+1} - {imgs[0][:100]} - {e}")
            broken += 1
    else:
        print(f"  NO IMAGES: case {i+1} - {(c.get('title') or '')[:50]}")

if broken == 0:
    print(f"  All first images accessible!")
print(f"  Broken: {broken}/{len(cases)}")

print("\nDone!")
