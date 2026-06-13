import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请上传 PDF 文件" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 文件" }, { status: 400 });
    }

    // Limit file size to 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件过大，最大支持 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamic import avoids pdf-parse's top-level test-file read during build
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer, { max: 0 });

    const text = (result.text || "").trim();
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: "PDF 无可提取文字，可能为扫描件" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text,
      pages: result.numpages || 1,
    });
  } catch (error: unknown) {
    console.error("PDF extract error:", error);
    return NextResponse.json(
      { error: "PDF 解析失败，请确认文件完整且未加密" },
      { status: 500 }
    );
  }
}
