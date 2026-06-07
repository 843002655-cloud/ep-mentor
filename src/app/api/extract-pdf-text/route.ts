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
    const tmpDir = await mkdtemp(join(tmpdir(), "ep-"));
    const pdfPath = join(tmpDir, "i.pdf");
    await writeFile(pdfPath, buffer);

    // One-liner with PyMuPDF — no temp .py file needed
    const text = await new Promise<string>((resolve, reject) => {
      exec(
        `python3 -c "
import fitz, json
doc = fitz.open('${pdfPath}')
parts = []
for i, page in enumerate(doc):
    t = page.get_text('text')
    if t.strip():
        parts.append(t)
doc.close()
print(json.dumps({'text': chr(10).join(parts), 'pages': len(doc)}))
"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout) => {
          unlink(pdfPath).catch(() => {});
          if (error) {
            reject(new Error(`PyMuPDF: ${error.message}`));
          } else {
            try {
              const r = JSON.parse(stdout.trim());
              resolve(r.text || "");
            } catch { resolve(stdout.trim()); }
          }
        }
      );
    });

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "PDF 无可提取文字，可能为扫描件" }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "PDF 解析失败" },
      { status: 500 }
    );
  }
}
