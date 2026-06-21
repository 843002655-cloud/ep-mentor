"""
Extract figures from SVT case book PDF → upload to Supabase Storage → update DB.
Strategy: Render each page containing Fig.X.Y at 2x → upload → link to case.
"""
import fitz
import re
import json
import io
from pathlib import Path
from collections import defaultdict
import requests
from supabase import create_client

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"

# Load config
ENV = {}
env_path = Path(__file__).parent.parent / ".env.local"
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        ENV[k.strip()] = v.strip()

SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = "case-images"

def upload_png(png_bytes, storage_path):
    """Upload PNG bytes to Supabase Storage, return public URL or None."""
    headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"

    # PUT (upsert)
    resp = requests.put(url, headers={**headers, "Content-Type": "image/png"}, data=png_bytes)
    if resp.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
        return public_url

    # POST fallback
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
        files={"file": (Path(storage_path).name, png_bytes, "image/png")},
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    print(f"    Upload failed ({resp.status_code}): {resp.text[:200]}")
    return None

def main():
    print("[*] Opening PDF...")
    doc = fitz.open(str(PDF_PATH))
    print(f"   {doc.page_count} pages")

    # ── Phase 1: Map pages to cases ──
    print("\n[1] Mapping pages to cases...")
    case_boundaries = []
    for pn in range(doc.page_count):
        text = doc[pn].get_text("text")
        m = re.search(r'^\d+\s*\nCase\s+(\d+)\s*\n', text, re.MULTILINE)
        if m and pn > 15:
            case_boundaries.append((int(m.group(1)), pn))
    case_boundaries.sort(key=lambda x: x[1])

    case_page_map = {}
    for i, (ci, sp) in enumerate(case_boundaries):
        ep = case_boundaries[i + 1][1] if i + 1 < len(case_boundaries) else doc.page_count
        for p in range(sp, ep):
            case_page_map[p] = ci

    # For pages before first case boundary, use Case 1
    first_page = case_boundaries[0][1] if case_boundaries else 0
    for p in range(first_page, doc.page_count):
        if p not in case_page_map:
            # Assign to nearest previous case
            for ci, sp in reversed(case_boundaries):
                if p >= sp:
                    case_page_map[p] = ci
                    break

    print(f"   {len(case_boundaries)} case chapters, {len(case_page_map)} pages mapped")

    # ── Phase 2: Find Fig.X.Y captions ──
    print("\n[*] Phase 2: Scanning for Fig.X.Y captions...")
    all_figs = []
    for pn in range(doc.page_count):
        text = doc[pn].get_text("text")
        page_case = case_page_map.get(pn)
        for m in re.finditer(r'Fig\.\s*(\d+)\.(\d+)\b', text):
            ci = int(m.group(1))
            fn = int(m.group(2))
            if page_case is None or ci != page_case:
                continue  # Skip cross-references from other cases

            # Get caption text
            start = m.start()
            end = text.find("\n", start)
            if end < 0:
                end = len(text)
            caption = text[start:end].strip()[:300]

            all_figs.append({"case": ci, "fig": fn, "page": pn, "caption": caption})

    # Deduplicate
    seen = set()
    unique_figs = []
    for f in all_figs:
        k = (f["case"], f["fig"])
        if k not in seen:
            seen.add(k)
            unique_figs.append(f)
    unique_figs.sort(key=lambda x: (x["case"], x["fig"]))
    print(f"   {len(unique_figs)} unique figures")

    # Show summary
    case_counts = defaultdict(int)
    for f in unique_figs:
        case_counts[f["case"]] += 1
    for ci in sorted(case_counts):
        print(f"   Case {ci:2d}: {case_counts[ci]:3d} figs")

    # ── Phase 3: Render & Upload ──
    print(f"\n[3] Rendering & uploading...")

    # Track which pages we've rendered (many figs share same page)
    page_fig_map = defaultdict(list)
    for f in unique_figs:
        page_fig_map[f["page"]].append(f)

    uploaded = []
    total_pages = len(page_fig_map)

    for idx, (pn, figs) in enumerate(sorted(page_fig_map.items())):
        page = doc[pn]
        # Render at 2x
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        png_bytes = pix.tobytes("png")

        for fig in figs:
            filename = f"case_{fig['case']:02d}_fig_{fig['fig']:02d}.png"
            storage_path = f"book-cases/{filename}"
            url = upload_png(png_bytes, storage_path)
            if url:
                uploaded.append({**fig, "url": url})
            else:
                print(f"   ❌ Failed: {filename}")

        if (idx + 1) % 20 == 0:
            print(f"   Rendered {idx + 1}/{total_pages} pages, {len(uploaded)} figs uploaded")

    print(f"   {len(uploaded)}/{len(unique_figs)} figures uploaded")

    if not uploaded:
        print("❌ No uploads succeeded. Check Supabase Storage bucket permissions.")
        doc.close()
        return

    # ── Phase 4: Update database ──
    print("\n📝 Phase 4: Updating database records...")

    try:
        resp = supabase.from_("cases").select("id, title, content_json").order("created_at").execute()
        cases = resp.data
        print(f"   Fetched {len(cases)} cases from DB")
    except Exception as e:
        print(f"   Error fetching cases: {e}")
        doc.close()
        return

    # Group uploads by case
    case_images = defaultdict(list)
    for fig in uploaded:
        case_images[fig["case"]].append(fig)

    updated = 0
    for case in (cases or []):
        title = case.get("title", "")
        cid = case["id"]

        # Try to match title to case index
        case_idx = None
        # "病例N：" prefix (new book cases)
        m = re.match(r'病例\s*(\d+)', title)
        if m:
            case_idx = int(m.group(1))
        # "Case N:" prefix
        if not case_idx:
            m = re.search(r'^Case\s+(\d+)[:\s]', title, re.IGNORECASE)
            if m:
                case_idx = int(m.group(1))

        if case_idx and case_idx in case_images:
            imgs = sorted(case_images[case_idx], key=lambda x: x["fig"])
            image_urls = [img["url"] for img in imgs]

            content = case.get("content_json") or {}
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except Exception:
                    content = {}

            content["image_urls"] = image_urls

            # Build structured figures for the detail page
            figures_data = []
            for img in imgs:
                figures_data.append({
                    "figure_number": f"Fig. {case_idx}.{img['fig']}",
                    "title": f"Figure {img['fig']}",
                    "description": img.get("caption", ""),
                    "teaching_points": "请观察图中的心电图/腔内图特征",
                    "key_question": "你在这张图中观察到了什么？请描述关键特征。",
                    "image_url": img["url"],
                })

            ecg = content.get("ecg_findings") or {}
            if isinstance(ecg, dict):
                ecg["figures"] = figures_data
                content["ecg_findings"] = ecg
            elif isinstance(ecg, list):
                content["ecg_findings"] = {"details": ecg, "figures": figures_data}

            try:
                result = supabase.from_("cases").update(
                    {"content_json": content}
                ).eq("id", cid).execute()
                if hasattr(result, 'error') and result.error:
                    print(f"   ❌ Case {case_idx}: {result.error.message}")
                else:
                    print(f"   ✅ Case {case_idx:2d}: {len(imgs):2d} images — {title[:55]}")
                    updated += 1
            except Exception as e:
                print(f"   ❌ Case {case_idx}: {e}")

    print(f"\n{'='*60}")
    print(f"Complete!")
    print(f"   {len(uploaded)} figures uploaded to {BUCKET}/book-cases/")
    print(f"   {updated} case records updated with image URLs")
    print(f"{'='*60}")

    doc.close()

if __name__ == "__main__":
    main()
