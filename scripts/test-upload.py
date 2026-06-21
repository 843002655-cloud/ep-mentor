"""Quick test: render 1 PDF page → upload to Supabase Storage."""
import fitz, io, requests, re
from pathlib import Path

PDF_PATH = Path(__file__).parent / "svt-case-book.pdf"

env = {}
with open(Path(__file__).parent.parent / ".env.local", "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = "case-images"

print("Opening PDF...")
doc = fitz.open(str(PDF_PATH))
print(f"Pages: {doc.page_count}")

# Render page 20 (first figure-rich page of Case 1)
page = doc[20]
text = page.get_text("text")
print(f"Page 21 text preview: {text[:200]}")

# Find Fig on this page
figs = list(re.finditer(r'Fig\.\s*(\d+)\.(\d+)\b', text))
print(f"Fig refs on page 21: {[(m.group(1), m.group(2)) for m in figs[:5]]}")

# Render
print("Rendering page...")
pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
png_bytes = pix.tobytes("png")
print(f"PNG size: {len(png_bytes)} bytes ({len(png_bytes)/1024:.1f} KB)")

# Upload
storage_path = "book-cases/test_fig.png"
headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}

print(f"Uploading to {BUCKET}/{storage_path}...")
resp = requests.put(
    f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
    headers={**headers, "Content-Type": "image/png"},
    data=png_bytes,
)
print(f"PUT response: {resp.status_code}")
if resp.status_code not in (200, 201):
    print(f"  Body: {resp.text[:300]}")

    # Try POST
    print("Trying POST upload...")
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}",
        headers={"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY},
        files={"file": ("test_fig.png", png_bytes, "image/png")},
    )
    print(f"POST response: {resp.status_code}")
    if resp.status_code not in (200, 201):
        print(f"  Body: {resp.text[:300]}")

if resp.status_code in (200, 201):
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    print(f"SUCCESS: {public_url}")

doc.close()
