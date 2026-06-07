import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpDir = await mkdtemp(join(tmpdir(), "ep-pdf-"));
    const pdfPath = join(tmpDir, "input.pdf");
    await writeFile(pdfPath, buffer);

    // Use PyMuPDF (fitz) via python3 to extract text
    const pyScript = `
import fitz, json, sys
doc = fitz.open("${pdfPath.replace(/\\/g, "\\\\")}")
text_parts = []
for i, page in enumerate(doc):
    t = page.get_text("text")
    if t.strip():
        text_parts.append(f"--- Page {i+1} ---\\n{t}")
print(json.dumps({"text": "\\n".join(text_parts), "pages": len(doc)}))
doc.close()
`;

    const pyPath = join(tmpDir, "extract.py");
    await writeFile(pyPath, pyScript);

    const result = await new Promise<{ text: string; pages: number }>((resolve, reject) => {
      exec(
        `python3 "${pyPath}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout) => {
          // Clean up
          unlink(pdfPath).catch(() => {});
          unlink(pyPath).catch(() => {});
          if (error) {
            reject(new Error(`PyMuPDF extraction failed: ${error.message}`));
          } else {
            try {
              resolve(JSON.parse(stdout.trim()));
            } catch {
              resolve({ text: stdout, pages: 0 });
            }
          }
        }
      );
    });

    if (!result.text || result.text.trim().length < 20) {
      return NextResponse.json({ error: "PDF 内容不足，可能为扫描件" }, { status: 400 });
    }

    return NextResponse.json({ text: result.text.trim(), pages: result.pages });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "PDF 解析失败" },
      { status: 500 }
    );
  }
}
