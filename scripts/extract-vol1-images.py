"""
Vol 1 图片精确重提取 —— 修复「整页渲染」问题。
旧图是整页渲染（page_XXX.png，一页一张）。新版：每页每个嵌入图按 bbox 精确裁剪，
命名 page_XXX_YY.png（XXX=PDF 页码，YY=该页图序号）。

用法：
  python extract-vol1-images.py             # dry-run，输出到 extracted_figures/
  python extract-vol1-images.py --upload    # 清空 book-cases/ 的旧 page_*.png 后上传
"""
import fitz, re, sys, time, argparse
from pathlib import Path
from collections import defaultdict
import requests

sys.stdout.reconfigure(encoding='utf-8')

PDF = Path(__file__).parent / "svt-case-book-vol1.pdf"
OUT_DIR = Path(__file__).parent / "extracted_figures"

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
PREFIX = "book-cases"
MIN_WIDTH = 60    # vol1 有小 ECG 图（宽约 94），阈值设低一点
SCALE = 2.0

headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}


def list_vol1_pages():
    files, offset = [], 0
    while True:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",
            json={"prefix": PREFIX, "limit": 1000, "offset": offset},
            headers=headers, timeout=60,
        )
        if not r.ok:
            return files
        data = r.json()
        if not data:
            break
        files.extend(data)
        offset += len(data)
        if len(data) < 1000:
            break
    return files


def delete_old_pages():
    files = list_vol1_pages()
    page_files = [f for f in files if re.match(r'page_(\d+)', f["name"])]
    print(f"  清空 {PREFIX}/ 旧 page_*.png：{len(page_files)} 个文件")
    for f in page_files:
        requests.delete(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{PREFIX}/{f['name']}",
            headers=headers, timeout=60,
        )
    print("  清空完成")


def upload_png(png_bytes, storage_path):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    public = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    for attempt in range(3):
        try:
            r = requests.put(url, headers={**headers, "Content-Type": "image/png"}, data=png_bytes, timeout=60)
            if r.status_code in (200, 201):
                return public
            break
        except requests.exceptions.RequestException:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            break
    try:
        r = requests.post(url, headers=headers, files={"file": (Path(storage_path).name, png_bytes, "image/png")}, timeout=60)
        if r.status_code in (200, 201):
            return public
    except requests.exceptions.RequestException:
        pass
    print(f"  Upload failed: {storage_path}")
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload", action="store_true", help="清空 book-cases 旧图后上传")
    args = parser.parse_args()

    doc = fitz.open(str(PDF))
    total = doc.page_count
    print(f"PDF: {total} 页")

    # ── 每页内容图 bbox ──
    page_images = {}  # pn -> [bbox, ...]
    for pn in range(total):
        imgs = doc[pn].get_image_info()
        big = [im for im in imgs
               if (im["bbox"][2] - im["bbox"][0]) >= MIN_WIDTH
               and (im["bbox"][3] - im["bbox"][1]) >= MIN_WIDTH]
        big.sort(key=lambda im: im["bbox"][1])
        if big:
            page_images[pn] = [im["bbox"] for im in big]

    total_imgs = sum(len(v) for v in page_images.values())
    pages_with_imgs = len(page_images)
    print(f"共 {total_imgs} 张内容图，分布在 {pages_with_imgs} 页")

    if not args.upload:
        OUT_DIR.mkdir(exist_ok=True)
        for pn in sorted(page_images):
            for k, bbox in enumerate(page_images[pn]):
                clip = fitz.Rect(bbox)
                pix = doc[pn].get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip)
                fname = f"page_{pn:03d}_{k+1:02d}.png"
                (OUT_DIR / fname).write_bytes(pix.tobytes("png"))
        print(f"\n[dry-run] 输出 {total_imgs} 张图到 {OUT_DIR}/")
        doc.close()
        return

    # ── 清空 + 上传 ──
    delete_old_pages()
    uploaded = 0
    for pn in sorted(page_images):
        for k, bbox in enumerate(page_images[pn]):
            clip = fitz.Rect(bbox)
            pix = doc[pn].get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip)
            fname = f"page_{pn:03d}_{k+1:02d}.png"
            url = upload_png(pix.tobytes("png"), f"{PREFIX}/{fname}")
            if url:
                uploaded += 1
    print(f"\n完成：{uploaded}/{total_imgs} 张图上传")
    doc.close()


if __name__ == "__main__":
    main()
