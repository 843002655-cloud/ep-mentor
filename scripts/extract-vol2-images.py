"""
Vol 2 image extraction: extract ALL embedded images per case page.
Images are CARTO maps without Fig.X.Y captions.
"""
import fitz, re, sys, json, time, argparse
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
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    # PUT 覆盖，网络错误自动重试 3 次（退避）
    for attempt in range(3):
        try:
            resp = requests.put(url, headers={**headers, "Content-Type": "image/png"}, data=png_bytes, timeout=60)
            if resp.status_code in (200, 201):
                return public_url
            break
        except requests.exceptions.RequestException:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            break

    # POST fallback
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
            files={"file": (Path(storage_path).name, png_bytes, "image/png")},
            timeout=60,
        )
        if resp.status_code in (200, 201):
            return public_url
    except requests.exceptions.RequestException:
        pass

    print(f"    Upload failed: {storage_path}")
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload", action="store_true", help="上传覆盖线上（默认 dry-run 输出到本地）")
    args = parser.parse_args()

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

    OUT_DIR = Path(__file__).parent / "extracted_figures"
    if not args.upload:
        OUT_DIR.mkdir(exist_ok=True)

    for pn in sorted(case_page_map.keys()):
        ci = case_page_map[pn]
        page = doc[pn]
        imgs = page.get_image_info()
        if not imgs:
            continue  # Skip text-only pages
        # 过滤小图（logo），只裁内容图，按 y 坐标从上到下
        big = [im for im in imgs if (im["bbox"][2] - im["bbox"][0]) >= 200]
        big.sort(key=lambda im: im["bbox"][1])
        for im in big:
            clip = fitz.Rect(im["bbox"])
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), clip=clip)
            png_bytes = pix.tobytes("png")
            case_pages[ci].append((pn, png_bytes))

    total_imgs = sum(len(pages) for pages in case_pages.values())
    print(f"  {total_imgs} page-images across {len(case_pages)} cases")

    for ci in sorted(case_pages):
        print(f"    Case {ci:2d}: {len(case_pages[ci]):3d} pages")

    # Phase 3: Upload to Supabase（总是 PUT 覆盖，幂等，中断可安全重跑）
    print(f"\n[3] Uploading to Supabase Storage...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    case_image_urls = defaultdict(list)

    uploaded = 0
    for ci in sorted(case_pages):
        pages = case_pages[ci]
        for pi, (pn, png_bytes) in enumerate(pages):
            filename = f"vol2_case_{ci:02d}_page_{pi+1:02d}.png"
            if not args.upload:
                (OUT_DIR / filename).write_bytes(png_bytes)
                uploaded += 1
                continue
            storage_path = f"book-cases-vol2/{filename}"
            url = upload_png(png_bytes, storage_path)
            if url:
                case_image_urls[ci].append({"url": url, "page": pn, "filename": filename})
                uploaded += 1

        print(f"  Case {ci:2d}: {len(case_image_urls[ci])}/{len(pages)} images")

    elapsed = time.time() - t0
    print(f"  {uploaded}/{total_imgs} uploaded ({elapsed:.1f}s)")

    if not args.upload:
        print(f"\n[dry-run] 输出 {uploaded} 张图到 {OUT_DIR}/，检查质量后再 --upload")
        doc.close()
        return

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
        source = str(content.get("source", ""))
        source_book = str(content.get("source_book", ""))
        # 只处理 Vol 2（Atrial）病例，避免误覆盖 Vol 1（Supraventricular）/ Vol 3（Ventricular）
        if "Atrial" not in source and "Atrial" not in source_book:
            continue
        m = re.search(r'Case\s+(\d+)', source, re.IGNORECASE)
        if not m:
            m = re.search(r'Case\s+(\d+)', source_book, re.IGNORECASE)
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
