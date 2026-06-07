import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = await mkdtemp(join(tmpdir(), "ep-"));
    const pdfPath = join(tmpDir, "i.pdf");
    const pyPath = join(tmpDir, "e.py");
    await writeFile(pdfPath, buffer);

    // Write Python script to temp file (avoids shell escaping issues)
    const escapedPdf = pdfPath.replace(/\\/g, "\\\\");
    await writeFile(pyPath,
`import fitz, json
doc = fitz.open("${escapedPdf}")
parts = []
for page in doc:
    t = page.get_text("text")
    if t.strip():
        parts.append(t)
doc.close()
print(json.dumps({"text": "\\n".join(parts), "pages": len(parts)}))
`);

    try {
      const stdout = execSync(`python3 "${pyPath}"`, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      }).toString();
      const result = JSON.parse(stdout.trim());

      if (!result.text || result.text.trim().length < 20) {
        return NextResponse.json({ error: "PDF 无可提取文字，可能为扫描件" }, { status: 400 });
      }
      return NextResponse.json({ text: result.text, pages: result.pages });
    } finally {
      unlink(pdfPath).catch(() => {});
      unlink(pyPath).catch(() => {});
    }
  } catch (error: unknown) {
    const msg = (error as Error).message || "未知错误";
    console.error("PDF extract error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
