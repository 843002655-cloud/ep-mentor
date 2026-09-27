"""
精确重新提取病例图片 —— 修复旧脚本「整页渲染」导致的截图质量问题。

相比旧脚本 extract-pdf-images.py（整页 get_pixmap，图里混着文字），本脚本：
  1. 用 page.get_image_info() 定位每页嵌入图的精确坐标（bbox）
  2. 过滤掉小 logo（宽度 < MIN_WIDTH），只保留「内容图」
  3. 优先 doc.extract_image(xref) 提取原图（无损）；原图过小则 clip 3x 渲染兜底
  4. 按 fig 编号顺序对应每页的内容图

用法：
  python scripts/extract-pdf-images-precise.py             # dry-run，只输出到 extracted_figures/
  python scripts/extract-pdf-images-precise.py --upload    # 上传覆盖 Supabase 并更新 DB

⚠️ 先跑 dry-run 检查 extracted_figures/ 里的图是否干净，确认无误后再 --upload。
⚠️ --upload 会覆盖线上 content_json 的 image_urls / ecg_findings.figures，运行前建议先备份。
"""
import fitz
import re
import json
import argparse
from pathlib import Path
from collections import defaultdict
import requests
from supabase import create_client

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"
OUT_DIR = Path(__file__).parent / "extracted_figures"

MIN_WIDTH = 200   # 过滤 logo 的最小图宽度（PDF 坐标单位）
SCALE = 3.0       # clip 渲染倍率（原图过小时的兜底）

# ── 加载环境变量 ──
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

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def upload_png(png_bytes, storage_path):
    """上传到 Supabase Storage，返回 public URL 或 None。"""
    headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    resp = requests.put(url, headers={**headers, "Content-Type": "image/png"}, data=png_bytes)
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
        files={"file": (Path(storage_path).name, png_bytes, "image/png")},
    )
    if resp.status_code in (200, 201):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    print(f"    Upload failed ({resp.status_code}): {resp.text[:200]}")
    return None


def extract_figure_png(doc, page, img_info):
    """从嵌入图信息提取干净的图字节：优先原图，过小则 clip 渲染。"""
    try:
        extracted = doc.extract_image(img_info["number"])
        if extracted and extracted.get("width", 0) >= 300:
            return extracted["image"]
    except Exception as e:
        print(f"    extract_image fallback: {e}")

    clip = fitz.Rect(img_info["bbox"])
    pix = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip)
    return pix.tobytes("png")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload", action="store_true", help="上传覆盖线上并更新数据库")
    args = parser.parse_args()
    upload = args.upload

    OUT_DIR.mkdir(exist_ok=True)
    doc = fitz.open(str(PDF_PATH))
    print(f"[*] 打开 PDF：{doc.page_count} 页")

    # ── Phase 1: 映射页面到病例 ──
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
    first_page = case_boundaries[0][1] if case_boundaries else 0
    for p in range(first_page, doc.page_count):
        if p not in case_page_map:
            for ci, sp in reversed(case_boundaries):
                if p >= sp:
                    case_page_map[p] = ci
                    break
    print(f"   {len(case_boundaries)} 个病例章节，{len(case_page_map)} 页已映射")

    # ── Phase 2: 找 Fig.X.Y ──
    all_figs = []
    for pn in range(doc.page_count):
        text = doc[pn].get_text("text")
        page_case = case_page_map.get(pn)
        for m in re.finditer(r'Fig\.\s*(\d+)\.(\d+)\b', text):
            ci, fn = int(m.group(1)), int(m.group(2))
            if page_case is None or ci != page_case:
                continue
            start = m.start()
            end = text.find("\n", start)
            if end < 0:
                end = len(text)
            caption = text[start:end].strip()[:300]
            all_figs.append({"case": ci, "fig": fn, "page": pn, "caption": caption})

    seen, unique_figs = set(), []
    for f in all_figs:
        k = (f["case"], f["fig"])
        if k not in seen:
            seen.add(k)
            unique_figs.append(f)
    unique_figs.sort(key=lambda x: (x["case"], x["fig"]))
    print(f"   {len(unique_figs)} 个唯一 Fig")

    page_fig_map = defaultdict(list)
    for f in unique_figs:
        page_fig_map[f["page"]].append(f)

    # ── Phase 3: 精确裁剪 ──
    uploaded = []
    dryrun_files = []
    skipped = []

    for idx, (pn, figs) in enumerate(sorted(page_fig_map.items())):
        page = doc[pn]
        imgs = page.get_image_info()
        # 过滤小图（logo），只留内容图，按 y 坐标从上到下
        big = [im for im in imgs if (im["bbox"][2] - im["bbox"][0]) >= MIN_WIDTH]
        big.sort(key=lambda im: im["bbox"][1])

        ordered_figs = sorted(figs, key=lambda f: f["fig"])

        for i, fig in enumerate(ordered_figs):
            if i >= len(big):
                skipped.append((fig["case"], fig["fig"]))
                continue
            png = extract_figure_png(doc, page, big[i])
            filename = f"case_{fig['case']:02d}_fig_{fig['fig']:02d}.png"

            if upload:
                url = upload_png(png, f"book-cases/{filename}")
                if url:
                    uploaded.append({**fig, "url": url})
            else:
                (OUT_DIR / filename).write_bytes(png)
                dryrun_files.append(filename)

        if (idx + 1) % 30 == 0:
            print(f"   已处理 {idx + 1}/{len(page_fig_map)} 页")

    if not upload:
        print(f"\n[dry-run] 输出 {len(dryrun_files)} 张图到 {OUT_DIR}/，请检查质量后再 --upload")
        if skipped:
            print(f"[dry-run] {len(skipped)} 个 Fig 无对应内容图：{skipped[:15]}")
        doc.close()
        return

    print(f"\n[上传] {len(uploaded)} 张图已上传")

    # ── Phase 4: 更新数据库 ──
    resp = supabase.from_("cases").select("id, title, content_json").order("created_at").execute()
    cases = resp.data or []

    case_images = defaultdict(list)
    for fig in uploaded:
        case_images[fig["case"]].append(fig)

    updated = 0
    for case in cases:
        title = case.get("title", "")
        cid = case["id"]
        case_idx = None
        m = re.match(r'病例\s*(\d+)', title)
        if m:
            case_idx = int(m.group(1))
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

            result = supabase.from_("cases").update({"content_json": content}).eq("id", cid).execute()
            if hasattr(result, "error") and result.error:
                print(f"   ❌ Case {case_idx}: {result.error.message}")
            else:
                print(f"   ✅ Case {case_idx:2d}: {len(imgs):2d} 图 — {title[:55]}")
                updated += 1

    print(f"\n完成：{len(uploaded)} 张图，{updated} 个病例已更新")
    doc.close()


if __name__ == "__main__":
    main()
