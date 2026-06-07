import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save to temp directory
    const tmpDir = await mkdtemp(join(tmpdir(), "ep-pdf-"));
    const pdfPath = join(tmpDir, "input.pdf");
    await writeFile(pdfPath, buffer);

    // Use markitdown to extract text
    const text = await new Promise<string>((resolve, reject) => {
      exec(
        `markitdown "${pdfPath}"`,
        { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
        (error, stdout) => {
          // Clean up temp
          unlink(pdfPath).catch(() => {});
          if (error) {
            // Try python -m markitdown as fallback
            exec(
              `python3 -m markitdown "${pdfPath}"`,
              { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
              (err2, out2) => {
                unlink(pdfPath).catch(() => {});
                if (err2) reject(new Error(`markitdown failed: ${error.message}`));
                else resolve(out2);
              }
            );
          } else {
            resolve(stdout);
          }
        }
      );
    });

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "PDF 内容不足，可能为扫描件" }, { status: 400 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "PDF 解析失败" },
      { status: 500 }
    );
  }
}
