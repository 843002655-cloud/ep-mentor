"""Phase 3: Update case records in Supabase with image URLs."""
import sys, json, time, re
from pathlib import Path
from collections import defaultdict
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

META_FILE = Path(__file__).parent / "extracted_figures" / "figures_meta.json"

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

def extract_case_index(title, content):
    """Try multiple strategies to find the case number."""
    # Strategy 1: "病例N：" prefix
    m = re.match(r'病例\s*(\d+)', title)
    if m: return int(m.group(1))

    # Strategy 2: "Case N:" prefix
    m = re.search(r'^Case\s+(\d+)[:\s]', title, re.IGNORECASE)
    if m: return int(m.group(1))

    # Strategy 3: source in content_json (e.g. "... Case 11")
    if isinstance(content, dict):
        source = content.get("source", "")
        m = re.search(r'Case\s+(\d+)', str(source), re.IGNORECASE)
        if m: return int(m.group(1))

        # source_book may be the original title like "Case 11: WPW..."
        source_book = content.get("source_book", "")
        m = re.search(r'Case\s+(\d+)', str(source_book), re.IGNORECASE)
        if m: return int(m.group(1))

    # Strategy 4: Look for "Case N" anywhere in title
    m = re.search(r'Case\s+(\d+)', title, re.IGNORECASE)
    if m: return int(m.group(1))

    return None

def main():
    t0 = time.time()

    # Load figure metadata
    with open(META_FILE, "r", encoding="utf-8") as f:
        figures = json.load(f)
    uploaded = [f for f in figures if f.get("url")]
    print(f"{len(uploaded)} figures with URLs")

    case_images = defaultdict(list)
    for fig in uploaded:
        case_images[fig["case"]].append(fig)

    # Connect to Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    resp = supabase.from_("cases").select("id, title, content_json").order("created_at").execute()
    cases = resp.data
    print(f"{len(cases)} cases in DB\n")

    updated = 0
    unmatched = []

    for case in (cases or []):
        title = case.get("title", "")
        cid = case["id"]

        content = case.get("content_json") or {}
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except Exception:
                content = {}

        case_idx = extract_case_index(title, content)

        if not case_idx or case_idx not in case_images:
            unmatched.append(f"  '{title[:60]}' -> {case_idx} (source={content.get('source','?')[:60]})")
            continue

        imgs = sorted(case_images[case_idx], key=lambda x: x["fig"])
        image_urls = [img["url"] for img in imgs]

        content["image_urls"] = image_urls

        # Build figures
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
        else:
            content["ecg_findings"] = {"figures": figures_data}

        try:
            result = supabase.from_("cases").update(
                {"content_json": content}
            ).eq("id", cid).execute()
            if hasattr(result, 'error') and result.error:
                print(f"  FAIL Case {case_idx:2d}: {result.error.message}")
            else:
                print(f"  OK   Case {case_idx:2d}: {len(imgs):2d} images - {title[:55]}")
                updated += 1
        except Exception as e:
            print(f"  FAIL Case {case_idx:2d}: {e}")

    print(f"\nUpdated: {updated} cases")

    if unmatched:
        print(f"\nUnmatched ({len(unmatched)}):")
        for u in unmatched:
            print(u)

    elapsed = time.time() - t0
    print(f"\nDone ({elapsed:.1f}s)")

if __name__ == "__main__":
    main()
