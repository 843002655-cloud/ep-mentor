#!/usr/bin/env python3
"""Audit and optionally fix case product tags in shared Supabase DB."""

from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def fetch_all_cases() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 500
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/cases",
            headers={**HEADERS, "Range": f"{offset}-{offset + page - 1}"},
            params={"select": "id,title,category,is_published,content_json,created_at", "order": "created_at"},
            timeout=60,
        )
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def product_of(case: dict) -> str:
    content = case.get("content_json") or {}
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            content = {}
    product = content.get("product") if isinstance(content, dict) else None
    return product if isinstance(product, str) and product else "(none)"


def main() -> None:
    fix = "--fix" in sys.argv
    cases = fetch_all_cases()
    counts = Counter(product_of(c) for c in cases)
    print(f"Total cases: {len(cases)}")
    print("By content_json.product:")
    for product, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {product}: {count}")

    ecg = [c for c in cases if product_of(c) == "ecg-academy"]
    ep = [c for c in cases if product_of(c) in ("(none)", "ep-mentor")]
    other = [c for c in cases if product_of(c) not in ("ecg-academy", "(none)", "ep-mentor")]

    print(f"\nEP Mentor eligible (none/ep-mentor): {len(ep)}")
    print(f"ECG Academy (ecg-academy): {len(ecg)}")
    if other:
        print(f"Other product tags: {len(other)}")

    # ECG cases wrongly visible on EP Mentor before fix: ecg + category SVT
    ecg_svt = [c for c in ecg if c.get("category") == "SVT"]
    print(f"\nECG cases with DB category=SVT (was leaking to EP Mentor SVT tab): {len(ecg_svt)}")
    if ecg_svt[:5]:
        print("  Examples:")
        for c in ecg_svt[:5]:
            content = c.get("content_json") or {}
            display = content.get("display_category") if isinstance(content, dict) else None
            print(f"    - {c.get('title')} (display_category={display})")

    missing_product = [c for c in cases if product_of(c) == "(none)"]
    if missing_product:
        print(f"\nLegacy cases without product tag: {len(missing_product)} (treated as EP Mentor)")

    if not fix:
        print("\nRun with --fix to tag legacy EP cases as ep-mentor (skips ecg-academy).")
        return

    updated = 0
    for case in missing_product:
        content = case.get("content_json") or {}
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                content = {}
        if not isinstance(content, dict):
            content = {}
        content["product"] = "ep-mentor"
        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/cases?id=eq.{case['id']}",
            headers=HEADERS,
            json={"content_json": content},
            timeout=30,
        )
        resp.raise_for_status()
        updated += 1
    print(f"\nTagged {updated} legacy cases with product=ep-mentor")


if __name__ == "__main__":
    main()
