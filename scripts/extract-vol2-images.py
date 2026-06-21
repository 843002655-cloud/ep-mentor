"""
Vol 2 image extraction: extract ALL embedded images per case page.
Images are CARTO maps without Fig.X.Y captions.
"""
import fitz, re, sys, json, time
from pathlib import Path
from collections import defaultdict
import requests
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"

# Config
env = {}
env_path = Path(__file__).parent.parent / ".env.local"
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = "case-images"

def upload_png(png_bytes, storage_path):
    headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}
    resp = requests.put(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={**headers, "Content-Type": "image/png"},
        data=png_bytes,
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
        files={"file": (Path(storage_path).name, png_bytes, "image/png")},
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    print(f"    Upload failed ({resp.status_code}): {resp.text[:150]}")
    return None

def main():
    t0 = time.time()
    print("Opening PDF...")
    doc = fitz.open(str(PDF_PATH))
    print(f"  {doc.page_count} pages")

    # Phase 1: Map pages to cases
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

    print(f"  {len(case_boundaries)} cases, {len(case_page_map)} pages mapped")

    # Phase 2: Extract pages that have embedded images only
    print("\n[2] Extracting pages with embedded images...")
    case_pages = defaultdict(list)  # case -> [(page_num, image_count, png_bytes), ...]

    for pn in sorted(case_page_map.keys()):
        ci = case_page_map[pn]
        page = doc[pn]
        embedded = page.get_images()
        if not embedded:
            continue  # Skip text-only pages
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        png_bytes = pix.tobytes("png")
        case_pages[ci].append((pn, png_bytes))

    total_imgs = sum(len(pages) for pages in case_pages.values())
    print(f"  {total_imgs} page-images across {len(case_pages)} cases")

    for ci in sorted(case_pages):
        print(f"    Case {ci:2d}: {len(case_pages[ci]):3d} pages")

    # Phase 3: Upload to Supabase
    print(f"\n[3] Uploading to Supabase Storage...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    case_image_urls = defaultdict(list)

    uploaded = 0
    for ci in sorted(case_pages):
        pages = case_pages[ci]
        for pi, (pn, png_bytes) in enumerate(pages):
            filename = f"vol2_case_{ci:02d}_page_{pi+1:02d}.png"
            storage_path = f"book-cases-vol2/{filename}"
            url = upload_png(png_bytes, storage_path)
            if url:
                case_image_urls[ci].append({"url": url, "page": pn, "filename": filename})
                uploaded += 1

        print(f"  Case {ci:2d}: {len(case_image_urls[ci])}/{len(pages)} uploaded")

    elapsed = time.time() - t0
    print(f"  {uploaded}/{total_imgs} uploaded ({elapsed:.1f}s)")

    if not case_image_urls:
        print("No uploads succeeded!")
        doc.close()
        return

    # Phase 4: Update DB
    print("\n[4] Updating database records...")
    resp = supabase.from_("cases").select("id, title, content_json").order("created_at").execute()
    cases = resp.data
    print(f"  Fetched {len(cases)} cases")

    # Match cases by finding case index in source field
    updated = 0
    for case in (cases or []):
        title = case.get("title", "")
        cid = case["id"]
        content = case.get("content_json") or {}
        if isinstance(content, str):
            try: content = json.loads(content)
            except: content = {}

        # Find case index from source field
        source = content.get("source", "")
        m = re.search(r'Case\s+(\d+)', str(source), re.IGNORECASE)
        if not m:
            # Try source_book
            source_book = content.get("source_book", "")
            m = re.search(r'Case\s+(\d+)', str(source_book), re.IGNORECASE)
        if not m:
            # Try title
            m = re.match(r'病例\s*(\d+)', title)

        case_idx = int(m.group(1)) if m else None

        if not case_idx or case_idx not in case_image_urls:
            continue

        imgs = case_image_urls[case_idx]
        image_urls = [img["url"] for img in imgs]

        content["image_urls"] = image_urls
        figures_data = []
        for img in imgs:
            figures_data.append({
                "figure_number": f"Page {img['page']}",
                "title": f"Page {img['page']}",
                "description": "",
                "teaching_points": "请观察图中的心电图/腔内图/CARTO标测特征",
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
            result = supabase.from_("cases").update({"content_json": content}).eq("id", cid).execute()
            if hasattr(result, 'error') and result.error:
                print(f"  FAIL Case {case_idx}: {result.error.message}")
            else:
                print(f"  OK   Case {case_idx:2d}: {len(imgs):3d} images - {title[:55]}")
                updated += 1
        except Exception as e:
            print(f"  FAIL Case {case_idx}: {e}")

    print(f"\n  Updated: {updated} cases")
    print(f"Complete! ({time.time()-t0:.1f}s)")
    doc.close()

if __name__ == "__main__":
    main()
