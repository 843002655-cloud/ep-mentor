"""Phase 2: Upload rendered figures to Supabase Storage."""
import sys, json, time
from pathlib import Path
import requests

sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_DIR = Path(__file__).parent / "extracted_figures"
META_FILE = OUTPUT_DIR / "figures_meta.json"
UPLOAD_LOG = OUTPUT_DIR / "upload_log.json"

# Load config
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

def upload_png(filepath, storage_path):
    """Upload a PNG file. Returns public URL or None."""
    with open(filepath, "rb") as f:
        data = f.read()

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "image/png",
    }

    # PUT upsert
    resp = requests.put(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers=headers,
        data=data,
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    # Retry with POST
    time.sleep(0.5)
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
        files={"file": (Path(storage_path).name, data, "image/png")},
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    print(f"    FAIL {resp.status_code}: {resp.text[:150]}")
    return None

def main():
    t0 = time.time()

    # Load metadata
    with open(META_FILE, "r", encoding="utf-8") as f:
        figures = json.load(f)
    print(f"Loaded {len(figures)} figure entries")

    # Group by page to avoid redundant uploads (same page = same file)
    by_page = {}
    for fig in figures:
        page_key = fig["page_file"]
        if page_key not in by_page:
            by_page[page_key] = []
        by_page[page_key].append(fig)

    print(f"  {len(by_page)} unique pages to upload")

    # Check total size
    total_size = 0
    for page_file in by_page:
        fp = OUTPUT_DIR / page_file
        if fp.exists():
            total_size += fp.stat().st_size
    print(f"  Total size: {total_size / 1024 / 1024:.1f} MB")

    # Upload each unique page, then map URLs to all figures
    page_url_map = {}  # page_file -> public URL
    success = 0
    failed = 0

    for i, (page_file, figs) in enumerate(sorted(by_page.items())):
        fp = OUTPUT_DIR / page_file
        if not fp.exists():
            print(f"  MISSING: {page_file}")
            for fig in figs:
                fig["url"] = None
            failed += len(figs)
            continue

        # Upload
        storage_path = f"book-cases/{page_file}"
        url = upload_png(fp, storage_path)

        if url:
            page_url_map[page_file] = url
            for fig in figs:
                fig["url"] = url
            success += len(figs)
        else:
            for fig in figs:
                fig["url"] = None
            failed += len(figs)

        if (i + 1) % 25 == 0:
            elapsed = time.time() - t0
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  {i + 1}/{len(by_page)} pages, {success} figs ok ({elapsed:.1f}s, {rate:.1f} pg/s)")

    elapsed = time.time() - t0
    print(f"  Complete: {success} figs uploaded, {failed} failed ({elapsed:.1f}s)")

    # Save updated metadata with URLs
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(figures, f, ensure_ascii=False, indent=2)
    print(f"  Metadata updated with URLs")

    # Save upload log
    with open(UPLOAD_LOG, "w", encoding="utf-8") as f:
        json.dump({
            "success": success,
            "failed": failed,
            "elapsed_seconds": elapsed,
            "page_url_map": {k: v for k, v in page_url_map.items()},
        }, f, ensure_ascii=False, indent=2)
    print(f"  Upload log saved")

if __name__ == "__main__":
    main()
