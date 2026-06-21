"""Phase 1: Render all unique pages to local PNG files."""
import fitz, re, sys, io, json, time
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"
OUTPUT_DIR = Path(__file__).parent / "extracted_figures"
OUTPUT_DIR.mkdir(exist_ok=True)
META_FILE = OUTPUT_DIR / "figures_meta.json"

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
    for p in range(case_boundaries[0][1], doc.page_count):
        if p not in case_page_map:
            for ci, sp in reversed(case_boundaries):
                if p >= sp:
                    case_page_map[p] = ci
                    break

    print(f"  {len(case_boundaries)} chapters, {len(case_page_map)} pages mapped")

    # Phase 2: Find Fig.X.Y captions
    print("\n[2] Scanning Fig.X.Y captions...")
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
            if end < 0: end = len(text)
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
    print(f"  {len(unique_figs)} unique figures")

    case_counts = defaultdict(int)
    for f in unique_figs: case_counts[f["case"]] += 1
    for ci in sorted(case_counts):
        print(f"    Case {ci:2d}: {case_counts[ci]:3d} figs")

    # Phase 3: Group by page and render
    page_fig_map = defaultdict(list)
    for f in unique_figs:
        page_fig_map[f["page"]].append(f)

    total_pages = len(page_fig_map)
    print(f"\n[3] Rendering {total_pages} unique pages...")

    rendered = []
    for idx, (pn, figs) in enumerate(sorted(page_fig_map.items())):
        page = doc[pn]
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        png_bytes = pix.tobytes("png")

        # Save once per unique page
        base_name = f"page_{pn:03d}.png"
        filepath = OUTPUT_DIR / base_name
        with open(filepath, "wb") as f:
            f.write(png_bytes)

        for fig in figs:
            filename = f"case_{fig['case']:02d}_fig_{fig['fig']:02d}.png"
            # Copy/symlink the page image to the figure name
            fig_path = OUTPUT_DIR / filename
            with open(fig_path, "wb") as f:
                f.write(png_bytes)
            rendered.append({
                "case": fig["case"], "fig": fig["fig"],
                "page": pn, "caption": fig["caption"],
                "filename": filename, "page_file": base_name,
                "size_kb": filepath.stat().st_size / 1024,
            })

        if (idx + 1) % 50 == 0:
            elapsed = time.time() - t0
            print(f"  {idx + 1}/{total_pages} pages ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"  {len(rendered)} figures rendered ({elapsed:.1f}s)")

    # Save metadata
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(rendered, f, ensure_ascii=False, indent=2)
    print(f"  Metadata saved to {META_FILE}")

    doc.close()
    print(f"\nPhase 1 complete! {len(rendered)} figures in {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
